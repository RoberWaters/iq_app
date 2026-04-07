import re
import uuid
from datetime import datetime, timedelta
from typing import Optional, Tuple, Union

from jose import jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from config import settings
from models.user import User, UserRole, TeacherProfile, StudentProfile
from schemas.auth import (
    TeacherCreate,
    StudentCreate,
    LoginResponse,
    UserProfileResponse,
    TeacherProfileDetail,
    StudentProfileDetail,
)

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ============== Password Utilities ==============

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verifica si la contraseña coincide con el hash."""
        return pwd_context.verify(plain_password, hashed_password)

    @staticmethod
    def get_password_hash(password: str) -> str:
        """Genera un hash de la contraseña."""
        return pwd_context.hash(password)

    # ============== JWT Utilities ==============

    @staticmethod
    def create_access_token(
        data: dict,
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """Crea un token JWT de acceso."""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(days=7)  # 7 días por defecto
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(
            to_encode,
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM
        )
        return encoded_jwt

    # ============== Username Generation ==============

    @staticmethod
    def generate_username(
        first_name: str,
        first_surname: str,
        existing_usernames: set
    ) -> str:
        """Genera un username único en formato nombre.apellido."""
        # Limpiar caracteres especiales
        clean_first = re.sub(r'[^a-zA-Z0-9]', '', first_name.lower())
        clean_surname = re.sub(r'[^a-zA-Z0-9]', '', first_surname.lower())
        
        base_username = f"{clean_first}.{clean_surname}"
        username = base_username
        counter = 1
        
        # Si existe, agregar sufijo numérico incremental
        while username in existing_usernames:
            username = f"{base_username}.{counter}"
            counter += 1
        
        return username

    async def get_all_usernames(self) -> set:
        """Obtiene todos los usernames existentes."""
        result = await self.db.execute(select(User.username))
        return set(result.scalars().all())

    # ============== User Operations ==============

    async def get_user_by_id(self, user_id: uuid.UUID) -> Optional[User]:
        """Obtiene un usuario por su ID con perfiles cargados."""
        result = await self.db.execute(
        select(User)
        .where(User.id == user_id)
        .options(
            selectinload(User.teacher_profile),
            selectinload(User.student_profile)
            )
        )
        return result.scalar_one_or_none()

    async def get_user_by_username(self, username: str) -> Optional[User]:
        """Obtiene un usuario por su username con perfiles cargados."""
        result = await self.db.execute(
        select(User)
        .where(User.username == username)
        .options(
            selectinload(User.teacher_profile),
            selectinload(User.student_profile)
            )
        )
        return result.scalar_one_or_none()

    async def authenticate_user(
        self,
        username: str,
        password: str
    ) -> Optional[LoginResponse]:
        """Autentica un usuario y genera token."""
        user = await self.get_user_by_username(username)
        
        if not user:
            return None
        
        if not user.is_active:
            return None
        
        if not self.verify_password(password, user.hashed_password):
            return None
        
        # Actualizar last_login
        user.last_login = datetime.utcnow()
        await self.db.commit()
        
        # Crear token
        access_token = self.create_access_token(
            data={"sub": str(user.id), "username": user.username, "role": user.role.value}
        )
        
        # Preparar respuesta de perfil
        profile = None
        if user.teacher_profile:
            profile = TeacherProfileDetail(
                first_name=user.teacher_profile.first_name,
                second_name=user.teacher_profile.second_name,
                first_surname=user.teacher_profile.first_surname,
                second_surname=user.teacher_profile.second_surname,
                account_number=user.teacher_profile.account_number
            )
        elif user.student_profile:
            profile = StudentProfileDetail(
                section=user.student_profile.section,
                account_number=user.student_profile.account_number,
                first_name=user.student_profile.first_name,
                second_name=user.student_profile.second_name,
                first_surname=user.student_profile.first_surname,
                second_surname=user.student_profile.second_surname
            )
        
        return LoginResponse(
            access_token=access_token,
            token_type="bearer",
            user=UserProfileResponse(
                username=user.username,
                role=user.role.value,
                must_change_password=user.must_change_password,
                email=user.email
            ),
            profile=profile
        )

    async def change_password(
        self,
        user_id: uuid.UUID,
        current_password: str,
        new_password: str
    ) -> bool:
        """Cambia la contraseña de un usuario (requiere contraseña actual)."""
        user = await self.get_user_by_id(user_id)
        
        if not user:
            return False
        
        if not self.verify_password(current_password, user.hashed_password):
            return False
        
        user.hashed_password = self.get_password_hash(new_password)
        user.must_change_password = False
        await self.db.commit()
        
        return True

    async def first_login_change_password(
        self,
        user_id: uuid.UUID,
        new_password: str
    ) -> bool:
        """Cambia la contraseña en el primer login (no requiere contraseña actual)."""
        user = await self.get_user_by_id(user_id)
        
        if not user:
            return False
        
        if not user.must_change_password:
            return False
        
        user.hashed_password = self.get_password_hash(new_password)
        user.must_change_password = False
        await self.db.commit()
        
        return True

    # ============== Teacher Operations ==============

    async def create_teacher(
        self,
        teacher_data: TeacherCreate,
        *,
        autocommit: bool = True,
    ) -> Tuple[User, str]:
        """Crea un nuevo docente con perfil."""
        # Generar username único
        existing_usernames = await self.get_all_usernames()
        username = self.generate_username(
            teacher_data.first_name,
            teacher_data.first_surname,
            existing_usernames
        )
        
        # Crear usuario
        user = User(
            username=username,
            email=teacher_data.email,
            hashed_password=self.get_password_hash(teacher_data.generic_password),
            role=UserRole.TEACHER,
            must_change_password=True,
            is_active=True
        )
        
        self.db.add(user)
        await self.db.flush()  # Para obtener el ID
        
        # Crear perfil de docente
        teacher_profile = TeacherProfile(
            user_id=user.id,
            first_name=teacher_data.first_name,
            second_name=teacher_data.second_name,
            first_surname=teacher_data.first_surname,
            second_surname=teacher_data.second_surname,
            account_number=teacher_data.account_number
        )
        
        self.db.add(teacher_profile)
        if autocommit:
            await self.db.commit()
            await self.db.refresh(user)
        else:
            await self.db.flush()
        
        return user, username

    # ============== Student Operations ==============

    async def create_student(
        self,
        student_data: StudentCreate,
        *,
        autocommit: bool = True,
    ) -> Tuple[User, str, str]:
        """Crea un nuevo estudiante con perfil. Retorna (user, username, temp_password)."""
        # Generar username único
        existing_usernames = await self.get_all_usernames()
        username = self.generate_username(
            student_data.first_name,
            student_data.first_surname,
            existing_usernames
        )
        
        # Crear usuario
        user = User(
            username=username,
            email=student_data.email,
            hashed_password=self.get_password_hash(student_data.generic_password),
            role=UserRole.STUDENT,
            must_change_password=True,
            is_active=True
        )
        
        self.db.add(user)
        await self.db.flush()  # Para obtener el ID
        
        # Crear perfil de estudiante
        student_profile = StudentProfile(
            user_id=user.id,
            section=student_data.section,
            account_number=student_data.account_number,
            first_name=student_data.first_name,
            second_name=student_data.second_name,
            first_surname=student_data.first_surname,
            second_surname=student_data.second_surname
        )
        
        self.db.add(student_profile)
        if autocommit:
            await self.db.commit()
            await self.db.refresh(user)
        else:
            await self.db.flush()
        
        return user, username, student_data.generic_password
