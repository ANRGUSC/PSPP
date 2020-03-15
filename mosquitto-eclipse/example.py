import paho.mqtt.client as mqtt

#Delete multiple rows
    import mysql.connector
    from mysql.connector import Error
    from mysql.connector import errorcode
    try:
        conn = mysql.connector.connect(host='localhost',
                                       database='python_db',
                                       user='pynative',
                                       password='pynative@#29')
        cursor = conn.cursor(prepared=True)
        # Delete record now
        sql_Delete_query = """Delete from mobile where id = %s"""
        records_to_be_deleted = [(1,),(2,)]
        cursor.executemany(sql_Delete_query,records_to_be_deleted)
        conn.commit()
        print("\n ", cursor.rowcount, "Record Deleted successfully ")
    except mysql.connector.Error as error:
        print("Failed to Delete records from database table: {}".format(error))
    finally:
        # closing database connection.
        if (conn.is_connected()):
            cursor.close()
            conn.close()
            print("MySQL connection is closed")

#Insert multiple rows

from mysql.connector import MySQLConnection, Error
from python_mysql_dbconfig import read_db_config
from passlib.hash import pbkdf2_sha256
 
def insert_user(username, pw, topic, rw):

	pw_hash = pbkdf2_sha256.encrypt(pw);
    query = "INSERT INTO users(username, pw) " \
            "VALUES(%s,%s)"
    args = (username, pw)
 
    try:
        db_config = read_db_config()
        conn = MySQLConnection(**db_config)
 
        cursor = conn.cursor()
        cursor.execute(query, args)
 
        if cursor.lastrowid:
            print('last insert id', cursor.lastrowid)
        else:
            print('last insert id not found')
 
        conn.commit()
    except Error as error:
        print(error)
 
    finally:
        cursor.close()
        conn.close()


# The callback for when the client receives a CONNACK response from the server.
def on_connect(client, userdata, flags, rc):
    print("Connected with result code "+str(rc))

    # Subscribing in on_connect() means that if we lose the connection and
    # reconnect then subscriptions will be renewed.
    client.subscribe("$SYS/#")

# The callback for when a PUBLISH message is received from the server.
def on_message(client, userdata, msg):
    print(msg.topic+" "+str(msg.payload))

client = mqtt.Client()
client.on_connect = on_connect
client.on_message = on_message

client.connect("127.0.0.1", 1883, 60)

# Blocking call that processes network traffic, dispatches callbacks and
# handles reconnecting.
# Other loop*() functions are available that give a threaded interface and a
# manual interface.
client.loop_forever()