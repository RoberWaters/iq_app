from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime


class SessionCreate(BaseModel):
    practice_id: int
    student_name: Optional[str] = None


class SessionResponse(BaseModel):
    id: str
    student_name: Optional[str] = None
    practice_id: int
    started_at: datetime
    completed_at: Optional[datetime] = None
    current_stage: int
    status: str
    sample_id: Optional[str] = None
    measured_value: Optional[float] = None
    measured_unit: Optional[str] = None
    expected_volume: Optional[float] = None
    recorded_volume: Optional[float] = None
    student_calculation: Optional[float] = None
    correct_calculation: Optional[float] = None
    percent_error: Optional[float] = None
    materials_correct: Optional[bool] = None
    assembly_correct: Optional[bool] = None
    total_score: Optional[float] = None
    feedback: Optional[str] = None

    class Config:
        from_attributes = True


class StageUpdate(BaseModel):
    stage: int
    data: Optional[Dict[str, Any]] = None


class MeasurementUpdate(BaseModel):
    value: float
    unit: str


class MaterialsUpdate(BaseModel):
    instruments: List[str]
    reagents: List[str]


class TitrationUpdate(BaseModel):
    recorded_volume: float
