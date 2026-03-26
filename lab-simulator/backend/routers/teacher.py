from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database import get_db
from models.section import Section
from models.student import Student
from models.section_practice import SectionPractice
from models.grade import Grade
from schemas.teacher import (
    SectionCreate, SectionUpdate, SectionResponse,
    StudentCreate, StudentUpdate, StudentResponse,
    SectionPracticeCreate, SectionPracticeUpdate, SectionPracticeResponse,
    GradeUpsert, GradeResponse,
)

router = APIRouter(prefix="/teacher", tags=["teacher"])


async def _section_by_code(code: str, db: AsyncSession) -> Section:
    result = await db.execute(select(Section).where(Section.code == code))
    section = result.scalar_one_or_none()
    if not section:
        raise HTTPException(status_code=404, detail="Sección no encontrada")
    return section


# ── Sections CRUD ─────────────────────────────────────────────────────────

@router.get("/sections", response_model=List[SectionResponse])
async def list_sections(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Section).order_by(Section.code))
    return result.scalars().all()


@router.post("/sections", response_model=SectionResponse, status_code=201)
async def create_section(payload: SectionCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(
        select(Section).where(Section.code == payload.code)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Ya existe una sección con ese código")

    section = Section(**payload.model_dump())
    db.add(section)
    await db.flush()
    await db.refresh(section)
    return section


@router.get("/sections/{section_id}", response_model=SectionResponse)
async def get_section(section_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Section).where(Section.id == section_id))
    section = result.scalar_one_or_none()
    if not section:
        raise HTTPException(status_code=404, detail="Sección no encontrada")
    return section


@router.put("/sections/{section_id}", response_model=SectionResponse)
async def update_section(
    section_id: str,
    payload: SectionUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Section).where(Section.id == section_id))
    section = result.scalar_one_or_none()
    if not section:
        raise HTTPException(status_code=404, detail="Sección no encontrada")

    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(section, field, value)

    await db.flush()
    await db.refresh(section)
    return section


@router.delete("/sections/{section_id}", status_code=204)
async def delete_section(section_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Section).where(Section.id == section_id))
    section = result.scalar_one_or_none()
    if not section:
        raise HTTPException(status_code=404, detail="Sección no encontrada")

    await db.delete(section)
    await db.flush()


# ── Students CRUD ─────────────────────────────────────────────────────────

@router.get("/sections/{code}/students", response_model=List[StudentResponse])
async def list_students(code: str, db: AsyncSession = Depends(get_db)):
    section = await _section_by_code(code, db)
    result = await db.execute(
        select(Student)
        .where(Student.section_id == section.id)
        .options(selectinload(Student.grades))
        .order_by(Student.student_code)
    )
    students = result.scalars().all()
    return [
        {
            "id": s.id,
            "name": s.name,
            "student_code": s.student_code,
            "grades": {g.section_practice_id: g.score for g in s.grades},
        }
        for s in students
    ]


@router.post("/sections/{code}/students", response_model=StudentResponse, status_code=201)
async def create_student(code: str, payload: StudentCreate, db: AsyncSession = Depends(get_db)):
    section = await _section_by_code(code, db)
    student = Student(section_id=section.id, **payload.model_dump())
    db.add(student)
    section.student_count = (section.student_count or 0) + 1
    await db.flush()
    await db.refresh(student)
    return {"id": student.id, "name": student.name, "student_code": student.student_code, "grades": {}}


@router.put("/students/{student_id}", response_model=StudentResponse)
async def update_student(student_id: str, payload: StudentUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Student).where(Student.id == student_id).options(selectinload(Student.grades))
    )
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")

    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(student, field, value)

    await db.flush()
    await db.refresh(student)
    return {
        "id": student.id,
        "name": student.name,
        "student_code": student.student_code,
        "grades": {g.section_practice_id: g.score for g in student.grades},
    }


@router.delete("/students/{student_id}", status_code=204)
async def delete_student(student_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Student).where(Student.id == student_id))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")

    section_result = await db.execute(select(Section).where(Section.id == student.section_id))
    section = section_result.scalar_one_or_none()
    if section:
        section.student_count = max(0, (section.student_count or 0) - 1)

    await db.delete(student)
    await db.flush()


# ── Section Practices CRUD ────────────────────────────────────────────────

@router.get("/sections/{code}/practices", response_model=List[SectionPracticeResponse])
async def list_section_practices(code: str, db: AsyncSession = Depends(get_db)):
    section = await _section_by_code(code, db)
    result = await db.execute(
        select(SectionPractice)
        .where(SectionPractice.section_id == section.id)
        .order_by(SectionPractice.created_at)
    )
    return result.scalars().all()


@router.post("/sections/{code}/practices", response_model=SectionPracticeResponse, status_code=201)
async def create_section_practice(
    code: str, payload: SectionPracticeCreate, db: AsyncSession = Depends(get_db)
):
    section = await _section_by_code(code, db)
    practice = SectionPractice(section_id=section.id, **payload.model_dump())
    db.add(practice)
    await db.flush()
    await db.refresh(practice)
    return practice


@router.put("/practices/{practice_id}", response_model=SectionPracticeResponse)
async def update_section_practice(
    practice_id: str, payload: SectionPracticeUpdate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(SectionPractice).where(SectionPractice.id == practice_id))
    practice = result.scalar_one_or_none()
    if not practice:
        raise HTTPException(status_code=404, detail="Práctica no encontrada")

    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(practice, field, value)

    await db.flush()
    await db.refresh(practice)
    return practice


@router.delete("/practices/{practice_id}", status_code=204)
async def delete_section_practice(practice_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SectionPractice).where(SectionPractice.id == practice_id))
    practice = result.scalar_one_or_none()
    if not practice:
        raise HTTPException(status_code=404, detail="Práctica no encontrada")

    await db.delete(practice)
    await db.flush()


# ── Grades ────────────────────────────────────────────────────────────────

@router.put("/grades", response_model=GradeResponse)
async def upsert_grade(payload: GradeUpsert, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Grade).where(
            Grade.student_id == payload.student_id,
            Grade.section_practice_id == payload.section_practice_id,
        )
    )
    grade = result.scalar_one_or_none()

    if grade:
        grade.score = payload.score
    else:
        grade = Grade(**payload.model_dump())
        db.add(grade)

    await db.flush()
    await db.refresh(grade)
    return grade
