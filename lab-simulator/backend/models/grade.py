from uuid import uuid4

from sqlalchemy import Column, String, Float, ForeignKey
from sqlalchemy.orm import relationship

from database import Base


class Grade(Base):
    __tablename__ = "grades"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    student_id = Column(String, ForeignKey("students.id"), nullable=False)
    section_practice_id = Column(String, ForeignKey("section_practices.id"), nullable=False)
    score = Column(Float, nullable=True)

    student = relationship("Student", back_populates="grades")
    section_practice = relationship("SectionPractice", back_populates="grades")
