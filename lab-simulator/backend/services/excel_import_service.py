"""
Importacion de estudiantes desde Excel real o tablas HTML exportadas como .xls.
"""
import io
import secrets
from typing import Optional

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from models.section import Section
from models.student import Student
from schemas.auth import StudentCreate
from services.auth_service import AuthService
from services.email_service import EmailService


class ExcelImportService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.auth_service = AuthService(db)
        self.email_service = EmailService()

    def read_table(self, file_content: bytes, filename: str):
        import pandas as pd

        if self._is_html(file_content):
            return self._parse_html_table(file_content)
        if filename.lower().endswith(".xlsx"):
            return pd.read_excel(io.BytesIO(file_content), engine="openpyxl")
        if filename.lower().endswith(".xls"):
            return pd.read_excel(io.BytesIO(file_content), engine="xlrd")
        raise ValueError("Formato no soportado")

    async def import_to_section(self, *, file_content: bytes, filename: str, section: Section) -> dict:
        created = []
        errors = []
        email_results = []

        try:
            dataframe = self.read_table(file_content, filename)
            dataframe.columns = [str(column).strip() for column in dataframe.columns]
        except Exception as exc:
            return {
                "created_count": 0,
                "error_count": 1,
                "students": [],
                "errors": [{"fila": 0, "error": f"Error al leer archivo: {exc}"}],
                "email_results": [],
            }

        columns = self._detect_columns(dataframe)
        if not columns:
            return {
                "created_count": 0,
                "error_count": 1,
                "students": [],
                "errors": [{"fila": 0, "error": "No se detectaron las columnas Cuenta y Nombre Completo"}],
                "email_results": [],
            }

        for index, row in dataframe.iterrows():
            row_num = index + 2
            account_number = str(row.get(columns["account"], "")).strip()
            full_name = str(row.get(columns["name"], "")).strip()
            email = str(row.get(columns["email"], "")).strip() if columns.get("email") else ""

            if not account_number or account_number.lower() in {"nan", "none"}:
                errors.append({"fila": row_num, "error": "Campo Cuenta es requerido"})
                continue
            if not full_name or full_name.lower() in {"nan", "none"}:
                errors.append({"fila": row_num, "error": "Campo Nombre Completo es requerido"})
                continue

            first_name, second_name, first_surname, second_surname = self._split_full_name(full_name)
            if not first_name or not first_surname:
                errors.append({"fila": row_num, "error": f"No se pudo separar el nombre '{full_name}'"})
                continue

            temp_password = secrets.token_urlsafe(8)
            normalized_email = None if not email or email.lower() in {"nan", "none"} else email
            student_name = " ".join(part for part in [first_name, second_name, first_surname, second_surname] if part)

            try:
                async with self.db.begin_nested():
                    auth_payload = StudentCreate(
                        first_name=first_name,
                        second_name=second_name,
                        first_surname=first_surname,
                        second_surname=second_surname,
                        email=normalized_email,
                        section=section.code,
                        account_number=account_number,
                        generic_password=temp_password,
                    )
                    _, username, generated_password = await self.auth_service.create_student(
                        auth_payload,
                        autocommit=False,
                    )
                    student_code = self._derive_student_code(account_number, row_num)

                    duplicate = await self.db.execute(
                        select(Student).where(
                            Student.section_id == section.id,
                            Student.student_code == student_code,
                        )
                    )
                    if duplicate.scalar_one_or_none():
                        raise ValueError("Ya existe un estudiante con ese codigo en la seccion")

                    self.db.add(Student(name=student_name, student_code=student_code, section_id=section.id))
                    await self.db.flush()

                created.append(
                    {
                        "nombre": student_name,
                        "numero_cuenta": account_number,
                        "usuario": username,
                        "contrasena": generated_password,
                        "email": normalized_email or "",
                    }
                )

                email_result = await self.email_service.send_credentials_email(
                    to_email=normalized_email,
                    student_name=student_name.title(),
                    username=username,
                    password=generated_password,
                    account_number=account_number,
                )
                email_result["account_number"] = account_number
                email_result["email"] = normalized_email or ""
                email_results.append(email_result)
            except IntegrityError as exc:
                message = str(exc.orig)
                if "email" in message:
                    error_message = f"El email '{normalized_email}' ya esta registrado"
                elif "account_number" in message:
                    error_message = f"El numero de cuenta '{account_number}' ya esta registrado"
                elif "username" in message:
                    error_message = f"El usuario generado para '{student_name}' ya existe"
                else:
                    error_message = "Registro duplicado"
                errors.append({"fila": row_num, "error": error_message})
            except Exception as exc:
                errors.append({"fila": row_num, "error": str(exc)})

        return {
            "created_count": len(created),
            "error_count": len(errors),
            "students": created,
            "errors": errors,
            "email_results": email_results,
        }

    async def generate_excel_template(self) -> bytes:
        import pandas as pd

        dataframe = pd.DataFrame(
            {
                "N°": [1, 2],
                "Cuenta": ["2024001", "2024002"],
                "Nombre Completo": ["JUAN CARLOS PEREZ GARCIA", "MARIA ELENA LOPEZ FUNEZ"],
                "Correo Institucional": ["juan.perez@universidad.edu", "maria.lopez@universidad.edu"],
                "Centro Estudiante": ["CIUDAD UNIVERSITARIA", "CIUDAD UNIVERSITARIA"],
                "Matricula Excepcional": ["NO", "NO"],
            }
        )
        output = io.BytesIO()
        dataframe.to_excel(output, index=False, engine="openpyxl")
        output.seek(0)
        return output.getvalue()

    def _is_html(self, file_content: bytes) -> bool:
        header = file_content[:256].lower()
        return any(token in header for token in (b"<html", b"<!doctype html", b"<table", b"<div"))

    def _parse_html_table(self, file_content: bytes):
        from bs4 import BeautifulSoup
        import pandas as pd

        soup = BeautifulSoup(file_content.decode("utf-8", errors="ignore"), "html.parser")
        table = soup.find("table", {"id": "MainContent_GridView1"}) or soup.find("table")
        if not table:
            raise ValueError("No se encontro una tabla en el archivo")
        rows = []
        for row in table.find_all("tr"):
            cells = row.find_all(["th", "td"])
            values = [cell.get_text(strip=True).replace("&#186;", "º").replace("&nbsp;", " ") for cell in cells]
            if any(values):
                rows.append(values)
        if len(rows) < 2:
            raise ValueError("La tabla no contiene suficientes filas")
        return pd.DataFrame(rows[1:], columns=rows[0])

    def _detect_columns(self, dataframe) -> Optional[dict]:
        mapping = {}
        for column in dataframe.columns:
            lowered = str(column).lower()
            if "cuenta" in lowered and "account" not in mapping:
                mapping["account"] = column
            elif "nombre completo" in lowered or ("nombre" in lowered and "name" not in mapping):
                mapping["name"] = column
            elif "correo" in lowered or "email" in lowered:
                mapping["email"] = column
        return mapping if "account" in mapping and "name" in mapping else None

    def _split_full_name(self, full_name: str) -> tuple[str, Optional[str], str, Optional[str]]:
        parts = [part for part in full_name.strip().upper().split() if part]
        if len(parts) == 0:
            return "", None, "", None
        if len(parts) == 1:
            return parts[0], None, "", None
        if len(parts) == 2:
            return parts[0], None, parts[1], None
        if len(parts) == 3:
            return parts[0], parts[1], parts[2], None
        if len(parts) == 4:
            return parts[0], parts[1], parts[2], parts[3]
        return parts[0], " ".join(parts[1:-2]) or None, parts[-2], parts[-1]

    def _derive_student_code(self, account_number: str, fallback: int) -> int:
        digits = "".join(filter(str.isdigit, account_number))
        try:
            return int(digits) if digits else fallback
        except ValueError:
            return fallback
