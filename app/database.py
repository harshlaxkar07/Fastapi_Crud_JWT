import pymysql

from config import settings

class DatabaseConnectionError(Exception):
    """Raised when a database connection cannot be established."""
    pass

from dataclasses import dataclass

@dataclass
class DatabaseConnection:
    connection: pymysql.Connection
    cursor: pymysql.cursors.DictCursor


def get_connection():
    try:
        connection = pymysql.connect(
            host=settings.db_host,
            port=settings.db_port,
            user=settings.db_user,
            password=settings.db_password,
            database=settings.db_name,
            cursorclass=pymysql.cursors.DictCursor,
            charset="utf8mb4",
            autocommit=False,
        )
        
        connection.ping(reconnect=True)
        db = DatabaseConnection(
            connection=connection,
            cursor=connection.cursor()
        )

        yield db
    except pymysql.MySQLError as e:
            raise DatabaseConnectionError(
            "Unable to connect to the database."
        ) from e
    finally:
        db.cursor.close()
        db.connection.close()



if __name__ == "__main__":
    db = None
    try:
        db = get_connection()
        print("Database Connected Successfully")

    except DatabaseConnectionError as e:
    
        print("Database Connection Failed")
        print(e)

    finally:

        if db is not None:
            db.connection.close()
            db.cursor.close()