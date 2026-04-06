from datetime import UTC, datetime, timedelta

import data.practices  # noqa: F401
from sqlalchemy import select

from data.registry import get_practice
from database import async_session, init_db
from models.grade import Grade
from models.result import PracticeResult
from models.section import Section
from models.section_practice import SectionPractice
from models.session import PracticeSession
from models.student import Student


DEMO_SECTIONS = [
    {
        "code": "DEMO-IQ-01",
        "status": "open",
        "students": [
            {"name": "Andrea Flores", "student_code": 2024001},
            {"name": "Luis Mejia", "student_code": 2024002},
            {"name": "Maria Caceres", "student_code": 2024003},
        ],
        "practices": [
            {"practice_id": 4, "unit": "Unidad 2", "open_offset": -10, "close_offset": 7, "status": "open"},
            {"practice_id": 5, "unit": "Unidad 2", "open_offset": -4, "close_offset": 10, "status": "open"},
        ],
    },
    {
        "code": "DEMO-IQ-02",
        "status": "scheduled",
        "students": [
            {"name": "Carlos Pineda", "student_code": 2024101},
            {"name": "Sofia Rivera", "student_code": 2024102},
        ],
        "practices": [
            {"practice_id": 2, "unit": "Unidad 1", "open_offset": -14, "close_offset": -2, "status": "closed"},
            {"practice_id": 3, "unit": "Unidad 1", "open_offset": -6, "close_offset": 4, "status": "open"},
        ],
    },
]


def _fmt_date(offset_days: int) -> str:
    return (datetime.now(UTC) + timedelta(days=offset_days)).date().isoformat()


async def _delete_existing_demo_data(session) -> None:
    result = await session.execute(select(Section).where(Section.code.like("DEMO-%")))
    demo_sections = result.scalars().all()
    if not demo_sections:
        return

    section_ids = [section.id for section in demo_sections]
    sessions_result = await session.execute(
        select(PracticeSession).where(PracticeSession.section_id.in_(section_ids))
    )
    demo_sessions = sessions_result.scalars().all()
    session_ids = [item.id for item in demo_sessions]
    for practice_session in demo_sessions:
        results_result = await session.execute(
            select(PracticeResult).where(PracticeResult.session_id == practice_session.id)
        )
        for practice_result in results_result.scalars().all():
            await session.delete(practice_result)
        await session.delete(practice_session)

    for section in demo_sections:
        await session.delete(section)

    await session.flush()


async def _create_section(session, payload: dict) -> tuple[Section, list[Student], list[SectionPractice]]:
    section = Section(code=payload["code"], status=payload["status"])
    session.add(section)
    await session.flush()

    students = []
    for student_payload in payload["students"]:
        student = Student(section_id=section.id, **student_payload)
        session.add(student)
        students.append(student)
    await session.flush()

    practices = []
    for practice_payload in payload["practices"]:
        practice_config = get_practice(practice_payload["practice_id"])
        practice = SectionPractice(
            section_id=section.id,
            practice_id=practice_payload["practice_id"],
            name=practice_config["name"],
            unit=practice_payload["unit"],
            open_date=_fmt_date(practice_payload["open_offset"]),
            close_date=_fmt_date(practice_payload["close_offset"]),
            status=practice_payload["status"],
        )
        session.add(practice)
        practices.append(practice)
    await session.flush()
    return section, students, practices


async def _create_completed_session(
    session,
    *,
    student: Student,
    section: Section,
    practice: SectionPractice,
    started_at: datetime,
    measured_value: float,
    measured_unit: str,
    expected_volume: float,
    recorded_volume: float,
    student_calculation: float,
    correct_calculation: float,
    percent_error: float,
    total_score: float,
    feedback: str,
    manual_score: float | None = None,
) -> None:
    practice_session = PracticeSession(
        student_name=student.name,
        student_id=student.id,
        student_code=str(student.student_code),
        section_id=section.id,
        section_code=section.code,
        practice_id=practice.practice_id,
        started_at=started_at,
        completed_at=started_at + timedelta(minutes=42),
        current_stage=9,
        status="completed",
        measured_value=measured_value,
        measured_unit=measured_unit,
        expected_volume=expected_volume,
        recorded_volume=recorded_volume,
        student_calculation=student_calculation,
        correct_calculation=correct_calculation,
        percent_error=percent_error,
        materials_correct=True,
        assembly_correct=True,
        total_score=total_score,
        feedback=feedback,
    )
    session.add(practice_session)
    await session.flush()

    grade = Grade(
        student_id=student.id,
        section_practice_id=practice.id,
        score=manual_score if manual_score is not None else total_score,
        auto_score=total_score,
        manual_score=manual_score,
        last_session_id=practice_session.id,
    )
    session.add(grade)


async def _create_in_progress_session(
    session,
    *,
    student: Student,
    section: Section,
    practice: SectionPractice,
    started_at: datetime,
    current_stage: int,
    measured_value: float,
    measured_unit: str,
    expected_volume: float,
) -> None:
    session.add(
        PracticeSession(
            student_name=student.name,
            student_id=student.id,
            student_code=str(student.student_code),
            section_id=section.id,
            section_code=section.code,
            practice_id=practice.practice_id,
            started_at=started_at,
            current_stage=current_stage,
            status="in_progress",
            measured_value=measured_value,
            measured_unit=measured_unit,
            expected_volume=expected_volume,
            materials_correct=True,
            assembly_correct=False,
        )
    )


async def seed_demo_data() -> None:
    await init_db()
    async with async_session() as session:
        await _delete_existing_demo_data(session)

        created = {}
        for section_payload in DEMO_SECTIONS:
            section, students, practices = await _create_section(session, section_payload)
            created[section.code] = {
                "section": section,
                "students": {student.student_code: student for student in students},
                "practices": {practice.practice_id: practice for practice in practices},
            }

        demo_1 = created["DEMO-IQ-01"]
        await _create_completed_session(
            session,
            student=demo_1["students"][2024001],
            section=demo_1["section"],
            practice=demo_1["practices"][4],
            started_at=datetime.now(UTC) - timedelta(days=5),
            measured_value=10.0,
            measured_unit="mL",
            expected_volume=16.93,
            recorded_volume=16.88,
            student_calculation=12.90,
            correct_calculation=12.93,
            percent_error=0.24,
            total_score=96.0,
            feedback="Excelente desempeno. Identifico el punto final con precision.",
        )
        await _create_completed_session(
            session,
            student=demo_1["students"][2024001],
            section=demo_1["section"],
            practice=demo_1["practices"][5],
            started_at=datetime.now(UTC) - timedelta(days=2),
            measured_value=100.0,
            measured_unit="mL",
            expected_volume=6.5,
            recorded_volume=6.62,
            student_calculation=66.2,
            correct_calculation=66.27,
            percent_error=1.1,
            total_score=88.0,
            feedback="Buen desempeno general; mejorar ajuste fino del punto final.",
            manual_score=91.0,
        )
        await _create_in_progress_session(
            session,
            student=demo_1["students"][2024002],
            section=demo_1["section"],
            practice=demo_1["practices"][4],
            started_at=datetime.now(UTC) - timedelta(hours=6),
            current_stage=5,
            measured_value=10.0,
            measured_unit="mL",
            expected_volume=16.93,
        )

        demo_2 = created["DEMO-IQ-02"]
        await _create_completed_session(
            session,
            student=demo_2["students"][2024101],
            section=demo_2["section"],
            practice=demo_2["practices"][2],
            started_at=datetime.now(UTC) - timedelta(days=8),
            measured_value=1.01,
            measured_unit="g",
            expected_volume=17.94,
            recorded_volume=17.82,
            student_calculation=198.5,
            correct_calculation=198.1,
            percent_error=0.7,
            total_score=93.0,
            feedback="Resultados consistentes y buena interpretacion del indice de saponificacion.",
        )
        await _create_in_progress_session(
            session,
            student=demo_2["students"][2024102],
            section=demo_2["section"],
            practice=demo_2["practices"][3],
            started_at=datetime.now(UTC) - timedelta(hours=20),
            current_stage=4,
            measured_value=10.0,
            measured_unit="mL",
            expected_volume=17.11,
        )

        await session.commit()


if __name__ == "__main__":
    import asyncio

    asyncio.run(seed_demo_data())
    print("Demo data seeded successfully.")
