import io
from typing import List

import data.practices  # noqa: F401 — triggers catalog registration
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from data.registry import get_all_practices, get_practice
from database import get_db
from dependencies.auth import require_teacher
from models.user import User
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
from services.csv_import_service import CSVImportService

router = APIRouter(prefix="/teacher", tags=["teacher"])


def _enrich_practice(sp: SectionPractice) -> dict:
    """Merge SectionPractice row with catalog data."""
    catalog = get_practice(sp.practice_id) or {}
    return {
        "id": sp.id,
        "practice_id": sp.practice_id,
        "name": catalog.get("name", f"Práctica {sp.practice_id}"),
        "category": catalog.get("category", ""),
        "open_date": sp.open_date,
        "close_date": sp.close_date,
        "status": sp.status,
    }


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


# ── Catalog ───────────────────────────────────────────────────────────────

@router.get("/catalog/practices")
async def list_catalog_practices():
    """Return the catalog practices available for assignment to sections."""
    return [
        {
            "id": p["id"],
            "name": p["name"],
            "category": p.get("category", ""),
            "implemented": p.get("implemented", False),
        }
        for p in sorted(get_all_practices(), key=lambda x: x["number"])
    ]


# ── Section Practices CRUD ────────────────────────────────────────────────

@router.get("/sections/{code}/practices", response_model=List[SectionPracticeResponse])
async def list_section_practices(code: str, db: AsyncSession = Depends(get_db)):
    section = await _section_by_code(code, db)
    result = await db.execute(
        select(SectionPractice)
        .where(SectionPractice.section_id == section.id)
        .order_by(SectionPractice.created_at)
    )
    return [_enrich_practice(sp) for sp in result.scalars().all()]


@router.post("/sections/{code}/practices", response_model=SectionPracticeResponse, status_code=201)
async def create_section_practice(
    code: str, payload: SectionPracticeCreate, db: AsyncSession = Depends(get_db)
):
    if not get_practice(payload.practice_id):
        raise HTTPException(status_code=400, detail="La práctica no existe en el catálogo")

    section = await _section_by_code(code, db)

    duplicate = await db.execute(
        select(SectionPractice).where(
            SectionPractice.section_id == section.id,
            SectionPractice.practice_id == payload.practice_id,
        )
    )
    if duplicate.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Esta práctica ya está asignada a la sección")

    sp = SectionPractice(section_id=section.id, **payload.model_dump())
    db.add(sp)
    await db.flush()
    await db.refresh(sp)
    return _enrich_practice(sp)


@router.put("/practices/{practice_id}", response_model=SectionPracticeResponse)
async def update_section_practice(
    practice_id: str, payload: SectionPracticeUpdate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(SectionPractice).where(SectionPractice.id == practice_id))
    sp = result.scalar_one_or_none()
    if not sp:
        raise HTTPException(status_code=404, detail="Práctica no encontrada")

    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(sp, field, value)

    await db.flush()
    await db.refresh(sp)
    return _enrich_practice(sp)


@router.delete("/practices/{practice_id}", status_code=204)
async def delete_section_practice(practice_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SectionPractice).where(SectionPractice.id == practice_id))
    sp = result.scalar_one_or_none()
    if not sp:
        raise HTTPException(status_code=404, detail="Práctica no encontrada")

    await db.delete(sp)
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


# ── CSV Import (Shirley's feature) ─────────────────────────────────────────

@router.post("/import-students")
async def import_students(
    file: UploadFile = File(...),
    default_section: str = Form("A"),
    current_user: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db)
):
    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo debe ser un CSV"
        )

    try:
        content = await file.read()
        csv_content = content.decode('utf-8')
        csv_service = CSVImportService(db)
        result = await csv_service.import_students_from_csv(csv_content, default_section)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al procesar el archivo: {str(e)}"
        )


@router.get("/students-template")
async def download_students_template(
    current_user: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db)
):
    try:
        csv_service = CSVImportService(db)
        template_content = await csv_service.generate_csv_template()
        output = io.StringIO(template_content)
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode('utf-8')),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=students_template.csv"}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al generar la plantilla: {str(e)}"
        )


@router.post("/export-students-credentials")
async def export_students_credentials(
    students_data: dict,
    current_user: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db)
):
    import csv

    students = students_data.get("students", [])
    if not students:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hay estudiantes para exportar"
        )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Número de Cuenta", "Usuario", "Contraseña"])
    for student in students:
        writer.writerow([
            student.get("account_number", ""),
            student.get("username", ""),
            student.get("temp_password", "")
        ])

    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8')),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=credenciales_estudiantes.csv"}
    )
