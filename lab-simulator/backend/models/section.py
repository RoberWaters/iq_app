from uuid import uuid4
from datetime import datetime

from sqlalchemy import Column, String, Integer, DateTime
from sqlalchemy.orm import relationship

from database import Base


class Section(Base):
    __tablename__ = "sections"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    code = Column(String, nullable=False, unique=True)
    student_count = Column(Integer, default=0)
    next_practice = Column(String, nullable=True)
    next_date = Column(String, nullable=True)
    status = Column(String, default="bloqueada")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    students = relationship("Student", back_populates="section", cascade="all, delete-orphan")
    practices = relationship("SectionPractice", back_populates="section", cascade="all, delete-orphan")
