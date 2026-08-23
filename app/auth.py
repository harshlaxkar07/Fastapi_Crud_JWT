from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from jose import JWTError, jwt
from passlib.context import CryptContext

from config import settings




pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/login"
)

def hash_password(password: str) -> str:
    return pwd_context.hash(password)




def verify_password(
    plain_password: str,
    hashed_password: str
) -> bool:

    return pwd_context.verify(
        plain_password,
        hashed_password
    )



def create_access_token(data: dict) -> str:

    payload = data.copy()

    expire = datetime.now(
        timezone.utc
    ) + timedelta(
        minutes=settings.access_token_expire_minutes
    )

    payload.update(
        {
            "exp": expire
        }
    )

    token = jwt.encode(
        payload,
        settings.secret_key,
        algorithm=settings.algorithm
    )

    return token




def verify_access_token(token: str):

    try:

        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.algorithm]
        )

        return payload

    except JWTError:
        return None




def get_current_user(
    token: str = Depends(oauth2_scheme)
):

    payload = verify_access_token(token)
    if payload is None:

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or Expired Token",
            headers={
                "WWW-Authenticate": "Bearer"
            },
        )

    return payload