from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # MySQL
    mysql_host: str = "localhost"
    mysql_port: int = 3306
    mysql_user: str = "root"
    mysql_password: str = ""
    mysql_db: str = "fmcg_software"

    # JWT
    secret_key: str = "fmcg-software-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 480

    # CORS
    frontend_url: str = "http://localhost:3000"

    # SMTP (optional — leave blank to use console/dev mode)
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_tls: bool = True

    # OTP
    otp_expire_minutes: int = 10

    @property
    def async_db_url(self) -> str:
        from urllib.parse import quote_plus
        user = quote_plus(self.mysql_user)
        pwd = quote_plus(self.mysql_password)
        return (
            f"mysql+aiomysql://{user}:{pwd}"
            f"@{self.mysql_host}:{self.mysql_port}/{self.mysql_db}"
            f"?charset=utf8mb4"
        )

    @property
    def sync_db_url(self) -> str:
        from urllib.parse import quote_plus
        user = quote_plus(self.mysql_user)
        pwd = quote_plus(self.mysql_password)
        return (
            f"mysql+pymysql://{user}:{pwd}"
            f"@{self.mysql_host}:{self.mysql_port}/{self.mysql_db}"
            f"?charset=utf8mb4"
        )

    class Config:
        env_file = ".env"

@lru_cache()
def get_settings():
    return Settings()
