import uuid
from datetime import datetime
from enum import Enum as PyEnum
from typing import Optional

from sqlalchemy import String, Boolean, DateTime, ForeignKey, Enum, Index, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class UserRole(str, PyEnum):
    TEACHER = "teacher"
    STUDENT = "student"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    username: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        index=True,
        nullable=False
    )
    email: Mapped[Optional[str]] = mapped_column(
        String(255),
        unique=True,
        nullable=True
    )
    hashed_password: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole),
        nullable=False
    )
    must_change_password: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )
    last_login: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True
    )

    # Relationships
    teacher_profile: Mapped[Optional["TeacherProfile"]] = relationship(
        "TeacherProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan"
    )
    student_profile: Mapped[Optional["StudentProfile"]] = relationship(
        "StudentProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<User {self.username} ({self.role})>"


class TeacherProfile(Base):
    __tablename__ = "teacher_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True
    )
    first_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )
    second_name: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True
    )
    first_surname: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )
    second_surname: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True
    )
    account_number: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False
    )

    # Relationship
    user: Mapped["User"] = relationship(
        "User",
        back_populates="teacher_profile"
    )

    def __repr__(self) -> str:
        return f"<TeacherProfile {self.first_name} {self.first_surname}>"


class StudentProfile(Base):
    __tablename__ = "student_profiles"
    __table_args__ = (
        Index("ix_student_profiles_section", "section"),
        Index("ix_student_profiles_account_number", "account_number"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True
    )
    section: Mapped[str] = mapped_column(
        String(50),
        index=True,
        nullable=False
    )
    account_number: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        index=True,
        nullable=False
    )
    first_name: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True
    )
    second_name: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True
    )
    first_surname: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True
    )
    second_surname: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True
    )

    # Relationship
    user: Mapped["User"] = relationship(
        "User",
        back_populates="student_profile"
    )

    def __repr__(self) -> str:
        return f"<StudentProfile {self.account_number} - Section {self.section}>"
