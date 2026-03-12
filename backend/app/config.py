from pydantic_settings import BaseSettings
from typing import List
import os

# Always resolve .env relative to THIS file's directory (backend/app/../.env)
_ENV_FILE = os.path.join(os.path.dirname(__file__), "..", ".env")


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://user:password@localhost/tquiz"
    ADMIN_PASSWORD: str = "admin@tq2026"
    FRONTEND_URL: str = "http://localhost:5173"
    CORS_ORIGINS: str = "http://localhost:5173"
    SECRET_KEY: str = "tq2026-secret-key"

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    class Config:
        env_file = _ENV_FILE


settings = Settings()
