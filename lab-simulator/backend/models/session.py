from uuid import uuid4
from datetime import datetime

from sqlalchemy import Column, String, Integer, Float, DateTime, Boolean, Text
from sqlalchemy.orm import relationship

from database import Base


class PracticeSession(Base):
    __tablename__ = "practice_sessions"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    student_name = Column(String, nullable=True)
    practice_id = Column(Integer, nullable=False)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    current_stage = Column(Integer, default=1)
    status = Column(String, default="in_progress")

    # Measurement fields
    sample_id = Column(String, nullable=True)
    measured_value = Column(Float, nullable=True)
    measured_unit = Column(String, nullable=True)

    # Titration fields
    expected_volume = Column(Float, nullable=True)
    recorded_volume = Column(Float, nullable=True)

    # Calculation fields
    student_calculation = Column(Float, nullable=True)
    correct_calculation = Column(Float, nullable=True)
    percent_error = Column(Float, nullable=True)

    # Validation fields
    materials_correct = Column(Boolean, nullable=True)
    assembly_correct = Column(Boolean, nullable=True)

    # Scoring fields
    total_score = Column(Float, nullable=True)
    feedback = Column(Text, nullable=True)

    # Relationships
    results = relationship("PracticeResult", back_populates="session")
