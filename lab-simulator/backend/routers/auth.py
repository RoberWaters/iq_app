from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from dependencies.auth import get_current_user
from models.user import User
from schemas.auth import (
    LoginRequest,
    LoginResponse,
    ChangePasswordRequest,
    FirstLoginChangeRequest,
    UserDetailResponse,
)
from services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=LoginResponse)
async def login(
    login_data: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Autentica un usuario y retorna el token JWT.
    """
    auth_service = AuthService(db)
    result = await auth_service.authenticate_user(
        login_data.username,
        login_data.password
    )
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return result


@router.post("/change-password")
async def change_password(
    password_data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Cambia la contraseña del usuario (requiere contraseña actual).
    """
    auth_service = AuthService(db)
    success = await auth_service.change_password(
        current_user.id,
        password_data.current_password,
        password_data.new_password
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pudo cambiar la contraseña. Verifique su contraseña actual."
        )
    
    return {"message": "Contraseña cambiada exitosamente"}


@router.post("/first-login-change")
async def first_login_change(
    password_data: FirstLoginChangeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Cambia la contraseña en el primer login (no requiere contraseña actual).
    """
    if not current_user.must_change_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se requiere cambio de contraseña"
        )
    
    auth_service = AuthService(db)
    success = await auth_service.first_login_change_password(
        current_user.id,
        password_data.new_password
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pudo cambiar la contraseña"
        )
    
    return {"message": "Contraseña establecida exitosamente"}


@router.get("/me", response_model=UserDetailResponse)
async def get_me(
    current_user: User = Depends(get_current_user)
):
    """
    Obtiene la información del usuario autenticado.
    """
    return current_user


@router.post("/refresh")
async def refresh_token(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Refresca el token JWT del usuario.
    """
    auth_service = AuthService(db)
    
    # Crear nuevo token
    access_token = auth_service.create_access_token(
        data={
            "sub": str(current_user.id),
            "username": current_user.username,
            "role": current_user.role.value
        }
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }