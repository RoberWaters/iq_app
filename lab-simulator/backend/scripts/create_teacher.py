#!/usr/bin/env python3
"""
Script CLI interactivo para crear el primer docente manualmente.
Ejecutar con: python -m backend.scripts.create_teacher
"""

import asyncio
import sys
from pathlib import Path

# Agregar el directorio padre al path para importar backend
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from models.user import Base
from schemas.auth import TeacherCreate
from services.auth_service import AuthService

# Database URL (mismo que en config.py)
DATABASE_URL = "sqlite+aiosqlite:///./lab_simulator.db"


async def create_tables():
    """Crea las tablas si no existen."""
    engine = create_async_engine(DATABASE_URL, echo=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await engine.dispose()
    print("✓ Tablas creadas/verificadas exitosamente")


async def get_db_session():
    """Crea una sesión de base de datos."""
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    return async_session(), engine


def get_input(prompt: str, required: bool = True) -> str:
    """Obtiene input del usuario con validación."""
    while True:
        value = input(prompt).strip()
        if value:
            return value
        if not required:
            return ""
        print("Este campo es obligatorio. Por favor ingrese un valor.")


def get_optional_input(prompt: str) -> str:
    """Obtiene input opcional del usuario."""
    value = input(prompt).strip()
    return value if value else None


def get_password_input(prompt: str) -> str:
    """Obtiene una contraseña válida del usuario."""
    while True:
        import getpass
        password = getpass.getpass(prompt)
        if len(password) < 6:
            print("La contraseña debe tener al menos 6 caracteres.")
            continue
        
        # Verificar que tenga al menos una letra y un número
        has_letter = any(c.isalpha() for c in password)
        has_number = any(c.isdigit() for c in password)
        
        if not has_letter:
            print("La contraseña debe contener al menos una letra.")
            continue
        if not has_number:
            print("La contraseña debe contener al menos un número.")
            continue
        
        # Confirmar contraseña
        confirm = getpass.getpass("Confirme la contraseña: ")
        if password != confirm:
            print("Las contraseñas no coinciden. Intente nuevamente.")
            continue
        
        return password


async def main():
    """Función principal del script."""
    print("=" * 60)
    print("  SISTEMA DE SIMULADOR DE LABORATORIO - CREAR DOCENTE")
    print("=" * 60)
    print()
    
    # Crear tablas
    print("Inicializando base de datos...")
    await create_tables()
    print()
    
    # Obtener datos del docente
    print("Ingrese los datos del docente:")
    print("-" * 40)
    
    first_name = get_input("Primer nombre: ")
    second_name = get_optional_input("Segundo nombre (opcional): ") or None
    first_surname = get_input("Primer apellido: ")
    second_surname = get_optional_input("Segundo apellido (opcional): ") or None
    account_number = get_input("Número de cuenta: ")
    email = get_optional_input("Email (opcional): ") or None
    
    print()
    print("Ingrese una contraseña temporal para el docente.")
    print("El docente deberá cambiarla en su primer login.")
    generic_password = get_password_input("Contraseña temporal: ")
    
    # Crear datos del docente
    teacher_data = TeacherCreate(
        first_name=first_name,
        second_name=second_name,
        first_surname=first_surname,
        second_surname=second_surname,
        account_number=account_number,
        email=email,
        generic_password=generic_password
    )
    
    # Crear sesión y servicio
    session, engine = await get_db_session()
    
    try:
        auth_service = AuthService(session)
        user, username = await auth_service.create_teacher(teacher_data)
        
        print()
        print("=" * 60)
        print("  DOCENTE CREADO EXITOSAMENTE")
        print("=" * 60)
        print()
        print(f"  Username generado: {username}")
        print(f"  Nombre: {first_name} {first_surname}")
        print(f"  Número de cuenta: {account_number}")
        if email:
            print(f"  Email: {email}")
        print()
        print("  El docente debe iniciar sesión con:")
        print(f"    - Username: {username}")
        print(f"    - Contraseña temporal: [la que ingresó]")
        print()
        print("  En el primer login, se le solicitará cambiar")
        print("  la contraseña temporal.")
        print("=" * 60)
        
    except Exception as e:
        print()
        print(f"✗ Error al crear el docente: {str(e)}")
        sys.exit(1)
    
    finally:
        await session.close()
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
