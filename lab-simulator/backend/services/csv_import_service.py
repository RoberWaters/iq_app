"""
Servicio para importar estudiantes desde archivos CSV.
"""
import csv
import io
from typing import List, Dict, Tuple

from sqlalchemy.ext.asyncio import AsyncSession

from schemas.auth import StudentCreate, CSVImportResult, StudentCreationResult
from services.auth_service import AuthService


class CSVImportService:
    """Servicio para importar estudiantes desde CSV."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.auth_service = AuthService(db)
    
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
        - email (opcional)
        - section (opcional, usa default_section si no está)
        - account_number (requerido)
        
        Args:
            csv_content: Contenido del archivo CSV como string
            default_section: Sección por defecto si no se especifica en el CSV
        
        Returns:
            CSVImportResult con conteo de creados, errores y lista de estudiantes
        """
        created_count = 0
        errors: List[Dict] = []
        students: List[StudentCreationResult] = []
        
        # Parsear CSV
        try:
            csv_file = io.StringIO(csv_content)
            reader = csv.DictReader(csv_file)
            rows = list(reader)
        except Exception as e:
            return CSVImportResult(
                created_count=0,
                errors=[{"row": 0, "error": f"Error al parsear CSV: {str(e)}"}],
                students=[]
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
                
                created_count += 1
                students.append(StudentCreationResult(
                    username=username,
                    email=email,
                    temp_password=generated_password,
                    account_number=account_number
                ))
                
            except Exception as e:
                errors.append({
                    "row": index,
                    "error": f"Error al crear estudiante: {str(e)}"
                })
        
        return CSVImportResult(
            created_count=created_count,
            errors=errors,
            students=students
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
            "juan.perez@email.com",
            "A",
            "2024001"
        ])
        writer.writerow([
            "María",
            "",
            "López",
            "",
            "maria.lopez@email.com",
            "B",
            "2024002"
        ])
        
        return output.getvalue()
