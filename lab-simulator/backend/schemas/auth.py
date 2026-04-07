import re
import uuid
from datetime import datetime
from typing import Optional, Union

from pydantic import BaseModel, EmailStr, Field, field_validator


# ============== Request Schemas ==============

class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=1, max_length=255)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1, max_length=255)
    new_password: str = Field(..., min_length=6, max_length=255)

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        # Mínimo 6 caracteres, al menos 1 letra y 1 número
        if not re.search(r"[a-zA-Z]", v):
            raise ValueError("La contraseña debe contener al menos una letra")
        if not re.search(r"\d", v):
            raise ValueError("La contraseña debe contener al menos un número")
        return v


class FirstLoginChangeRequest(BaseModel):
    new_password: str = Field(..., min_length=6, max_length=255)

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        # Mínimo 6 caracteres, al menos 1 letra y 1 número
        if not re.search(r"[a-zA-Z]", v):
            raise ValueError("La contraseña debe contener al menos una letra")
        if not re.search(r"\d", v):
            raise ValueError("La contraseña debe contener al menos un número")
        return v


class TeacherCreate(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    second_name: Optional[str] = Field(None, max_length=100)
    first_surname: str = Field(..., min_length=1, max_length=100)
    second_surname: Optional[str] = Field(None, max_length=100)
    account_number: str = Field(..., min_length=1, max_length=50)
    email: Optional[EmailStr] = None
    generic_password: str = Field(..., min_length=6, max_length=255)


class StudentCreate(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    second_name: Optional[str] = Field(None, max_length=100)
    first_surname: str = Field(..., min_length=1, max_length=100)
    second_surname: Optional[str] = Field(None, max_length=100)
    email: Optional[EmailStr] = None
    section: str = Field(..., min_length=1, max_length=50)
    account_number: str = Field(..., min_length=1, max_length=50)
    generic_password: str = Field(..., min_length=6, max_length=255)


# ============== Profile Schemas ==============

class UserProfileResponse(BaseModel):
    username: str
    role: str
    must_change_password: bool
    email: Optional[str] = None

    class Config:
        from_attributes = True


class TeacherProfileDetail(BaseModel):
    first_name: str
    second_name: Optional[str] = None
    first_surname: str
    second_surname: Optional[str] = None
    account_number: str

    class Config:
        from_attributes = True


class StudentProfileDetail(BaseModel):
    section: str
    account_number: str
    first_name: Optional[str] = None
    second_name: Optional[str] = None
    first_surname: Optional[str] = None
    second_surname: Optional[str] = None

    class Config:
        from_attributes = True


# ============== Response Schemas ==============

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserProfileResponse
    profile: Optional[Union[TeacherProfileDetail, StudentProfileDetail]] = None


class UserDetailResponse(BaseModel):
    id: uuid.UUID
    username: str
    email: Optional[str] = None
    role: str
    is_active: bool
    created_at: datetime
    teacher_profile: Optional[TeacherProfileDetail] = None
    student_profile: Optional[StudentProfileDetail] = None

    class Config:
        from_attributes = True


class StudentCreationResult(BaseModel):
    username: str
    email: Optional[str] = None
    temp_password: str
    account_number: str


class CSVImportResult(BaseModel):
    created_count: int
    errors: list[dict]
    students: list[StudentCreationResult]
    email_results: list[dict] = []
