from uuid import uuid4
from datetime import datetime

from sqlalchemy import Column, String, Integer, DateTime
from sqlalchemy.orm import relationship

from database import Base


class Section(Base):
    __tablename__ = "sections"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    code = Column(String, nullable=False, unique=True)
    description = Column(String, nullable=True)
    academic_year = Column(String, nullable=True)
    academic_period = Column(String, nullable=True)
    student_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    students = relationship("Student", back_populates="section", cascade="all, delete-orphan")
    practices = relationship("SectionPractice", back_populates="section", cascade="all, delete-orphan")
