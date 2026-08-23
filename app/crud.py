from fastapi import HTTPException, status

from auth import (
    hash_password,
    verify_password,
    create_access_token,
)

from schemas import (
    CreateUser,
    UpdateUser,
    UserLogin,
    UpdatePassword,
)


def get_user_by_user_id(cursor, user_id: int):

    cursor.execute(
        """
        SELECT
            user_id,
            username,
            fullname,
            email,
            phone_number
        FROM users
        WHERE user_id=%s
        """,
        (user_id,)
    )

    return cursor.fetchone()


def get_user_by_username(cursor, username: str):

    cursor.execute(
        """
        SELECT
            user_id,
            username,
            fullname,
            email,
            phone_number,
            password
        FROM users
        WHERE username=%s
        """,
        (username,)
    )

    return cursor.fetchone()



def username_exists(cursor, username: str):

    cursor.execute(
        "SELECT user_id FROM users WHERE username=%s",
        (username,)
    )

    return cursor.fetchone() is not None


def email_exists(cursor, email: str):

    cursor.execute(
        "SELECT user_id FROM users WHERE email=%s",
        (email,)
    )

    return cursor.fetchone() is not None


def phone_number_exists(cursor, phone_number: str):

    cursor.execute(
        "SELECT user_id FROM users WHERE phone_number=%s",
        (phone_number,)
    )

    return cursor.fetchone() is not None



def get_all_users(cursor):

    cursor.execute(
        """
        SELECT
            user_id,
            username,
            fullname,
            email,
            phone_number
        FROM users
        """
    )

    return cursor.fetchall()



def create_user(cursor, user: CreateUser):

    if username_exists(cursor, user.username):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already exists."
        )

    if email_exists(cursor, user.email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already exists."
        )

    if phone_number_exists(cursor, user.phone_number):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Phone number already exists."
        )

    cursor.execute(
        """
        INSERT INTO users
        (
            username,
            fullname,
            email,
            phone_number,
            password
        )
        VALUES (%s,%s,%s,%s,%s)
        """,
        (
            user.username,
            user.fullname,
            user.email,
            user.phone_number,
            hash_password(user.password),
        ),
    )

    return {
        "message": "User created successfully.",
        "user_id": cursor.lastrowid,
    }



def update_user(cursor, user_id: int, user: UpdateUser):

    existing_user = get_user_by_user_id(cursor, user_id)

    if not existing_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )

    if (
        user.username != existing_user["username"]
        and username_exists(cursor, user.username)
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already exists."
        )

    if (
        user.email != existing_user["email"]
        and email_exists(cursor, user.email)
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already exists."
        )

    if (
        user.phone_number != existing_user["phone_number"]
        and phone_number_exists(cursor, user.phone_number)
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Phone number already exists."
        )

    cursor.execute(
        """
        UPDATE users
        SET
            username=%s,
            fullname=%s,
            email=%s,
            phone_number=%s
        WHERE user_id=%s
        """,
        (
            user.username,
            user.fullname,
            user.email,
            user.phone_number,
            user_id,
        ),
    )

    return {
        "message": "User updated successfully.",
        "user_id": user_id,
    }



def delete_user(cursor, user_id: int):

    cursor.execute(
        "DELETE FROM users WHERE user_id=%s",
        (user_id,),
    )

    if cursor.rowcount == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )

    return {
        "message": "User deleted successfully."
    }



def delete_all_users(cursor):

    cursor.execute("DELETE FROM users")

    return {
        "message": "All users deleted successfully.",
        "deleted_users": cursor.rowcount,
    }



def login(cursor, user: UserLogin):

    existing_user = get_user_by_username(
        cursor,
        user.username,
    )

    if not existing_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Username not found."
        )

    if not verify_password(
        user.password,
        existing_user["password"],
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password."
        )

    token = create_access_token(
        {
            "sub": existing_user["username"],
            "user_id": existing_user["user_id"],
        }
    )

    return {
        "access_token": token,
        "token_type": "bearer",
    }



def update_password(
    cursor,
    username: str,
    user: UpdatePassword,
):

    existing_user = get_user_by_username(
        cursor,
        username,
    )

    if not existing_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )

    if not verify_password(
        user.password,
        existing_user["password"],
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect."
        )

    cursor.execute(
        """
        UPDATE users
        SET password=%s
        WHERE username=%s
        """,
        (
            hash_password(user.new_password),
            username,
        ),
    )

    return {
        "message": "Password updated successfully."
    }