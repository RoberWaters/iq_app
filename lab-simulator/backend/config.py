import os 
import secrets 
from typing import Optional
from dataclasses import dataclass, field
from typing import List


@dataclass
class Settings:
    APP_NAME: str = "Chemistry Lab Simulator"
    DEBUG: bool = True
     # Seguridad JWT
    # En producción, debe establecerse mediante variable de entorno
    SECRET_KEY: str = os.getenv(
        "SECRET_KEY",
        "dev-secret-key-change-in-production-" + secrets.token_urlsafe(32)
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_DAYS: int = 7
    # Configuración de contraseñas
    MIN_PASSWORD_LENGTH: int = 6
    PASSWORD_REQUIRE_NUMBER: bool = True
    PASSWORD_REQUIRE_LETTER: bool = True
    DATABASE_URL: str = "sqlite+aiosqlite:///./lab_simulator.db"
    CORS_ORIGINS: List[str] = field(default_factory=lambda: [
        "http://localhost:5173",
        "http://localhost:3000",
    ])


settings = Settings()
