import mysql.connector
from mysql.connector import Error
from passlib.hash import pbkdf2_sha256

def insert_user(username, pw):

    query = "INSERT INTO users(username, pw) VALUES(%s,%s)"
    args = (username, pw)
    
    try:
        conn = mysql.connector.connect(host='localhost',
         database='test',
         user='root',
         password='Fcs.nj,12=dw1802', 
         autocommit=True)

        cursor = conn.cursor()
        cursor.execute(query, args)

        if cursor.lastrowid:
            print('last insert id', cursor.lastrowid)
        else:
            print('last insert id not found')

            conn.commit()
            print ("The record was succesfully added")

    except Error as error:
            print(error)

    finally:
            cursor.close()
            conn.close()

def insert_acls(username, topic, rw):

    query = "INSERT INTO acls(username, topic, rw) VALUES(%s,%s,%s)"
    args = (username, topic, rw)
    
    try:
        conn = mysql.connector.connect(host='localhost',
         database='test',
         user='root',
         password='Fcs.nj,12=dw1802', 
         autocommit=True)

        cursor = conn.cursor()
        cursor.execute(query, args)

        if cursor.lastrowid:
            print('last insert id', cursor.lastrowid)
        else:
            print('last insert id not found')

            conn.commit()
            print ("The record was succesfully added")

    except Error as error:
            print(error)

    finally:
            cursor.close()
            conn.close()

def select_data(table):

    try:
        conn = mysql.connector.connect(host='localhost',
         database='test',
         user='root',
         password='Fcs.nj,12=dw1802', 
         autocommit=True)

        cursor = conn.cursor()

        query="SELECT * from "+table
        cursor.execute(query)

        records = cursor.fetchall()

        print("Total number of rows is",cursor.rowcount)

        if table=='users':
            for row in records:
                print("ID ",row[0], )
                print("user ",row[1])
                print("pw ",row[2])
                print("super ",row[3])
            cursor.close()
        else:
            for row in records:
                print("ID ",row[0], )
                print("user ",row[1])
                print("topic ",row[2])
                print("rw ",row[3])
            cursor.close()
    except Error as error:
            print(error)

    finally:
            conn.close()

def main():
    pw_hash = pbkdf2_sha256.encrypt('9781439187036')
    insert_user('jsnow',pw_hash)
    select_data('users')
    insert_acls ('jsnow','loc/ro','1')
    select_data('acls')
  

if __name__ == '__main__':
    main()