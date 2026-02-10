from pydantic import BaseModel
from typing import List, Optional


class PracticeListItem(BaseModel):
    id: int
    number: int
    name: str
    fullName: str
    description: str
    category: str
    difficulty: str
    implemented: bool
    comingSoon: bool


class PracticeMaterials(BaseModel):
    instruments: List[str]
    reagents: List[str]
    sample: Optional[str] = None
    distractorInstruments: List[str] = []
    distractorReagents: List[str] = []
