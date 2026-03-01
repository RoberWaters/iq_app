from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Literal
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

import data.practices  # noqa: F401
from database import get_db
from models.session import PracticeSession
from models.result import PracticeResult
from data.registry import get_practice
from schemas.session import (
    SessionCreate, SessionResponse, StageUpdate,
    MeasurementUpdate, MaterialsUpdate, TitrationUpdate,
)
from services.titration_engine import get_expected_volume
from services.report_generator import generate_report
from services.titration_curve import generate_titration_curve

router = APIRouter(prefix="/sessions", tags=["sessions"])


def _session_to_dict(s):
    return {
        "id": s.id,
        "student_name": s.student_name,
        "practice_id": s.practice_id,
        "started_at": s.started_at,
        "completed_at": s.completed_at,
        "current_stage": s.current_stage,
        "status": s.status,
        "sample_id": s.sample_id,
        "measured_value": s.measured_value,
        "measured_unit": s.measured_unit,
        "expected_volume": s.expected_volume,
        "recorded_volume": s.recorded_volume,
        "student_calculation": s.student_calculation,
        "correct_calculation": s.correct_calculation,
        "percent_error": s.percent_error,
        "materials_correct": s.materials_correct,
        "assembly_correct": s.assembly_correct,
        "total_score": s.total_score,
        "feedback": s.feedback,
    }


@router.post("")
async def create_session(body: SessionCreate, db: AsyncSession = Depends(get_db)):
    practice = get_practice(body.practice_id)
    if practice is None:
        raise HTTPException(status_code=404, detail="Práctica no encontrada")

    # Calculate default expected volume for practices with fixed measurement
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
        student_name=body.student_name,
        practice_id=body.practice_id,
        expected_volume=expected_vol,
    )
    db.add(session)
    await db.flush()
    return _session_to_dict(session)


@router.get("/{session_id}")
async def get_session(session_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PracticeSession).where(PracticeSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    return _session_to_dict(session)


@router.put("/{session_id}/stage")
async def update_stage(session_id: str, body: StageUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PracticeSession).where(PracticeSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    session.current_stage = body.stage

    if body.data:
        if "assembly_correct" in body.data:
            session.assembly_correct = body.data["assembly_correct"]

    await db.flush()
    return _session_to_dict(session)


@router.put("/{session_id}/measurement")
async def update_measurement(session_id: str, body: MeasurementUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PracticeSession).where(PracticeSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    session.measured_value = body.value
    session.measured_unit = body.unit

    # Recalculate expected volume
    try:
        vol_result = get_expected_volume(session.practice_id, body.value)
        session.expected_volume = vol_result["expected_volume"]
    except Exception:
        pass

    await db.flush()
    return _session_to_dict(session)


@router.put("/{session_id}/materials")
async def update_materials(session_id: str, body: MaterialsUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PracticeSession).where(PracticeSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    practice = get_practice(session.practice_id)
    if practice is None:
        raise HTTPException(status_code=404, detail="Práctica no encontrada")

    required_inst = set(practice.get("requiredInstruments", []))
    required_reag = set(practice.get("requiredReagents", []))
    selected_inst = set(body.instruments)
    selected_reag = set(body.reagents)

    inst_correct = selected_inst == required_inst
    reag_correct = selected_reag == required_reag
    all_correct = inst_correct and reag_correct

    session.materials_correct = all_correct
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

    resp = _session_to_dict(session)
    resp["errors"] = errors
    return resp


@router.put("/{session_id}/titration")
async def update_titration(session_id: str, body: TitrationUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PracticeSession).where(PracticeSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    session.recorded_volume = body.recorded_volume
    await db.flush()
    return _session_to_dict(session)


@router.get("/{session_id}/report")
async def get_report(session_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PracticeSession).where(PracticeSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    practice = get_practice(session.practice_id)
    if practice is None:
        raise HTTPException(status_code=404, detail="Práctica no encontrada")

    report = generate_report(session, practice)

    # Save results to DB
    for criterion in report["criteria"]:
        pr = PracticeResult(
            session_id=session_id,
            criterion_id=criterion["criterion_id"],
            criterion_label=criterion["criterion_label"],
            score=criterion["score"],
            max_score=criterion["max_score"],
            feedback=criterion["feedback"],
        )
        db.add(pr)

    session.total_score = report["total_score"]
    session.feedback = report["overall_feedback"]
    session.status = "completed"
    session.completed_at = datetime.utcnow()

    await db.flush()
    return report


@router.get("/{session_id}/titration-curve")
async def get_titration_curve(
    session_id: str,
    format: Literal['svg', 'png'] = Query('svg'),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PracticeSession).where(PracticeSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    try:
        data = generate_titration_curve(session.practice_id, _session_to_dict(session), fmt=format)
        media_type = 'image/png' if format == 'png' else 'image/svg+xml'
        return Response(content=data, media_type=media_type)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
