/*
Copyright (c) 2011-2014 Roger Light <roger@atchoo.org>

All rights reserved. This program and the accompanying materials
are made available under the terms of the Eclipse Public License v1.0
and Eclipse Distribution License v1.0 which accompany this distribution.
 
The Eclipse Public License is available at
   http://www.eclipse.org/legal/epl-v10.html
and the Eclipse Distribution License is available at
  http://www.eclipse.org/org/documents/edl-v10.php.
 
Contributors:
   Roger Light - initial implementation and documentation.
*/

#include <config.h>

#include <stdio.h>
#include <string.h>

#include <mosquitto_broker.h>
#include "mosquitto_plugin.h"
#include <memory_mosq.h>
#include "lib_load.h"

#include <stdio.h>
#include <stdlib.h>
#include <mysql/mysql.h>
#include <json-c/json.h>

typedef int (*FUNC_auth_plugin_version)(void);
typedef int (*FUNC_auth_plugin_init)(void **, struct mosquitto_auth_opt *, int);
typedef int (*FUNC_auth_plugin_cleanup)(void *, struct mosquitto_auth_opt *, int);
typedef int (*FUNC_auth_plugin_security_init)(void *, struct mosquitto_auth_opt *, int, bool);
typedef int (*FUNC_auth_plugin_security_cleanup)(void *, struct mosquitto_auth_opt *, int, bool);
typedef int (*FUNC_auth_plugin_acl_check)(void *, const char *, const char *, const char *, int);
typedef int (*FUNC_auth_plugin_unpwd_check)(void *, const char *, const char *);
typedef int (*FUNC_auth_plugin_psk_key_get)(void *, const char *, const char *, char *, int);

void LIB_ERROR(void)
{
#ifdef WIN32
	char *buf;
	FormatMessage(FORMAT_MESSAGE_ALLOCATE_BUFFER | FORMAT_MESSAGE_FROM_STRING,
				  NULL, GetLastError(), LANG_NEUTRAL, &buf, 0, NULL);
	_mosquitto_log_printf(NULL, MOSQ_LOG_ERR, "Load error: %s", buf);
	LocalFree(buf);
#else
	_mosquitto_log_printf(NULL, MOSQ_LOG_ERR, "Load error: %s", dlerror());
#endif
}

int mosquitto_security_module_init(struct mosquitto_db *db)
{
	void *lib;
	int (*plugin_version)(void) = NULL;
	int version;
	int rc;
	if (db->config->auth_plugin)
	{
		lib = LIB_LOAD(db->config->auth_plugin);
		if (!lib)
		{
			_mosquitto_log_printf(NULL, MOSQ_LOG_ERR,
								  "Error: Unable to load auth plugin \"%s\".", db->config->auth_plugin);
			LIB_ERROR();
			return 1;
		}

		db->auth_plugin.lib = NULL;
		if (!(plugin_version = (FUNC_auth_plugin_version)LIB_SYM(lib, "mosquitto_auth_plugin_version")))
		{
			_mosquitto_log_printf(NULL, MOSQ_LOG_ERR,
								  "Error: Unable to load auth plugin function mosquitto_auth_plugin_version().");
			LIB_ERROR();
			LIB_CLOSE(lib);
			return 1;
		}
		version = plugin_version();
		if (version != MOSQ_AUTH_PLUGIN_VERSION)
		{
			_mosquitto_log_printf(NULL, MOSQ_LOG_ERR,
								  "Error: Incorrect auth plugin version (got %d, expected %d).",
								  version, MOSQ_AUTH_PLUGIN_VERSION);
			LIB_ERROR();

			LIB_CLOSE(lib);
			return 1;
		}
		if (!(db->auth_plugin.plugin_init = (FUNC_auth_plugin_init)LIB_SYM(lib, "mosquitto_auth_plugin_init")))
		{
			_mosquitto_log_printf(NULL, MOSQ_LOG_ERR,
								  "Error: Unable to load auth plugin function mosquitto_auth_plugin_init().");
			LIB_ERROR();
			LIB_CLOSE(lib);
			return 1;
		}
		if (!(db->auth_plugin.plugin_cleanup = (FUNC_auth_plugin_cleanup)LIB_SYM(lib, "mosquitto_auth_plugin_cleanup")))
		{
			_mosquitto_log_printf(NULL, MOSQ_LOG_ERR,
								  "Error: Unable to load auth plugin function mosquitto_auth_plugin_cleanup().");
			LIB_ERROR();
			LIB_CLOSE(lib);
			return 1;
		}

		if (!(db->auth_plugin.security_init = (FUNC_auth_plugin_security_init)LIB_SYM(lib, "mosquitto_auth_security_init")))
		{
			_mosquitto_log_printf(NULL, MOSQ_LOG_ERR,
								  "Error: Unable to load auth plugin function mosquitto_auth_security_init().");
			LIB_ERROR();
			LIB_CLOSE(lib);
			return 1;
		}

		if (!(db->auth_plugin.security_cleanup = (FUNC_auth_plugin_security_cleanup)LIB_SYM(lib, "mosquitto_auth_security_cleanup")))
		{
			_mosquitto_log_printf(NULL, MOSQ_LOG_ERR,
								  "Error: Unable to load auth plugin function mosquitto_auth_security_cleanup().");
			LIB_ERROR();
			LIB_CLOSE(lib);
			return 1;
		}

		if (!(db->auth_plugin.acl_check = (FUNC_auth_plugin_acl_check)LIB_SYM(lib, "mosquitto_auth_acl_check")))
		{
			_mosquitto_log_printf(NULL, MOSQ_LOG_ERR,
								  "Error: Unable to load auth plugin function mosquitto_auth_acl_check().");
			LIB_ERROR();
			LIB_CLOSE(lib);
			return 1;
		}

		if (!(db->auth_plugin.unpwd_check = (FUNC_auth_plugin_unpwd_check)LIB_SYM(lib, "mosquitto_auth_unpwd_check")))
		{
			_mosquitto_log_printf(NULL, MOSQ_LOG_ERR,
								  "Error: Unable to load auth plugin function mosquitto_auth_unpwd_check().");
			LIB_ERROR();
			LIB_CLOSE(lib);
			return 1;
		}

		if (!(db->auth_plugin.psk_key_get = (FUNC_auth_plugin_psk_key_get)LIB_SYM(lib, "mosquitto_auth_psk_key_get")))
		{
			_mosquitto_log_printf(NULL, MOSQ_LOG_ERR,
								  "Error: Unable to load auth plugin function mosquitto_auth_psk_key_get().");
			LIB_ERROR();
			LIB_CLOSE(lib);
			return 1;
		}

		db->auth_plugin.lib = lib;
		db->auth_plugin.user_data = NULL;
		if (db->auth_plugin.plugin_init)
		{
			rc = db->auth_plugin.plugin_init(&db->auth_plugin.user_data, db->config->auth_options, db->config->auth_option_count);
			if (rc)
			{
				_mosquitto_log_printf(NULL, MOSQ_LOG_ERR,
									  "Error: Authentication plugin returned %d when initialising.", rc);
			}
			return rc;
		}
	}
	else
	{
		db->auth_plugin.lib = NULL;
		db->auth_plugin.plugin_init = NULL;
		db->auth_plugin.plugin_cleanup = NULL;
		db->auth_plugin.security_init = NULL;
		db->auth_plugin.security_cleanup = NULL;
		db->auth_plugin.acl_check = NULL;
		db->auth_plugin.unpwd_check = NULL;
		db->auth_plugin.psk_key_get = NULL;
	}

	return MOSQ_ERR_SUCCESS;
}

int mosquitto_security_module_cleanup(struct mosquitto_db *db)
{
	mosquitto_security_cleanup(db, false);

	if (db->auth_plugin.plugin_cleanup)
	{
		db->auth_plugin.plugin_cleanup(db->auth_plugin.user_data, db->config->auth_options, db->config->auth_option_count);
	}

	if (db->config->auth_plugin)
	{
		if (db->auth_plugin.lib)
		{
			LIB_CLOSE(db->auth_plugin.lib);
		}
	}
	db->auth_plugin.lib = NULL;
	db->auth_plugin.plugin_init = NULL;
	db->auth_plugin.plugin_cleanup = NULL;
	db->auth_plugin.security_init = NULL;
	db->auth_plugin.security_cleanup = NULL;
	db->auth_plugin.acl_check = NULL;
	db->auth_plugin.unpwd_check = NULL;
	db->auth_plugin.psk_key_get = NULL;

	return MOSQ_ERR_SUCCESS;
}

int mosquitto_security_init(struct mosquitto_db *db, bool reload)
{
	if (!db->auth_plugin.lib)
	{
		return mosquitto_security_init_default(db, reload);
	}
	else
	{
		return db->auth_plugin.security_init(db->auth_plugin.user_data, db->config->auth_options, db->config->auth_option_count, reload);
	}
}

/* Apply security settings after a reload.
 * Includes:
 * - Disconnecting anonymous users if appropriate
 * - Disconnecting users with invalid passwords
 * - Reapplying ACLs
 */
int mosquitto_security_apply(struct mosquitto_db *db)
{
	if (!db->auth_plugin.lib)
	{
		return mosquitto_security_apply_default(db);
	}
	return MOSQ_ERR_SUCCESS;
}

int mosquitto_security_cleanup(struct mosquitto_db *db, bool reload)
{
	if (!db->auth_plugin.lib)
	{
		return mosquitto_security_cleanup_default(db, reload);
	}
	else
	{
		return db->auth_plugin.security_cleanup(db->auth_plugin.user_data, db->config->auth_options, db->config->auth_option_count, reload);
	}
}

char *get_info(char *username, const char *topic)
{
	static char *opt_host_name = "localhost";
	static char *opt_user_name = "root";
	static char *opt_password = "Fcs.nj,12=dw1802";
	static unsigned int opt_port_num = 8806;
	static char *opt_socket_name = NULL;
	static char *opt_db_name = "test";
	static unsigned int opt_flags = 0;
	static MYSQL *conn;

	if (mysql_library_init(0, NULL, NULL))
	{
		fprintf(stderr, "mysql_library_init() failed\n");
		exit(1);
	}
	/* initialize connection handler */
	conn = mysql_init(NULL);
	if (conn == NULL)
	{
		fprintf(stderr, "mysql_init() failed (probably out of memory)\n");
	} /* connect to server */
	if (mysql_real_connect(conn, opt_host_name, opt_user_name, opt_password, opt_db_name, opt_port_num, opt_socket_name, opt_flags) == NULL)
	{
		fprintf(stderr, "mysql_real_connect() failed\n");
		mysql_close(conn);
	}

	int num = 53 + (int)strlen(username) + (int)strlen(topic);
	char *sel = malloc(num);
	strcpy(sel, "SELECT info FROM acls  WHERE username='");
	strcat(sel, username);
	strcat(sel, "' AND topic='");
	strcat(sel, topic);
	strcat(sel, "'");

	if (mysql_query(conn, sel) != 0)
	{
		fprintf(stderr, "Query Failure\n");
		mysql_close(conn);
	}

	MYSQL_RES *result = mysql_store_result(conn);
	if (result)
	{
		MYSQL_ROW row = mysql_fetch_row(result);
		return row[0];
	}
	return ":(";
	mysql_close(conn);
}

bool reset_acl(char *username, const char *topic)
{
	static char *opt_host_name = "localhost";
	static char *opt_user_name = "root";
	static char *opt_password = "Fcs.nj,12=dw1802";
	static unsigned int opt_port_num = 8806;
	static char *opt_socket_name = NULL;
	static char *opt_db_name = "test";
	static unsigned int opt_flags = 0;
	static MYSQL *conn;

	if (mysql_library_init(0, NULL, NULL))
	{
		fprintf(stderr, "mysql_library_init() failed\n");
		exit(1);
	}
	/* initialize connection handler */
	conn = mysql_init(NULL);
	if (conn == NULL)
	{
		fprintf(stderr, "mysql_init() failed (probably out of memory)\n");
	} /* connect to server */
	if (mysql_real_connect(conn, opt_host_name, opt_user_name, opt_password, opt_db_name, opt_port_num, opt_socket_name, opt_flags) == NULL)
	{
		fprintf(stderr, "mysql_real_connect() failed\n");
		mysql_close(conn);
	}

	int num = 52 + (int)strlen(username) + (int)strlen(topic);
	char *sel = malloc(num);
	strcpy(sel, " UPDATE acls SET rw=0 WHERE username='");
	strcat(sel, username);
	strcat(sel, "' AND topic='");
	strcat(sel, topic);
	strcat(sel, "'");

	if (mysql_query(conn, sel) != 0)
	{
		fprintf(stderr, "Query Failure\n");
		mysql_close(conn);
		return false;
	}

	num = 85 + (int)strlen(username) + (int)strlen(topic);
	char *qu=malloc(num);
	strcpy(qu,"UPDATE acls SET info = JSON_SET(info,'$.msgSent','0') WHERE username='");
	strcat(qu, username);
	strcat(qu, "' AND topic='");
	strcat(qu, topic);
	strcat(qu, "'");

	if (mysql_query(conn,qu)!=0)
	{
		fprintf(stderr, "Query Failure\n");
		mysql_close(conn);
		return false;
	}

	mysql_close(conn);
	return true;

}

bool grant_access(char *username, const char *topic)
{

	static char *opt_host_name = "localhost";
	static char *opt_user_name = "root";
	static char *opt_password = "Fcs.nj,12=dw1802";
	static unsigned int opt_port_num = 8806;
	static char *opt_socket_name = NULL;
	static char *opt_db_name = "test";
	static unsigned int opt_flags = 0;
	static MYSQL *conn;

	if (mysql_library_init(0, NULL, NULL))
	{
		fprintf(stderr, "mysql_library_init() failed\n");
		exit(1);
	}
	/* initialize connection handler */
	conn = mysql_init(NULL);
	if (conn == NULL)
	{
		fprintf(stderr, "mysql_init() failed (probably out of memory)\n");
	} /* connect to server */
	if (mysql_real_connect(conn, opt_host_name, opt_user_name, opt_password, opt_db_name, opt_port_num, opt_socket_name, opt_flags) == NULL)
	{
		fprintf(stderr, "mysql_real_connect() failed\n");
		mysql_close(conn);
	}

	int num = 52 + (int)strlen(username) + (int)strlen(topic);
	char *sel = malloc(num);
	strcpy(sel, " UPDATE acls SET rw=1 WHERE username='");
	strcat(sel, username);
	strcat(sel, "' AND topic='");
	strcat(sel, topic);
	strcat(sel, "'");

	if (mysql_query(conn, sel) != 0)
	{
		fprintf(stderr, "Query Failure\n");
		mysql_close(conn);
		return false;
	}

	mysql_close(conn);
	return true;
}

bool increment_msg(char *username, const char *topic, int m)
{

	static char *opt_host_name = "localhost";
	static char *opt_user_name = "root";
	static char *opt_password = "Fcs.nj,12=dw1802";
	static unsigned int opt_port_num = 8806;
	static char *opt_socket_name = NULL;
	static char *opt_db_name = "test";
	static unsigned int opt_flags = 0;
	static MYSQL *conn;

	if (mysql_library_init(0, NULL, NULL))
	{
		fprintf(stderr, "mysql_library_init() failed\n");
		exit(1);
	}
	/* initialize connection handler */
	conn = mysql_init(NULL);
	if (conn == NULL)
	{
		fprintf(stderr, "mysql_init() failed (probably out of memory)\n");
	} /* connect to server */
	if (mysql_real_connect(conn, opt_host_name, opt_user_name, opt_password, opt_db_name, opt_port_num, opt_socket_name, opt_flags) == NULL)
	{
		fprintf(stderr, "mysql_real_connect() failed\n");
		mysql_close(conn);
	}

	int num = 88+(int)strlen(username) + (int)strlen(topic);
	char *qu=malloc(num);
	char buff[3];
	sprintf(buff,"%d",m);
	const char* p=buff;
	strcpy(qu,"UPDATE acls SET info = JSON_SET(info,'$.msgSent','");
	strcat(qu, p);
	strcat(qu,"') WHERE username='");
	strcat(qu, username);
	strcat(qu, "' AND topic='");
	strcat(qu, topic);
	strcat(qu, "'");

	printf("This is the query: %s\n",qu);
	if (mysql_query(conn,qu)!=0)
	{
		fprintf(stderr, "Query Failure\n");
		mysql_close(conn);
		return false;
	}

	mysql_close(conn);
	return true;
}

int mosquitto_acl_check(struct mosquitto_db *db, struct mosquitto *context, const char *topic, int access)
{
	char *username;

	struct json_object *parsed_json, *m_json, *k_json;
	int m, k;

	parsed_json = json_tokener_parse(get_info(context->username, topic));
	json_object_object_get_ex(parsed_json, "msgSent", &m_json);
	json_object_object_get_ex(parsed_json, "k", &k_json);

	printf("Get info m %s\n", json_object_get_string(m_json));
	printf("Get info k %s\n", json_object_get_string(k_json));

	m = atoi(json_object_get_string(m_json));
	k = atoi(json_object_get_string(k_json));

	if (m == k)
	{
		reset_acl(context->username, topic);
	}
	else
	{
		if (m == 0)
		{

			//Check the wallet
			double r = ((double)rand() / (RAND_MAX));
			if (r > 0.5)
			{
				printf("There is money, I'll grant the access\n");
				grant_access(context->username, topic);
				increment_msg(context->username, topic,m+1);
			}
			else
			{
				printf("There is no money, do nothing");
			}
			
		}
		else
		{
			increment_msg(context->username, topic,m+1);
		}
	}

	if (!context->id)
	{
		return MOSQ_ERR_ACL_DENIED;
	}
	if (!db->auth_plugin.lib)
	{
		return mosquitto_acl_check_default(db, context, topic, access);
	}
	else
	{
#ifdef WITH_BRIDGE
		if (context->bridge)
		{
			username = context->bridge->local_username;
		}
		else
#endif
		{
			username = context->username;
		}

		/* Check whether the client id or username contains a +, # or / and if
		 * so deny access.
		 *
		 * Do this check for every message regardless, we have to protect the
		 * plugins against possible pattern based attacks.
		 */
		if (username && strpbrk(username, "+#/"))
		{
			_mosquitto_log_printf(NULL, MOSQ_LOG_NOTICE, "ACL denying access to client with dangerous username \"%s\"", username);
			return MOSQ_ERR_ACL_DENIED;
		}
		if (context->id && strpbrk(context->id, "+#/"))
		{
			_mosquitto_log_printf(NULL, MOSQ_LOG_NOTICE, "ACL denying access to client with dangerous client id \"%s\"", context->id);
			return MOSQ_ERR_ACL_DENIED;
		}
		return db->auth_plugin.acl_check(db->auth_plugin.user_data, context->id, username, topic, access);
	}
}

bool mosquitto_add_user(const char *username, const char *password)
{
	static char *opt_host_name = "localhost";
	static char *opt_user_name = "root";
	static char *opt_password = "Fcs.nj,12=dw1802";
	static unsigned int opt_port_num = 8806;
	static char *opt_socket_name = NULL;
	static char *opt_db_name = "test";
	static unsigned int opt_flags = 0;
	static MYSQL *conn;

	if (mysql_library_init(0, NULL, NULL))
	{
		fprintf(stderr, "mysql_library_init() failed\n");
		exit(1);
	}
	/* initialize connection handler */
	conn = mysql_init(NULL);
	if (conn == NULL)
	{
		fprintf(stderr, "mysql_init() failed (probably out of memory)\n");
		return false;
	} /* connect to server */
	if (mysql_real_connect(conn, opt_host_name, opt_user_name, opt_password, opt_db_name, opt_port_num, opt_socket_name, opt_flags) == NULL)
	{
		fprintf(stderr, "mysql_real_connect() failed\n");
		mysql_close(conn);
		return false;
	}
	printf("Checking records .. \n");
	int num = 52 + (int)strlen(username);
	char *sel = malloc(num);
	strcpy(sel, "SELECT COUNT(username) FROM users WHERE username='");
	strcat(sel, username);
	strcat(sel, "'");

	if (mysql_query(conn, sel) != 0)
	{
		fprintf(stderr, "Query Failure\n");
		mysql_close(conn);
		return false;
	}

	MYSQL_RES *result = mysql_store_result(conn);
	if (result)
	{
		MYSQL_ROW row = mysql_fetch_row(result);
		if (row)
		{
			if (atoi(row[0]) == 1)
			{
				printf("The user exists\n");
			}
			else
			{
				printf("Inserting records .. \n");

				num = 55 + (int)strlen(username) + (int)strlen(password);
				char *str = malloc(num);
				strcpy(str, "INSERT INTO users (username,pw,super) VALUES ('");
				strcat(str, username);
				strcat(str, "','");
				strcat(str, password);
				strcat(str, "',0)");

				printf("This is the query: %s\n", str);
				//printf("Num: %d\n",num);

				if (mysql_query(conn, str) != 0)
				{
					fprintf(stderr, "Query Failure\n");
					mysql_close(conn);
					return false;
				}
			}
		}
	}
	/* disconnect from server, terminate client library */
	mysql_close(conn);
	mysql_library_end();

	return true;
}

int mosquitto_unpwd_check(struct mosquitto_db *db, const char *username, const char *password)
{

	printf("\nThe user username is: %s\n", username);
	if (mosquitto_add_user(username, password))
	{
		if (!db->auth_plugin.lib)
		{
			return mosquitto_unpwd_check_default(db, username, password);
		}
		else
		{
			return db->auth_plugin.unpwd_check(db->auth_plugin.user_data, username, password);
		}
	}
	else
	{
		printf("\nThere was a problem adding the new client");
		return 0;
	}
}

int mosquitto_psk_key_get(struct mosquitto_db *db, const char *hint, const char *identity, char *key, int max_key_len)
{
	if (!db->auth_plugin.lib)
	{
		return mosquitto_psk_key_get_default(db, hint, identity, key, max_key_len);
	}
	else
	{
		return db->auth_plugin.psk_key_get(db->auth_plugin.user_data, hint, identity, key, max_key_len);
	}
}
