"""
Servicio para importar estudiantes desde archivos CSV.
"""
import csv
import io
from typing import List, Dict, Tuple

from sqlalchemy.ext.asyncio import AsyncSession

from schemas.auth import StudentCreate, CSVImportResult, StudentCreationResult
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
        default_section: str
    ) -> CSVImportResult:
        """
        Importa estudiantes desde contenido CSV.
        
        Columnas esperadas del CSV:
        - first_name (requerido)
        - second_name (opcional)
        - first_surname (requerido)
        - second_surname (opcional)
        - email (opcional pero recomendado para envío de credenciales)
        - section (opcional, usa default_section si no está)
        - account_number (requerido)
        
        Args:
            csv_content: Contenido del archivo CSV como string
            default_section: Sección por defecto si no se especifica en el CSV
        
        Returns:
            CSVImportResult con conteo de creados, errores, lista de estudiantes
            y resultados de envío de correos
        """
        created_count = 0
        errors: List[Dict] = []
        students: List[StudentCreationResult] = []
        email_results: List[Dict] = []
        
        # Parsear CSV
        try:
            csv_file = io.StringIO(csv_content)
            reader = csv.DictReader(csv_file)
            rows = list(reader)
        except Exception as e:
            return CSVImportResult(
                created_count=0,
                errors=[{"row": 0, "error": f"Error al parsear CSV: {str(e)}"}],
                students=[],
                email_results=[]
            )
        
        # Procesar cada fila
        for index, row in enumerate(rows, start=2):  # start=2 porque la fila 1 es header
            try:
                # Validar campos requeridos
                first_name = row.get("first_name", "").strip()
                first_surname = row.get("first_surname", "").strip()
                account_number = row.get("account_number", "").strip()
                
                if not first_name:
                    errors.append({
                        "row": index,
                        "error": "Campo 'first_name' es requerido"
                    })
                    continue
                
                if not first_surname:
                    errors.append({
                        "row": index,
                        "error": "Campo 'first_surname' es requerido"
                    })
                    continue
                
                if not account_number:
                    errors.append({
                        "row": index,
                        "error": "Campo 'account_number' es requerido"
                    })
                    continue
                
                # Obtener valores opcionales
                second_name = row.get("second_name", "").strip() or None
                second_surname = row.get("second_surname", "").strip() or None
                email = row.get("email", "").strip() or None
                section = row.get("section", "").strip() or default_section
                
                # Generar contraseña temporal
                import secrets
                temp_password = secrets.token_urlsafe(8)
                
                # Crear datos del estudiante
                student_data = StudentCreate(
                    first_name=first_name,
                    second_name=second_name,
                    first_surname=first_surname,
                    second_surname=second_surname,
                    email=email,
                    section=section,
                    account_number=account_number,
                    generic_password=temp_password
                )
                
                # Crear estudiante
                user, username, generated_password = await self.auth_service.create_student(
                    student_data
                )
                
                # Construir nombre completo para el correo
                full_name = f"{first_name}"
                if second_name:
                    full_name += f" {second_name}"
                full_name += f" {first_surname}"
                if second_surname:
                    full_name += f" {second_surname}"
                
                created_count += 1
                student_result = StudentCreationResult(
                    username=username,
                    email=email,
                    temp_password=generated_password,
                    account_number=account_number
                )
                students.append(student_result)
                
                # Enviar correo con credenciales (de forma individual)
                email_result = await self.email_service.send_credentials_email(
                    to_email=email,
                    student_name=full_name,
                    username=username,
                    password=generated_password,
                    account_number=account_number
                )
                email_result['account_number'] = account_number
                email_result['email'] = email
                email_results.append(email_result)
                
            except Exception as e:
                errors.append({
                    "row": index,
                    "error": f"Error al crear estudiante: {str(e)}"
                })
        
        return CSVImportResult(
            created_count=created_count,
            errors=errors,
            students=students,
            email_results=email_results
        )
    
    async def generate_csv_template(self) -> str:
        """
        Genera una plantilla CSV de ejemplo.
        
        Returns:
            String con el contenido CSV de la plantilla
        """
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Escribir header
        writer.writerow([
            "first_name",
            "second_name",
            "first_surname",
            "second_surname",
            "email",
            "section",
            "account_number"
        ])
        
        # Escribir filas de ejemplo
        writer.writerow([
            "Juan",
            "Carlos",
            "Pérez",
            "García",
            "juan.perez@universidad.edu",
            "A",
            "2024001"
        ])
        writer.writerow([
            "María",
            "",
            "López",
            "",
            "maria.lopez@universidad.edu",
            "B",
            "2024002"
        ])
        
        return output.getvalue()
