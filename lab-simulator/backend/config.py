from dataclasses import dataclass, field
from typing import List


@dataclass
class Settings:
    APP_NAME: str = "Chemistry Lab Simulator"
    DEBUG: bool = True
    DATABASE_URL: str = "sqlite+aiosqlite:///./lab_simulator.db"
    CORS_ORIGINS: List[str] = field(default_factory=lambda: [
        "http://localhost:5173",
        "http://localhost:3000",
    ])


settings = Settings()
