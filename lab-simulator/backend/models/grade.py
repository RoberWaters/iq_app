from uuid import uuid4

from datetime import datetime

from sqlalchemy import Column, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship

from database import Base


class Grade(Base):
    __tablename__ = "grades"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    student_id = Column(String, ForeignKey("students.id"), nullable=False)
    section_practice_id = Column(String, ForeignKey("section_practices.id"), nullable=False)
    score = Column(Float, nullable=True)
    auto_score = Column(Float, nullable=True)
    manual_score = Column(Float, nullable=True)
    last_session_id = Column(String, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    student = relationship("Student", back_populates="grades")
    section_practice = relationship("SectionPractice", back_populates="grades")
