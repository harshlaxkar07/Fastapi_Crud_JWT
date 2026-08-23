from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):


    db_host: str
    db_port: int = Field(
        default=3306,
        ge=1,
        le=65535
    )

    db_user: str
    db_password: str
    db_name: str


    secret_key: str

    algorithm: str = "HS256"

    access_token_expire_minutes: int = Field(
        default=30,
        gt=0
    )


    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()