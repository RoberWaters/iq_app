from datetime import UTC, datetime, timedelta
from pathlib import Path

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
from models.user import StudentProfile, TeacherProfile, User, UserRole
from services.auth_service import AuthService


CREDENTIALS_PATH = Path(__file__).resolve().parent / "demo_user_credentials.txt"

DEMO_USERS = {
    "teachers": [
        {
            "username": "demo.docente",
            "password": "admin1234",
            "email": "docente.demo@universidad.edu",
            "first_name": "Daniela",
            "second_name": "Maria",
            "first_surname": "Castro",
            "second_surname": "Lopez",
            "account_number": "DOC-0001",
            "must_change_password": False,
        },
        {
            "username": "lab.teacher",
            "password": "Teacher1234",
            "email": "lab.teacher@universidad.edu",
            "first_name": "Ricardo",
            "second_name": "Jose",
            "first_surname": "Mendoza",
            "second_surname": "Pineda",
            "account_number": "DOC-0002",
            "must_change_password": False,
        },
    ],
    "students": [
        {
            "username": "andrea.flores",
            "password": "Alumno1234",
            "email": "andrea.flores@universidad.edu",
            "section": "DEMO-IQ-01",
            "account_number": "2024001",
            "first_name": "Andrea",
            "second_name": None,
            "first_surname": "Flores",
            "second_surname": None,
        },
        {
            "username": "luis.mejia",
            "password": "Alumno1234",
            "email": "luis.mejia@universidad.edu",
            "section": "DEMO-IQ-01",
            "account_number": "2024002",
            "first_name": "Luis",
            "second_name": None,
            "first_surname": "Mejia",
            "second_surname": None,
        },
        {
            "username": "maria.caceres",
            "password": "Alumno1234",
            "email": "maria.caceres@universidad.edu",
            "section": "DEMO-IQ-01",
            "account_number": "2024003",
            "first_name": "Maria",
            "second_name": None,
            "first_surname": "Caceres",
            "second_surname": None,
        },
        {
            "username": "carlos.pineda",
            "password": "Alumno1234",
            "email": "carlos.pineda@universidad.edu",
            "section": "DEMO-IQ-02",
            "account_number": "2024101",
            "first_name": "Carlos",
            "second_name": None,
            "first_surname": "Pineda",
            "second_surname": None,
        },
        {
            "username": "sofia.rivera",
            "password": "Alumno1234",
            "email": "sofia.rivera@universidad.edu",
            "section": "DEMO-IQ-02",
            "account_number": "2024102",
            "first_name": "Sofia",
            "second_name": None,
            "first_surname": "Rivera",
            "second_surname": None,
        },
        {
            "username": "ana.lopez",
            "password": "Ana12345",
            "email": "ana.lopez@universidad.edu",
            "section": "TEST-LOGIN",
            "account_number": "1001",
            "first_name": "Ana",
            "second_name": None,
            "first_surname": "Lopez",
            "second_surname": None,
        },
        {
            "username": "demo.alumno",
            "password": "Alumno1234",
            "email": "demo.alumno@universidad.edu",
            "section": "TEST-LOGIN",
            "account_number": "1002",
            "first_name": "Mario",
            "second_name": None,
            "first_surname": "Suazo",
            "second_surname": None,
        },
    ],
}

DEMO_SECTIONS = [
    {
        "code": "DEMO-IQ-01",
        "status": "habilitada",
        "students": [
            {"name": "Andrea Flores", "student_code": 2024001},
            {"name": "Luis Mejia", "student_code": 2024002},
            {"name": "Maria Caceres", "student_code": 2024003},
        ],
        "practices": [
            {"practice_id": 4, "unit": "Unidad 2", "open_offset": -10, "close_offset": 7, "status": "active"},
            {"practice_id": 5, "unit": "Unidad 2", "open_offset": -4, "close_offset": 10, "status": "active"},
        ],
    },
    {
        "code": "DEMO-IQ-02",
        "status": "programada",
        "students": [
            {"name": "Carlos Pineda", "student_code": 2024101},
            {"name": "Sofia Rivera", "student_code": 2024102},
        ],
        "practices": [
            {"practice_id": 2, "unit": "Unidad 1", "open_offset": -14, "close_offset": -2, "status": "closed"},
            {"practice_id": 3, "unit": "Unidad 1", "open_offset": -6, "close_offset": 4, "status": "active"},
        ],
    },
    {
        "code": "TEST-LOGIN",
        "status": "habilitada",
        "students": [
            {"name": "Ana Lopez", "student_code": 1001},
            {"name": "Mario Suazo", "student_code": 1002},
        ],
        "practices": [
            {"practice_id": 4, "unit": "Unidad Demo", "open_offset": -3, "close_offset": 20, "status": "active"},
            {"practice_id": 5, "unit": "Unidad Demo", "open_offset": 0, "close_offset": 25, "status": "blocked"},
        ],
    },
]


def _fmt_date(offset_days: int) -> str:
    return (datetime.now(UTC) + timedelta(days=offset_days)).date().isoformat()


def _all_demo_usernames() -> list[str]:
    return [item["username"] for item in DEMO_USERS["teachers"]] + [item["username"] for item in DEMO_USERS["students"]]


def _all_demo_teacher_accounts() -> list[str]:
    return [item["account_number"] for item in DEMO_USERS["teachers"]]


def _all_demo_student_accounts() -> list[str]:
    return [item["account_number"] for item in DEMO_USERS["students"]]


async def _delete_existing_demo_data(session) -> None:
    result = await session.execute(select(Section).where(Section.code.in_([payload["code"] for payload in DEMO_SECTIONS])))
    demo_sections = result.scalars().all()
    section_ids = [section.id for section in demo_sections]

    if section_ids:
        sessions_result = await session.execute(select(PracticeSession).where(PracticeSession.section_id.in_(section_ids)))
        for practice_session in sessions_result.scalars().all():
            results_result = await session.execute(select(PracticeResult).where(PracticeResult.session_id == practice_session.id))
            for practice_result in results_result.scalars().all():
                await session.delete(practice_result)
            await session.delete(practice_session)

        for section in demo_sections:
            await session.delete(section)

    users_result = await session.execute(select(User).where(User.username.in_(_all_demo_usernames())))
    for user in users_result.scalars().all():
        await session.delete(user)

    teacher_profiles_result = await session.execute(
        select(TeacherProfile).where(TeacherProfile.account_number.in_(_all_demo_teacher_accounts()))
    )
    for profile in teacher_profiles_result.scalars().all():
        user = await session.get(User, profile.user_id)
        if user:
            await session.delete(user)

    student_profiles_result = await session.execute(
        select(StudentProfile).where(StudentProfile.account_number.in_(_all_demo_student_accounts()))
    )
    for profile in student_profiles_result.scalars().all():
        user = await session.get(User, profile.user_id)
        if user:
            await session.delete(user)

    await session.flush()


async def _create_auth_users(session) -> None:
    for teacher_payload in DEMO_USERS["teachers"]:
        user = User(
            username=teacher_payload["username"],
            email=teacher_payload["email"],
            hashed_password=AuthService.get_password_hash(teacher_payload["password"]),
            role=UserRole.TEACHER,
            must_change_password=teacher_payload["must_change_password"],
            is_active=True,
        )
        session.add(user)
        await session.flush()
        session.add(
            TeacherProfile(
                user_id=user.id,
                first_name=teacher_payload["first_name"],
                second_name=teacher_payload["second_name"],
                first_surname=teacher_payload["first_surname"],
                second_surname=teacher_payload["second_surname"],
                account_number=teacher_payload["account_number"],
            )
        )

    for student_payload in DEMO_USERS["students"]:
        user = User(
            username=student_payload["username"],
            email=student_payload["email"],
            hashed_password=AuthService.get_password_hash(student_payload["password"]),
            role=UserRole.STUDENT,
            must_change_password=False,
            is_active=True,
        )
        session.add(user)
        await session.flush()
        session.add(
            StudentProfile(
                user_id=user.id,
                section=student_payload["section"],
                account_number=student_payload["account_number"],
                first_name=student_payload["first_name"],
                second_name=student_payload["second_name"],
                first_surname=student_payload["first_surname"],
                second_surname=student_payload["second_surname"],
            )
        )

    await session.flush()


async def _create_section(session, payload: dict) -> tuple[Section, list[Student], list[SectionPractice]]:
    section = Section(
        code=payload["code"],
        status=payload["status"],
        student_count=len(payload["students"]),
    )
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

    session.add(
        Grade(
            student_id=student.id,
            section_practice_id=practice.id,
            score=manual_score if manual_score is not None else total_score,
            auto_score=total_score,
            manual_score=manual_score,
            last_session_id=practice_session.id,
        )
    )


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


async def _populate_demo_sessions(session, created: dict) -> None:
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

    test_login = created["TEST-LOGIN"]
    await _create_completed_session(
        session,
        student=test_login["students"][1001],
        section=test_login["section"],
        practice=test_login["practices"][4],
        started_at=datetime.now(UTC) - timedelta(days=1),
        measured_value=10.0,
        measured_unit="mL",
        expected_volume=16.93,
        recorded_volume=16.95,
        student_calculation=12.94,
        correct_calculation=12.93,
        percent_error=0.08,
        total_score=97.0,
        feedback="Cuenta demo lista para pruebas de login y panel docente.",
    )
    await _create_in_progress_session(
        session,
        student=test_login["students"][1002],
        section=test_login["section"],
        practice=test_login["practices"][5],
        started_at=datetime.now(UTC) - timedelta(hours=3),
        current_stage=3,
        measured_value=100.0,
        measured_unit="mL",
        expected_volume=6.50,
    )


def _write_credentials_file() -> None:
    lines = [
        "USUARIOS DEMO - SIMULADOR DE QUIMICA",
        "=" * 44,
        "",
        "DOCENTES",
        "-" * 8,
    ]

    for teacher in DEMO_USERS["teachers"]:
        lines.extend(
            [
                f"Usuario: {teacher['username']}",
                f"Clave:   {teacher['password']}",
                f"Rol:     docente",
                f"Nombre:  {teacher['first_name']} {teacher['first_surname']}",
                "",
            ]
        )

    lines.extend(["ALUMNOS", "-" * 7])
    for student in DEMO_USERS["students"]:
        full_name = " ".join(
            part
            for part in [
                student["first_name"],
                student["second_name"],
                student["first_surname"],
                student["second_surname"],
            ]
            if part
        )
        lines.extend(
            [
                f"Usuario: {student['username']}",
                f"Clave:   {student['password']}",
                f"Rol:     alumno",
                f"Seccion: {student['section']}",
                f"Cuenta:  {student['account_number']}",
                f"Nombre:  {full_name}",
                "",
            ]
        )

    CREDENTIALS_PATH.write_text("\n".join(lines), encoding="utf-8")


async def seed_demo_data() -> None:
    await init_db()
    async with async_session() as session:
        await _delete_existing_demo_data(session)
        await _create_auth_users(session)

        created = {}
        for section_payload in DEMO_SECTIONS:
            section, students, practices = await _create_section(session, section_payload)
            created[section.code] = {
                "section": section,
                "students": {student.student_code: student for student in students},
                "practices": {practice.practice_id: practice for practice in practices},
            }

        await _populate_demo_sessions(session, created)
        await session.commit()

    _write_credentials_file()


if __name__ == "__main__":
    import asyncio

    asyncio.run(seed_demo_data())
    print("Demo data seeded successfully.")
    print(f"Credentials file written to: {CREDENTIALS_PATH}")
