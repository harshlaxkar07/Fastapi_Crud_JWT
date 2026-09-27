from pathlib import Path

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

from database import get_connection

from auth import get_current_user

from crud import (
    create_user,
    update_user,
    get_user_by_user_id,
    get_all_users,
    delete_user,
    delete_all_users,
    login,
    update_password,
)

from schemas import (
    CreateUser,
    UpdateUser,
    UserLogin,
    UpdatePassword,
    Token,
)

BASE_DIR = Path(__file__).resolve().parent.parent

FRONTEND_DIR = BASE_DIR / "frontend"


app = FastAPI(
    title="FastAPI User CRUD API",
    description=(
        "User accounts with bcrypt password hashing and JWT access tokens. "
        "The identity console is served at /ui."
    ),
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


if FRONTEND_DIR.is_dir():

    app.mount(
        "/ui",
        StaticFiles(directory=FRONTEND_DIR, html=True),
        name="ui",
    )

    @app.get("/", include_in_schema=False)
    def console():
        """
        Send the application root to the identity console.
        """

        return RedirectResponse(url="/ui/")



@app.post("/signup")
def signup(user: CreateUser):

    db = get_connection()

    
    try:
        result = create_user(db.cursor, user)
        db.connection.commit()
        return result

    except HTTPException:
        db.connection.rollback()
        raise

    except Exception as e:
        db.connection.rollback()
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:
        db.cursor.close()
        db.connection.close()



@app.post("/login", response_model=Token)
def user_login(user: UserLogin):

    db = get_connection()


    try:
        return login(db.cursor, user)

    finally:
        db.cursor.close()
        db.connection.close()



@app.post("/logout")
def logout(current_user=Depends(get_current_user)):
    return {
        "message": "Logout Successful. Delete the JWT token from the client."
    }



@app.post("/password")
def change_password(
    user: UpdatePassword,
    current_user=Depends(get_current_user)
):

    db = get_connection()


    try:

        result = update_password(
            db.cursor,
            current_user["sub"],
            user
        )

        db.connection.commit()

        return result

    except HTTPException:
        db.connection.rollback()
        raise

    except Exception as e:
        db.connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:
        db.cursor.close()
        db.connection.close()


@app.get("/users/{user_id}")
def get_user(
    user_id: int,
    current_user=Depends(get_current_user)
):

    db = get_connection()


    try:

        user = get_user_by_user_id(
            db.cursor,
            user_id
        )

        if not user:
            raise HTTPException(
                status_code=404,
                detail="User Not Found"
            )

        return user

    finally:
        db.cursor.close()
        db.connection.close()



@app.get("/users")
def users(current_user=Depends(get_current_user)):

    db = get_connection()


    try:
        return get_all_users(db.cursor)

    finally:
        db.cursor.close()
        db.connection.close()



@app.post("/users/{user_id}")
def update(
    user_id: int,
    user: UpdateUser,
    current_user=Depends(get_current_user)
):

    db = get_connection()


    try:

        result = update_user(
            db.cursor,
            user_id,
            user
        )

        db.connection.commit()

        return result

    except HTTPException:
        db.connection.rollback()
        raise

    except Exception as e:
        db.connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:
        db.cursor.close()
        db.connection.close()



@app.delete("/users/{user_id}")
def remove_user(
    user_id: int,
    current_user=Depends(get_current_user)
):

    db = get_connection()


    try:

        result = delete_user(
            db.cursor,
            user_id
        )

        db.connection.commit()

        return result

    except HTTPException:
        db.connection.rollback()
        raise

    except Exception as e:
        db.connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:
        db.cursor.close()
        db.connection.close()



@app.delete("/users")
def remove_all_users(
    current_user=Depends(get_current_user)
):

    db = get_connection()


    try:

        result = delete_all_users(db.cursor)

        db.connection.commit()

        return result

    except HTTPException:
        db.connection.rollback()
        raise

    except Exception as e:
        db.connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:
        db.cursor.close()
        db.connection.close()