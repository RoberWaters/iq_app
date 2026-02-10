from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

import data.practices  # noqa: F401
from database import get_db
from models.session import PracticeSession
from schemas.calculation import (
    CalculationValidateRequest, CalculationValidateResponse,
    ExpectedVolumeRequest, ExpectedVolumeResponse,
)
from services.calculation_engine import validate_student_calculation
from services.titration_engine import get_expected_volume

router = APIRouter(prefix="/calculations", tags=["calculations"])


@router.post("/validate", response_model=CalculationValidateResponse)
async def validate_calculation(body: CalculationValidateRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PracticeSession).where(PracticeSession.id == body.session_id)
    )
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    if session.recorded_volume is None:
        raise HTTPException(status_code=400, detail="No se ha registrado lectura de bureta")
    if session.measured_value is None:
        raise HTTPException(status_code=400, detail="No se ha registrado medición de muestra")

    try:
        calc_result = validate_student_calculation(
            practice_id=session.practice_id,
            recorded_volume=session.recorded_volume,
            measured_value=session.measured_value,
            student_result=body.student_result,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Update session
    session.student_calculation = body.student_result
    session.correct_calculation = calc_result["correct_result"]
    session.percent_error = calc_result["percent_error"]
    await db.flush()

    return calc_result


@router.post("/expected-volume", response_model=ExpectedVolumeResponse)
async def calculate_expected(body: ExpectedVolumeRequest):
    try:
        result = get_expected_volume(body.practice_id, body.measured_value, body.sample_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return result
