from pydantic import BaseModel
from typing import Optional, Dict
from datetime import datetime


# ── Sections ──────────────────────────────────────────────────────────────

class SectionCreate(BaseModel):
    code: str
    student_count: int = 0
    next_practice: Optional[str] = None
    next_date: Optional[str] = None
    status: str = "bloqueada"


class SectionUpdate(BaseModel):
    code: Optional[str] = None
    student_count: Optional[int] = None
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

    model_config = {"from_attributes": True}


# ── Students ──────────────────────────────────────────────────────────────

class StudentCreate(BaseModel):
    name: str
    student_code: int


class StudentUpdate(BaseModel):
    name: Optional[str] = None
    student_code: Optional[int] = None


class StudentResponse(BaseModel):
    id: str
    name: str
    student_code: int
    grades: Dict[str, Optional[float]] = {}

    model_config = {"from_attributes": True}


# ── Section Practices ─────────────────────────────────────────────────────

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

    model_config = {"from_attributes": True}


# ── Grades ────────────────────────────────────────────────────────────────

class GradeUpsert(BaseModel):
    student_id: str
    section_practice_id: str
    score: Optional[float] = None


class GradeResponse(BaseModel):
    id: str
    student_id: str
    section_practice_id: str
    score: Optional[float] = None

    model_config = {"from_attributes": True}
