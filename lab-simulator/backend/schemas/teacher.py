from pydantic import BaseModel
from typing import Optional
from datetime import datetime


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
