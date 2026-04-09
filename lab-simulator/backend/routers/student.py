import data.practices  # noqa: F401

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from data.registry import get_practice
from database import get_db
from dependencies.auth import require_student
from models.grade import Grade
from models.section import Section
from models.section_practice import SectionPractice
from models.session import PracticeSession
from models.student import Student
from models.user import User

router = APIRouter(prefix="/student", tags=["student"])


def _full_name(profile) -> str:
    parts = [
        getattr(profile, "first_name", None),
        getattr(profile, "second_name", None),
        getattr(profile, "first_surname", None),
        getattr(profile, "second_surname", None),
    ]
    return " ".join(p for p in parts if p) or ""


def _practice_name(practice_id: int) -> str:
    cfg = get_practice(practice_id) or {}
    return cfg.get("name") or f"Practica {practice_id}"


def _practice_category(practice_id: int) -> str:
    cfg = get_practice(practice_id) or {}
    return cfg.get("category", "")


@router.get("/dashboard")
async def student_dashboard(
    current_user: User = Depends(require_student),
    db: AsyncSession = Depends(get_db),
):
    profile = current_user.student_profile
    if not profile:
        raise HTTPException(status_code=404, detail="Perfil de estudiante no encontrado")

    # Resolve section
    section_result = await db.execute(
        select(Section)
        .where(Section.code == profile.section)
        .options(selectinload(Section.practices))
    )
    section = section_result.scalar_one_or_none()

    student_name = _full_name(profile) or current_user.username

    if not section:
        return {
            "student_name": student_name,
            "section_code": profile.section,
            "student_id": None,
            "section_id": None,
            "practices": [],
            "average_score": None,
            "scored_count": 0,
            "total_practices": 0,
        }

    # Resolve Student record via account_number → student_code
    student = None
    try:
        student_code_int = int(profile.account_number)
        student_result = await db.execute(
            select(Student)
            .where(
                Student.section_id == section.id,
                Student.student_code == student_code_int,
            )
            .options(selectinload(Student.grades))
        )
        student = student_result.scalar_one_or_none()
    except (TypeError, ValueError):
        pass

    # Get all section practices (ordered by creation)
    sp_result = await db.execute(
        select(SectionPractice)
        .where(SectionPractice.section_id == section.id)
        .order_by(SectionPractice.created_at)
    )
    section_practices = sp_result.scalars().all()

    # Get all sessions for this student in this section
    sessions_by_practice: dict[int, list[PracticeSession]] = {}
    if student:
        sessions_result = await db.execute(
            select(PracticeSession)
            .where(
                PracticeSession.section_id == section.id,
                PracticeSession.student_id == student.id,
            )
            .order_by(PracticeSession.started_at.desc())
        )
        for s in sessions_result.scalars().all():
            sessions_by_practice.setdefault(s.practice_id, []).append(s)

    # Build grade lookup
    grades_by_sp: dict[str, Grade] = {}
    if student:
        for g in student.grades:
            grades_by_sp[g.section_practice_id] = g

    practice_items = []
    for sp in section_practices:
        grade = grades_by_sp.get(sp.id)
        practice_sessions = sessions_by_practice.get(sp.practice_id, [])
        latest = practice_sessions[0] if practice_sessions else None

        # First in_progress session (latest first, so pick first match)
        active = next((s for s in practice_sessions if s.status == "in_progress"), None)

        auto_score = None
        if grade and grade.auto_score is not None:
            auto_score = grade.auto_score
        elif latest and latest.status == "completed" and latest.total_score is not None:
            auto_score = latest.total_score

        manual_score = grade.manual_score if grade else None
        final_score = manual_score if manual_score is not None else auto_score

        if manual_score is not None:
            student_status = "calificada"
        elif latest and latest.status == "completed":
            student_status = "completada"
        elif active:
            student_status = "en_progreso"
        else:
            student_status = "pendiente"

        practice_items.append({
            "section_practice_id": sp.id,
            "practice_id": sp.practice_id,
            "practice_name": _practice_name(sp.practice_id),
            "category": _practice_category(sp.practice_id),
            "practice_status": sp.status,
            "student_status": student_status,
            "auto_score": auto_score,
            "manual_score": manual_score,
            "final_score": final_score,
            "active_session_id": active.id if active else None,
            "active_session_stage": active.current_stage if active else None,
            "last_session_id": latest.id if latest else None,
            "started_at": latest.started_at.isoformat() if latest else None,
            "completed_at": latest.completed_at.isoformat() if latest and latest.completed_at else None,
        })

    scored = [p["final_score"] for p in practice_items if p["final_score"] is not None]
    average_score = round(sum(scored) / len(scored), 1) if scored else None

    return {
        "student_name": student_name,
        "section_code": profile.section,
        "student_id": student.id if student else None,
        "section_id": section.id,
        "practices": practice_items,
        "average_score": average_score,
        "scored_count": len(scored),
        "total_practices": len(practice_items),
    }
