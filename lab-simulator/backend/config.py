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
    
    # Configuración SMTP para envío de correos
    # Configuración para Gmail (ejemplo):
    # SMTP_HOST=smtp.gmail.com
    # SMTP_PORT=587
    # SMTP_USERNAME=tu_correo@gmail.com
    # SMTP_PASSWORD=tu_contraseña_o_app_password
    # SMTP_USE_TLS=false (usa STARTTLS en su lugar)
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USERNAME: str = os.getenv("SMTP_USERNAME", "pruebaingenieria8@gmail.com")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "obosgkjoooxazkru")
    SMTP_USE_TLS: bool = os.getenv("SMTP_USE_TLS", "false").lower() == "true"
    FROM_EMAIL: str = os.getenv("FROM_EMAIL", "noreply@simulatoral.edu")
    FROM_NAME: str = os.getenv("FROM_NAME", "Simulador de Química")


settings = Settings()
