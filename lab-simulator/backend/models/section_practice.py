from uuid import uuid4
from datetime import datetime

from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from database import Base


PRACTICE_STATUSES = ("active", "blocked", "closed")


class SectionPractice(Base):
    __tablename__ = "section_practices"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    section_id = Column(String, ForeignKey("sections.id"), nullable=False)
    practice_id = Column(Integer, nullable=False)
    name = Column(String, nullable=True)
    unit = Column(String, nullable=True)
    open_date = Column(String, nullable=True)
    close_date = Column(String, nullable=True)
    status = Column(String, default="blocked")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    section = relationship("Section", back_populates="practices")
    grades = relationship("Grade", back_populates="section_practice", cascade="all, delete-orphan")
