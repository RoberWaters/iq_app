"""
Servicio para importar estudiantes desde archivos CSV.
Compatible con el formato de Shirley y con el formato viejo por seccion.
"""
import csv
import io
import secrets
from typing import Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from models.student import Student
from schemas.auth import CSVImportResult, StudentCreate, StudentCreationResult
from services.auth_service import AuthService
from services.email_service import EmailService


class CSVImportService:
    """Servicio para importar estudiantes desde CSV."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.auth_service = AuthService(db)
        self.email_service = EmailService()

    async def import_students_from_csv(
        self,
        csv_content: str,
        default_section: str,
    ) -> CSVImportResult:
        created_count = 0
        errors: List[Dict] = []
        students: List[StudentCreationResult] = []
        email_results: List[Dict] = []

        try:
            rows = list(csv.DictReader(io.StringIO(csv_content)))
        except Exception as exc:
            return CSVImportResult(
                created_count=0,
                errors=[{"row": 0, "error": f"Error al parsear CSV: {exc}"}],
                students=[],
                email_results=[],
            )

        for index, row in enumerate(rows, start=2):
            try:
                normalized = self._normalize_row(row)
                first_name = normalized["first_name"]
                first_surname = normalized["first_surname"]
                account_number = normalized["account_number"]

                if not first_name:
                    errors.append({"row": index, "error": "Campo 'first_name' o 'nombre' es requerido"})
                    continue
                if not first_surname:
                    errors.append({"row": index, "error": "Campo 'first_surname' o 'apellido' es requerido"})
                    continue
                if not account_number:
                    errors.append({"row": index, "error": "Campo 'account_number' o 'numero_cuenta' es requerido"})
                    continue

                second_name = normalized["second_name"]
                second_surname = normalized["second_surname"]
                email = normalized["email"]
                section = normalized["section"] or default_section
                temp_password = secrets.token_urlsafe(8)

                student_data = StudentCreate(
                    first_name=first_name,
                    second_name=second_name,
                    first_surname=first_surname,
                    second_surname=second_surname,
                    email=email,
                    section=section,
                    account_number=account_number,
                    generic_password=temp_password,
                )

                _, username, generated_password = await self.auth_service.create_student(student_data)

                created_count += 1
                students.append(
                    StudentCreationResult(
                        username=username,
                        email=email,
                        temp_password=generated_password,
                        account_number=account_number,
                    )
                )

                email_result = await self.email_service.send_credentials_email(
                    to_email=email,
                    student_name=self._build_full_name(first_name, second_name, first_surname, second_surname),
                    username=username,
                    password=generated_password,
                    account_number=account_number,
                )
                email_result["account_number"] = account_number
                email_result["email"] = email
                email_results.append(email_result)
            except Exception as exc:
                errors.append({"row": index, "error": f"Error al crear estudiante: {exc}"})

        return CSVImportResult(
            created_count=created_count,
            errors=errors,
            students=students,
            email_results=email_results,
        )

    async def import_students_to_section(
        self,
        csv_content: str,
        section_code: str,
        section_id: str,
    ) -> dict:
        created = []
        errors = []
        email_results = []

        try:
            rows = list(csv.DictReader(io.StringIO(csv_content)))
        except Exception as exc:
            return {
                "created_count": 0,
                "error_count": 1,
                "students": [],
                "errors": [{"fila": 0, "error": f"Error al parsear CSV: {exc}"}],
                "email_results": [],
            }

        for index, row in enumerate(rows, start=2):
            email = None
            account_number = ""
            try:
                normalized = self._normalize_row(row)
                first_name = normalized["first_name"]
                first_surname = normalized["first_surname"]
                second_name = normalized["second_name"]
                second_surname = normalized["second_surname"]
                account_number = normalized["account_number"]
                email = normalized["email"]

                if not first_name or not first_surname or not account_number:
                    errors.append(
                        {
                            "fila": index,
                            "error": "El CSV requiere first_name y first_surname o nombre y apellido, ademas de account_number o numero_cuenta",
                        }
                    )
                    continue

                temp_password = secrets.token_urlsafe(8)
                full_name = self._build_full_name(first_name, second_name, first_surname, second_surname)

                async with self.db.begin_nested():
                    auth_payload = StudentCreate(
                        first_name=first_name,
                        second_name=second_name,
                        first_surname=first_surname,
                        second_surname=second_surname,
                        email=email,
                        section=section_code,
                        account_number=account_number,
                        generic_password=temp_password,
                    )
                    _, username, generated_password = await self.auth_service.create_student(
                        auth_payload,
                        autocommit=False,
                    )
                    student_code = self._derive_student_code(account_number, index)

                    duplicate = await self.db.execute(
                        select(Student).where(
                            Student.section_id == section_id,
                            Student.student_code == student_code,
                        )
                    )
                    if duplicate.scalar_one_or_none():
                        raise ValueError("Ya existe un estudiante con ese codigo en la seccion")

                    self.db.add(Student(name=full_name, student_code=student_code, section_id=section_id))
                    await self.db.flush()

                created.append(
                    {
                        "nombre": full_name,
                        "numero_cuenta": account_number,
                        "usuario": username,
                        "contrasena": generated_password,
                        "email": email or "",
                    }
                )

                email_result = await self.email_service.send_credentials_email(
                    to_email=email,
                    student_name=full_name,
                    username=username,
                    password=generated_password,
                    account_number=account_number,
                )
                email_result["account_number"] = account_number
                email_result["email"] = email or ""
                email_results.append(email_result)
            except IntegrityError as exc:
                message = str(exc.orig)
                if "email" in message:
                    error_message = f"El email '{email}' ya esta registrado"
                elif "account_number" in message:
                    error_message = f"El numero de cuenta '{account_number}' ya esta registrado"
                elif "username" in message:
                    error_message = "El usuario generado ya existe"
                else:
                    error_message = "Registro duplicado"
                errors.append({"fila": index, "error": error_message})
            except Exception as exc:
                errors.append({"fila": index, "error": str(exc)})

        return {
            "created_count": len(created),
            "error_count": len(errors),
            "students": created,
            "errors": errors,
            "email_results": email_results,
        }

    async def generate_csv_template(self) -> str:
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(
            [
                "first_name",
                "second_name",
                "first_surname",
                "second_surname",
                "email",
                "section",
                "account_number",
            ]
        )
        writer.writerow(
            [
                "Juan",
                "Carlos",
                "Perez",
                "Garcia",
                "juan.perez@universidad.edu",
                "A",
                "2024001",
            ]
        )
        writer.writerow(
            [
                "Maria",
                "",
                "Lopez",
                "",
                "maria.lopez@universidad.edu",
                "B",
                "2024002",
            ]
        )
        return output.getvalue()

    def _normalize_row(self, row: dict) -> dict:
        def get_value(*keys: str) -> Optional[str]:
            for key in keys:
                value = row.get(key)
                if value is not None and str(value).strip():
                    return str(value).strip()
            return None

        return {
            "first_name": get_value("first_name", "nombre") or "",
            "second_name": get_value("second_name"),
            "first_surname": get_value("first_surname", "apellido") or "",
            "second_surname": get_value("second_surname"),
            "account_number": get_value("account_number", "numero_cuenta") or "",
            "email": get_value("email"),
            "section": get_value("section"),
        }

    def _build_full_name(
        self,
        first_name: str,
        second_name: Optional[str],
        first_surname: str,
        second_surname: Optional[str],
    ) -> str:
        return " ".join(part for part in [first_name, second_name, first_surname, second_surname] if part)

    def _derive_student_code(self, account_number: str, fallback: int) -> int:
        digits = "".join(filter(str.isdigit, account_number))
        try:
            return int(digits) if digits else fallback
        except ValueError:
            return fallback
