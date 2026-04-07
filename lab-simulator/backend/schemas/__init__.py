# Schemas package
from .auth import (
    LoginRequest,
    LoginResponse,
    ChangePasswordRequest,
    FirstLoginChangeRequest,
    UserProfileResponse,
    TeacherProfileDetail,
    StudentProfileDetail,
    TeacherCreate,
    StudentCreate,
    UserDetailResponse,
)

__all__ = [
    "LoginRequest",
    "LoginResponse",
    "ChangePasswordRequest",
    "FirstLoginChangeRequest",
    "UserProfileResponse",
    "TeacherProfileDetail",
    "StudentProfileDetail",
    "TeacherCreate",
    "StudentCreate",
    "UserDetailResponse",
]
