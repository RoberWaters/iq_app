from pydantic import BaseModel
from typing import Optional


class CalculationValidateRequest(BaseModel):
    session_id: str
    student_result: float
    formula_used: Optional[str] = None


class CalculationValidateResponse(BaseModel):
    correct_result: float
    student_result: float
    percent_error: float
    is_within_tolerance: bool
    tolerance: float
    feedback: str


class ExpectedVolumeRequest(BaseModel):
    practice_id: int
    measured_value: float
    sample_id: Optional[str] = None


class ExpectedVolumeResponse(BaseModel):
    expected_volume: float
    explanation: str
