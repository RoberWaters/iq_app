import csv
import io
from typing import List, Optional

import data.practices  # noqa: F401
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from data.registry import get_all_practices, get_practice
from database import get_db
from dependencies.auth import require_teacher
from models.grade import Grade
from models.section import Section
from models.section_practice import SectionPractice
from models.session import PracticeSession
from models.student import Student
from schemas.auth import StudentCreate as AuthStudentCreate
from schemas.teacher import (
    GradeResponse,
    GradeUpsert,
    SectionCreate,
    SectionPracticeCreate,
    SectionPracticeResponse,
    SectionPracticeUpdate,
    SectionResponse,
    SectionUpdate,
    StudentCreate,
    StudentDetailResponse,
    StudentPracticeProgress,
    StudentResponse,
    StudentSessionSummary,
    StudentUpdate,
)
from services.auth_service import AuthService
from services.csv_import_service import CSVImportService
from services.email_service import EmailService
from services.excel_import_service import ExcelImportService

router = APIRouter(
    prefix="/teacher",
    tags=["teacher"],
    dependencies=[Depends(require_teacher)],
)


def _resolve_practice_name(practice_id: int, stored_name: Optional[str] = None) -> str:
    catalog = get_practice(practice_id) or {}
    return catalog.get("name") or stored_name or f"Practica {practice_id}"


def _resolve_practice_category(practice_id: int) -> str:
    catalog = get_practice(practice_id) or {}
    return catalog.get("category", "")


def _build_section_response(section: Section) -> SectionResponse:
    loaded_practices = section.__dict__.get("practices", []) or []
    loaded_students = section.__dict__.get("students", []) or []
    practices = sorted(
        list(loaded_practices),
        key=lambda item: (
            {"active": 0, "blocked": 1, "closed": 2}.get(item.status, 9),
            item.open_date or "",
            item.created_at.isoformat() if item.created_at else "",
        ),
    )
    next_practice = None
    next_date = None
    for practice in practices:
        if practice.status in {"active", "blocked"}:
            next_practice = _resolve_practice_name(practice.practice_id, getattr(practice, "name", None))
            next_date = practice.open_date or practice.close_date
            break

    return SectionResponse(
        id=section.id,
        code=section.code,
        student_count=len(loaded_students) if loaded_students else (section.student_count or 0),
        next_practice=next_practice or section.next_practice,
        next_date=next_date or section.next_date,
        status=section.status,
        created_at=section.created_at,
        updated_at=section.updated_at,
    )


def _enrich_section_practice(sp: SectionPractice) -> SectionPracticeResponse:
    return SectionPracticeResponse(
        id=sp.id,
        practice_id=sp.practice_id,
        name=_resolve_practice_name(sp.practice_id, getattr(sp, "name", None)),
        category=_resolve_practice_category(sp.practice_id),
        open_date=sp.open_date,
        close_date=sp.close_date,
        status=sp.status,
    )


def _grade_final_score(grade: Optional[Grade], latest_session: Optional[PracticeSession]) -> Optional[float]:
    if grade and grade.manual_score is not None:
        return grade.manual_score
    if grade and grade.auto_score is not None:
        return grade.auto_score
    if grade and grade.score is not None:
        return grade.score
    if latest_session and latest_session.total_score is not None:
        return latest_session.total_score
    return None


def _student_progress_status(grade: Optional[Grade], latest_session: Optional[PracticeSession]) -> str:
    if grade and grade.manual_score is not None:
        return "calificada"
    if latest_session and latest_session.status == "completed":
        return "completada"
    if latest_session:
        return "en_progreso"
    return "pendiente"


def _build_progress(
    student: Student,
    section_practices: list[SectionPractice],
    grades_by_practice: dict[str, Grade],
    sessions_by_practice_id: dict[int, PracticeSession],
) -> list[StudentPracticeProgress]:
    progress = []
    for section_practice in section_practices:
        grade = grades_by_practice.get(section_practice.id)
        latest_session = sessions_by_practice_id.get(section_practice.practice_id)
        auto_score = None
        if grade and grade.auto_score is not None:
            auto_score = grade.auto_score
        elif latest_session and latest_session.status == "completed":
            auto_score = latest_session.total_score

        progress.append(
            StudentPracticeProgress(
                section_practice_id=section_practice.id,
                practice_id=section_practice.practice_id,
                practice_name=_resolve_practice_name(section_practice.practice_id, getattr(section_practice, "name", None)),
                category=_resolve_practice_category(section_practice.practice_id),
                practice_status=section_practice.status,
                student_status=_student_progress_status(grade, latest_session),
                auto_score=auto_score,
                manual_score=grade.manual_score if grade else None,
                final_score=_grade_final_score(grade, latest_session),
                last_session_id=(grade.last_session_id if grade and grade.last_session_id else latest_session.id if latest_session else None),
                started_at=latest_session.started_at if latest_session else None,
                completed_at=latest_session.completed_at if latest_session else None,
            )
        )
    return progress


def _build_student_response(
    student: Student,
    section_code: str,
    section_practices: list[SectionPractice],
    sessions: list[PracticeSession],
) -> StudentResponse:
    grades_by_practice = {grade.section_practice_id: grade for grade in student.grades}
    sessions_by_practice_id: dict[int, PracticeSession] = {}
    for session in sorted(sessions, key=lambda item: item.started_at or item.completed_at, reverse=True):
        sessions_by_practice_id.setdefault(session.practice_id, session)
    progress = _build_progress(student, section_practices, grades_by_practice, sessions_by_practice_id)
    grades = {item.section_practice_id: item.final_score for item in progress}
    return StudentResponse(
        id=student.id,
        name=student.name,
        student_code=student.student_code,
        grades=grades,
        practices=progress,
    )


def _build_grade_response(grade: Grade) -> GradeResponse:
    final_score = grade.manual_score if grade.manual_score is not None else grade.auto_score if grade.auto_score is not None else grade.score
    return GradeResponse(
        id=grade.id,
        student_id=grade.student_id,
        section_practice_id=grade.section_practice_id,
        score=grade.score,
        auto_score=grade.auto_score,
        manual_score=grade.manual_score,
        final_score=final_score,
    )


async def _section_by_code(code: str, db: AsyncSession) -> Section:
    result = await db.execute(
        select(Section)
        .where(Section.code == code)
        .options(selectinload(Section.students), selectinload(Section.practices))
    )
    section = result.scalar_one_or_none()
    if not section:
        raise HTTPException(status_code=404, detail="Seccion no encontrada")
    return section


async def _student_by_id(section_id: str, student_id: str, db: AsyncSession) -> Student:
    result = await db.execute(
        select(Student)
        .where(Student.id == student_id, Student.section_id == section_id)
        .options(selectinload(Student.grades))
    )
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    return student


@router.get("/sections", response_model=List[SectionResponse])
async def list_sections(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Section)
        .options(selectinload(Section.students), selectinload(Section.practices))
        .order_by(Section.code)
    )
    return [_build_section_response(section) for section in result.scalars().all()]


@router.post("/sections", response_model=SectionResponse, status_code=201)
async def create_section(payload: SectionCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(Section).where(Section.code == payload.code))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Ya existe una seccion con ese codigo")

    section = Section(**payload.model_dump())
    db.add(section)
    await db.flush()
    await db.refresh(section)
    return _build_section_response(section)


@router.get("/sections/{section_id}", response_model=SectionResponse)
async def get_section(section_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Section)
        .where(Section.id == section_id)
        .options(selectinload(Section.students), selectinload(Section.practices))
    )
    section = result.scalar_one_or_none()
    if not section:
        raise HTTPException(status_code=404, detail="Seccion no encontrada")
    return _build_section_response(section)


@router.put("/sections/{section_id}", response_model=SectionResponse)
async def update_section(section_id: str, payload: SectionUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Section)
        .where(Section.id == section_id)
        .options(selectinload(Section.students), selectinload(Section.practices))
    )
    section = result.scalar_one_or_none()
    if not section:
        raise HTTPException(status_code=404, detail="Seccion no encontrada")

    updates = payload.model_dump(exclude_unset=True)
    if "code" in updates and updates["code"] != section.code:
        existing = await db.execute(select(Section).where(Section.code == updates["code"]))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Ya existe una seccion con ese codigo")

    for field, value in updates.items():
        setattr(section, field, value)

    await db.flush()
    await db.refresh(section)
    return _build_section_response(section)


@router.delete("/sections/{section_id}", status_code=204)
async def delete_section(section_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Section).where(Section.id == section_id))
    section = result.scalar_one_or_none()
    if not section:
        raise HTTPException(status_code=404, detail="Seccion no encontrada")
    await db.delete(section)
    await db.flush()


@router.get("/sections/{code}/students", response_model=List[StudentResponse])
async def list_students(code: str, db: AsyncSession = Depends(get_db)):
    section = await _section_by_code(code, db)
    students_result = await db.execute(
        select(Student)
        .where(Student.section_id == section.id)
        .options(selectinload(Student.grades))
        .order_by(Student.student_code)
    )
    students = students_result.scalars().all()
    section_practices_result = await db.execute(
        select(SectionPractice)
        .where(SectionPractice.section_id == section.id)
        .order_by(SectionPractice.created_at)
    )
    section_practices = section_practices_result.scalars().all()

    responses = []
    for student in students:
        sessions_result = await db.execute(
            select(PracticeSession)
            .where(
                PracticeSession.section_id == section.id,
                PracticeSession.student_id == student.id,
            )
            .order_by(PracticeSession.started_at.desc())
        )
        responses.append(
            _build_student_response(student, section.code, section_practices, sessions_result.scalars().all())
        )
    return responses


@router.get("/sections/{code}/students/{student_id}", response_model=StudentDetailResponse)
async def get_student_detail(code: str, student_id: str, db: AsyncSession = Depends(get_db)):
    section = await _section_by_code(code, db)
    student = await _student_by_id(section.id, student_id, db)

    section_practices_result = await db.execute(
        select(SectionPractice)
        .where(SectionPractice.section_id == section.id)
        .order_by(SectionPractice.created_at)
    )
    section_practices = section_practices_result.scalars().all()

    sessions_result = await db.execute(
        select(PracticeSession)
        .where(
            PracticeSession.section_id == section.id,
            PracticeSession.student_id == student.id,
        )
        .order_by(PracticeSession.started_at.desc())
    )
    sessions = sessions_result.scalars().all()
    student_response = _build_student_response(student, section.code, section_practices, sessions)
    session_items = [
        StudentSessionSummary(
            id=session.id,
            practice_id=session.practice_id,
            practice_name=_resolve_practice_name(session.practice_id),
            status=session.status,
            current_stage=session.current_stage,
            started_at=session.started_at,
            completed_at=session.completed_at,
            total_score=session.total_score,
            feedback=session.feedback,
        )
        for session in sessions
    ]
    return StudentDetailResponse(
        id=student.id,
        name=student.name,
        student_code=student.student_code,
        section_code=section.code,
        practices=student_response.practices,
        sessions=session_items,
    )


@router.post("/sections/{code}/students", response_model=StudentResponse, status_code=201)
async def create_student(code: str, payload: StudentCreate, db: AsyncSession = Depends(get_db)):
    section = await _section_by_code(code, db)
    duplicate = await db.execute(
        select(Student).where(
            Student.section_id == section.id,
            Student.student_code == payload.student_code,
        )
    )
    if duplicate.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Ya existe un estudiante con ese codigo en la seccion")

    student = Student(section_id=section.id, **payload.model_dump())
    db.add(student)
    await db.flush()
    await db.refresh(student)
    section.student_count = len(section.students or []) + 1
    await db.flush()
    return StudentResponse(id=student.id, name=student.name, student_code=student.student_code, grades={}, practices=[])


@router.put("/students/{student_id}", response_model=StudentResponse)
async def update_student(student_id: str, payload: StudentUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Student).where(Student.id == student_id).options(selectinload(Student.grades))
    )
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")

    updates = payload.model_dump(exclude_unset=True)
    if "student_code" in updates and updates["student_code"] != student.student_code:
        duplicate = await db.execute(
            select(Student).where(
                Student.section_id == student.section_id,
                Student.student_code == updates["student_code"],
                Student.id != student.id,
            )
        )
        if duplicate.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Ya existe un estudiante con ese codigo en la seccion")

    for field, value in updates.items():
        setattr(student, field, value)

    await db.flush()
    await db.refresh(student)
    return StudentResponse(
        id=student.id,
        name=student.name,
        student_code=student.student_code,
        grades={grade.section_practice_id: grade.score for grade in student.grades},
        practices=[],
    )


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


@router.get("/catalog/practices")
async def list_catalog_practices():
    return [
        {
            "id": practice["id"],
            "name": practice["name"],
            "category": practice.get("category", ""),
            "implemented": practice.get("implemented", False),
        }
        for practice in sorted(get_all_practices(), key=lambda item: item["number"])
    ]


@router.get("/sections/{code}/practices", response_model=List[SectionPracticeResponse])
async def list_section_practices(code: str, db: AsyncSession = Depends(get_db)):
    section = await _section_by_code(code, db)
    result = await db.execute(
        select(SectionPractice)
        .where(SectionPractice.section_id == section.id)
        .order_by(SectionPractice.created_at)
    )
    return [_enrich_section_practice(practice) for practice in result.scalars().all()]


@router.post("/sections/{code}/practices", response_model=SectionPracticeResponse, status_code=201)
async def create_section_practice(code: str, payload: SectionPracticeCreate, db: AsyncSession = Depends(get_db)):
    if not get_practice(payload.practice_id):
        raise HTTPException(status_code=400, detail="La practica no existe en el catalogo")

    section = await _section_by_code(code, db)
    duplicate = await db.execute(
        select(SectionPractice).where(
            SectionPractice.section_id == section.id,
            SectionPractice.practice_id == payload.practice_id,
        )
    )
    if duplicate.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Esta practica ya esta asignada a la seccion")

    section_practice = SectionPractice(
        section_id=section.id,
        name=_resolve_practice_name(payload.practice_id),
        **payload.model_dump(),
    )
    db.add(section_practice)
    await db.flush()
    await db.refresh(section_practice)
    return _enrich_section_practice(section_practice)


@router.put("/practices/{practice_id}", response_model=SectionPracticeResponse)
async def update_section_practice(practice_id: str, payload: SectionPracticeUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SectionPractice).where(SectionPractice.id == practice_id))
    section_practice = result.scalar_one_or_none()
    if not section_practice:
        raise HTTPException(status_code=404, detail="Practica no encontrada")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(section_practice, field, value)

    await db.flush()
    await db.refresh(section_practice)
    return _enrich_section_practice(section_practice)


@router.delete("/practices/{practice_id}", status_code=204)
async def delete_section_practice(practice_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SectionPractice).where(SectionPractice.id == practice_id))
    section_practice = result.scalar_one_or_none()
    if not section_practice:
        raise HTTPException(status_code=404, detail="Practica no encontrada")
    await db.delete(section_practice)
    await db.flush()


@router.put("/grades", response_model=GradeResponse)
async def upsert_grade(payload: GradeUpsert, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Grade).where(
            Grade.student_id == payload.student_id,
            Grade.section_practice_id == payload.section_practice_id,
        )
    )
    grade = result.scalar_one_or_none()

    if grade is None:
        grade = Grade(
            student_id=payload.student_id,
            section_practice_id=payload.section_practice_id,
        )
        db.add(grade)

    grade.manual_score = payload.score
    grade.score = payload.score if payload.score is not None else grade.auto_score

    await db.flush()
    await db.refresh(grade)
    return _build_grade_response(grade)


@router.get("/sections/{code}/export")
async def export_section_results(code: str, db: AsyncSession = Depends(get_db)):
    section = await _section_by_code(code, db)
    students = await list_students(code, db)
    practices_result = await db.execute(
        select(SectionPractice)
        .where(SectionPractice.section_id == section.id)
        .order_by(SectionPractice.created_at)
    )
    practices = practices_result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    header = ["Seccion", "Estudiante", "Codigo"]
    for practice in practices:
        practice_name = _resolve_practice_name(practice.practice_id, getattr(practice, "name", None))
        header.extend(
            [
                f"{practice_name} - Estado",
                f"{practice_name} - Auto",
                f"{practice_name} - Manual",
                f"{practice_name} - Final",
            ]
        )
    writer.writerow(header)

    for student in students:
        progress_by_id = {item.section_practice_id: item for item in student.practices}
        row = [code, student.name, student.student_code]
        for practice in practices:
            progress = progress_by_id.get(practice.id)
            row.extend(
                [
                    progress.student_status if progress else "pendiente",
                    progress.auto_score if progress and progress.auto_score is not None else "",
                    progress.manual_score if progress and progress.manual_score is not None else "",
                    progress.final_score if progress and progress.final_score is not None else "",
                ]
            )
        writer.writerow(row)

    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=section_{code}_results.csv"},
    )


@router.get("/sections/{code}/import-template")
async def download_section_import_template(code: str):
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["first_name", "second_name", "first_surname", "second_surname", "email", "section", "account_number"])
    writer.writerow(["Juan", "Carlos", "Perez", "Garcia", "juan.perez@uni.edu", code, "20241001"])
    writer.writerow(["Maria", "", "Lopez", "", "maria.lopez@uni.edu", code, "20241002"])
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=plantilla_{code}.csv"},
    )


@router.get("/sections/{code}/import-template/excel")
async def download_section_import_excel_template(code: str, db: AsyncSession = Depends(get_db)):
    excel_service = ExcelImportService(db)
    content = await excel_service.generate_excel_template()
    return StreamingResponse(
        io.BytesIO(content),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=plantilla_{code}.xlsx"},
    )


@router.post("/sections/{code}/import-students")
async def import_students_to_section(code: str, file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    section = await _section_by_code(code, db)
    content = await file.read()
    filename = (file.filename or "").lower()

    if filename.endswith((".xlsx", ".xls")):
        excel_service = ExcelImportService(db)
        result = await excel_service.import_to_section(file_content=content, filename=file.filename or "", section=section)
        section.student_count = (section.student_count or 0) + result["created_count"]
        await db.commit()
        return result

    if not filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="El archivo debe ser CSV, XLSX o XLS")

    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = content.decode("latin-1")
    csv_service = CSVImportService(db)
    result = await csv_service.import_students_to_section(text, section.code, section.id)
    section.student_count = (section.student_count or 0) + result["created_count"]
    await db.commit()
    return result


@router.post("/import-students")
async def import_students(
    file: UploadFile = File(...),
    default_section: str = Form("A"),
    db: AsyncSession = Depends(get_db),
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El archivo debe ser un CSV")

    try:
        content = await file.read()
        csv_content = content.decode("utf-8")
        csv_service = CSVImportService(db)
        return await csv_service.import_students_from_csv(csv_content, default_section)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al procesar el archivo: {exc}",
        )


@router.get("/students-template")
async def download_students_template(db: AsyncSession = Depends(get_db)):
    try:
        csv_service = CSVImportService(db)
        template_content = await csv_service.generate_csv_template()
        output = io.StringIO(template_content)
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode("utf-8")),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=students_template.csv"},
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al generar la plantilla: {exc}",
        )


@router.post("/export-students-credentials")
async def export_students_credentials(students_data: dict):
    students = students_data.get("students", [])
    if not students:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No hay estudiantes para exportar")

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Numero de Cuenta", "Usuario", "Contrasena"])
    for student in students:
        writer.writerow(
            [
                student.get("account_number", ""),
                student.get("username", ""),
                student.get("temp_password", ""),
            ]
        )

    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=credenciales_estudiantes.csv"},
    )
