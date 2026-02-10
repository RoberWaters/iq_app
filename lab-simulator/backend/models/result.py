from uuid import uuid4

from sqlalchemy import Column, String, Float, ForeignKey
from sqlalchemy.orm import relationship

from database import Base


class PracticeResult(Base):
    __tablename__ = "practice_results"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    session_id = Column(String, ForeignKey("practice_sessions.id"))
    criterion_id = Column(String, nullable=False)
    criterion_label = Column(String)
    score = Column(Float)
    max_score = Column(Float)
    feedback = Column(String)

    # Relationships
    session = relationship("PracticeSession", back_populates="results")
