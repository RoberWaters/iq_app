from datetime import datetime
from typing import Literal

import data.practices  # noqa: F401
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from data.registry import get_practice
from database import get_db
from models.grade import Grade
from models.result import PracticeResult
from models.section import Section
from models.section_practice import SectionPractice
from models.session import PracticeSession
from models.student import Student
from schemas.session import (
    MaterialsUpdate,
    MeasurementUpdate,
    SessionCreate,
    StageUpdate,
    TitrationUpdate,
)
from services.report_generator import generate_report
from services.titration_curve import generate_titration_curve
from services.titration_engine import get_expected_volume

router = APIRouter(prefix="/sessions", tags=["sessions"])


def _session_to_dict(session: PracticeSession):
    return {
        "id": session.id,
        "student_name": session.student_name,
        "student_id": session.student_id,
        "student_code": session.student_code,
        "section_id": session.section_id,
        "section_code": session.section_code,
        "practice_id": session.practice_id,
        "started_at": session.started_at,
        "completed_at": session.completed_at,
        "current_stage": session.current_stage,
        "status": session.status,
        "sample_id": session.sample_id,
        "measured_value": session.measured_value,
        "measured_unit": session.measured_unit,
        "expected_volume": session.expected_volume,
        "recorded_volume": session.recorded_volume,
        "student_calculation": session.student_calculation,
        "correct_calculation": session.correct_calculation,
        "percent_error": session.percent_error,
        "materials_correct": session.materials_correct,
        "assembly_correct": session.assembly_correct,
        "total_score": session.total_score,
        "feedback": session.feedback,
    }


async def _load_session(session_id: str, db: AsyncSession) -> PracticeSession:
    result = await db.execute(select(PracticeSession).where(PracticeSession.id == session_id))
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=404, detail="Sesion no encontrada")
    return session


@router.post("")
async def create_session(body: SessionCreate, db: AsyncSession = Depends(get_db)):
    practice = get_practice(body.practice_id)
    if practice is None:
        raise HTTPException(status_code=404, detail="Practica no encontrada")

    student = None
    section = None

    if body.section_id:
        section_result = await db.execute(select(Section).where(Section.id == body.section_id))
        section = section_result.scalar_one_or_none()
        if section is None:
            raise HTTPException(status_code=404, detail="Seccion no encontrada")
    elif body.section_code:
        section_result = await db.execute(select(Section).where(Section.code == body.section_code))
        section = section_result.scalar_one_or_none()
        if section is None:
            raise HTTPException(status_code=404, detail="Seccion no encontrada")

    if body.student_id:
        student_result = await db.execute(select(Student).where(Student.id == body.student_id))
        student = student_result.scalar_one_or_none()
        if student is None:
            raise HTTPException(status_code=404, detail="Estudiante no encontrado")
        if section and student.section_id != section.id:
            raise HTTPException(status_code=400, detail="El estudiante no pertenece a la seccion indicada")
        if section is None:
            section_result = await db.execute(select(Section).where(Section.id == student.section_id))
            section = section_result.scalar_one_or_none()
    elif body.student_code and section:
        try:
            student_code = int(body.student_code)
        except (TypeError, ValueError):
            student_code = None

        if student_code is not None:
            student_result = await db.execute(
                select(Student).where(
                    Student.section_id == section.id,
                    Student.student_code == student_code,
                )
            )
            student = student_result.scalar_one_or_none()

    expected_vol = None
    measurement = practice.get("measurement")
    if measurement and practice.get("titration"):
        default_value = measurement.get("defaultValue", 0)
        try:
            result = get_expected_volume(body.practice_id, default_value)
            expected_vol = result["expected_volume"]
        except Exception:
            pass

    session = PracticeSession(
        student_name=body.student_name or (student.name if student else None),
        student_id=student.id if student else body.student_id,
        student_code=body.student_code or (str(student.student_code) if student else None),
        section_id=section.id if section else body.section_id,
        section_code=section.code if section else body.section_code,
        practice_id=body.practice_id,
        expected_volume=expected_vol,
    )
    db.add(session)
    await db.flush()
    return _session_to_dict(session)


@router.get("/{session_id}")
async def get_session(session_id: str, db: AsyncSession = Depends(get_db)):
    session = await _load_session(session_id, db)
    return _session_to_dict(session)


@router.put("/{session_id}/stage")
async def update_stage(session_id: str, body: StageUpdate, db: AsyncSession = Depends(get_db)):
    session = await _load_session(session_id, db)
    session.current_stage = body.stage
    if body.data and "assembly_correct" in body.data:
        session.assembly_correct = body.data["assembly_correct"]
    await db.flush()
    return _session_to_dict(session)


@router.put("/{session_id}/measurement")
async def update_measurement(session_id: str, body: MeasurementUpdate, db: AsyncSession = Depends(get_db)):
    session = await _load_session(session_id, db)
    session.measured_value = body.value
    session.measured_unit = body.unit
    if body.sample_id is not None:
        session.sample_id = body.sample_id

    try:
        vol_result = get_expected_volume(session.practice_id, body.value, body.sample_id)
        session.expected_volume = vol_result["expected_volume"]
    except Exception:
        pass

    await db.flush()
    return _session_to_dict(session)


@router.put("/{session_id}/materials")
async def update_materials(session_id: str, body: MaterialsUpdate, db: AsyncSession = Depends(get_db)):
    session = await _load_session(session_id, db)
    practice = get_practice(session.practice_id)
    if practice is None:
        raise HTTPException(status_code=404, detail="Practica no encontrada")

    required_inst = set(practice.get("requiredInstruments", []))
    required_reag = set(practice.get("requiredReagents", []))
    selected_inst = set(body.instruments)
    selected_reag = set(body.reagents)

    inst_correct = selected_inst == required_inst
    reag_correct = selected_reag == required_reag
    session.materials_correct = inst_correct and reag_correct
    await db.flush()

    errors = []
    if not inst_correct:
        missing_inst = required_inst - selected_inst
        extra_inst = selected_inst - required_inst
        if missing_inst:
            errors.append(f"Faltan instrumentos: {', '.join(missing_inst)}")
        if extra_inst:
            errors.append(f"Instrumentos incorrectos: {', '.join(extra_inst)}")
    if not reag_correct:
        missing_reag = required_reag - selected_reag
        extra_reag = selected_reag - required_reag
        if missing_reag:
            errors.append(f"Faltan reactivos: {', '.join(missing_reag)}")
        if extra_reag:
            errors.append(f"Reactivos incorrectos: {', '.join(extra_reag)}")

    response = _session_to_dict(session)
    response["errors"] = errors
    return response


@router.put("/{session_id}/titration")
async def update_titration(session_id: str, body: TitrationUpdate, db: AsyncSession = Depends(get_db)):
    session = await _load_session(session_id, db)
    session.recorded_volume = body.recorded_volume
    await db.flush()
    return _session_to_dict(session)


@router.get("/{session_id}/report")
async def get_report(session_id: str, db: AsyncSession = Depends(get_db)):
    session = await _load_session(session_id, db)
    practice = get_practice(session.practice_id)
    if practice is None:
        raise HTTPException(status_code=404, detail="Practica no encontrada")

    report = generate_report(session, practice)

    for criterion in report["criteria"]:
        db.add(
            PracticeResult(
                session_id=session_id,
                criterion_id=criterion["criterion_id"],
                criterion_label=criterion["criterion_label"],
                score=criterion["score"],
                max_score=criterion["max_score"],
                feedback=criterion["feedback"],
            )
        )

    session.total_score = report["total_score"]
    session.feedback = report["overall_feedback"]
    session.status = "completed"
    session.completed_at = datetime.utcnow()

    if session.student_id and session.section_id:
        section_practice_result = await db.execute(
            select(SectionPractice).where(
                SectionPractice.section_id == session.section_id,
                SectionPractice.practice_id == session.practice_id,
            )
        )
        section_practice = section_practice_result.scalar_one_or_none()
        if section_practice:
            grade_result = await db.execute(
                select(Grade).where(
                    Grade.student_id == session.student_id,
                    Grade.section_practice_id == section_practice.id,
                )
            )
            grade = grade_result.scalar_one_or_none()
            if grade is None:
                grade = Grade(
                    student_id=session.student_id,
                    section_practice_id=section_practice.id,
                )
                db.add(grade)
            grade.auto_score = report["total_score"]
            grade.last_session_id = session.id
            if grade.manual_score is None:
                grade.score = report["total_score"]

    await db.flush()
    return report


@router.get("/{session_id}/titration-curve")
async def get_titration_curve(
    session_id: str,
    format: Literal["svg", "png"] = Query("svg"),
    db: AsyncSession = Depends(get_db),
):
    session = await _load_session(session_id, db)
    try:
        data = generate_titration_curve(session.practice_id, _session_to_dict(session), fmt=format)
        media_type = "image/png" if format == "png" else "image/svg+xml"
        return Response(content=data, media_type=media_type)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
