from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


class SectionCreate(BaseModel):
    code: str = Field(..., min_length=1, max_length=50)
    next_practice: Optional[str] = None
    next_date: Optional[str] = None
    status: str = "bloqueada"


class SectionUpdate(BaseModel):
    code: Optional[str] = Field(None, min_length=1, max_length=50)
    next_practice: Optional[str] = None
    next_date: Optional[str] = None
    status: Optional[str] = None


class SectionResponse(BaseModel):
    id: str
    code: str
    student_count: int
    next_practice: Optional[str] = None
    next_date: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime


class StudentCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    student_code: int


class StudentUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=120)
    student_code: Optional[int] = None


class StudentPracticeProgress(BaseModel):
    section_practice_id: str
    practice_id: int
    practice_name: str
    category: str
    practice_status: str
    student_status: Literal["pendiente", "en_progreso", "completada", "calificada"]
    auto_score: Optional[float] = None
    manual_score: Optional[float] = None
    final_score: Optional[float] = None
    last_session_id: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class StudentResponse(BaseModel):
    id: str
    name: str
    student_code: int
    grades: dict[str, Optional[float]] = Field(default_factory=dict)
    practices: list[StudentPracticeProgress] = Field(default_factory=list)


class StudentSessionSummary(BaseModel):
    id: str
    practice_id: int
    practice_name: str
    status: str
    current_stage: int
    started_at: datetime
    completed_at: Optional[datetime] = None
    total_score: Optional[float] = None
    feedback: Optional[str] = None


class StudentDetailResponse(BaseModel):
    id: str
    name: str
    student_code: int
    section_code: str
    practices: list[StudentPracticeProgress] = Field(default_factory=list)
    sessions: list[StudentSessionSummary] = Field(default_factory=list)


PRACTICE_STATUSES = ("active", "blocked", "closed")


class SectionPracticeCreate(BaseModel):
    practice_id: int
    open_date: Optional[str] = None
    close_date: Optional[str] = None
    status: str = "blocked"


class SectionPracticeUpdate(BaseModel):
    open_date: Optional[str] = None
    close_date: Optional[str] = None
    status: Optional[str] = None


class SectionPracticeResponse(BaseModel):
    id: str
    practice_id: int
    name: str
    category: str
    open_date: Optional[str] = None
    close_date: Optional[str] = None
    status: str


class GradeUpsert(BaseModel):
    student_id: str
    section_practice_id: str
    score: Optional[float] = None


class GradeResponse(BaseModel):
    id: str
    student_id: str
    section_practice_id: str
    score: Optional[float] = None
    auto_score: Optional[float] = None
    manual_score: Optional[float] = None
    final_score: Optional[float] = None
