"""
Router para endpoints específicos de docentes.
"""
import io
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from dependencies.auth import require_teacher
from models.user import User
from services.csv_import_service import CSVImportService

router = APIRouter(prefix="/teacher", tags=["Teacher"])


@router.post("/import-students")
async def import_students(
    file: UploadFile = File(...),
    default_section: str = Form("A"),
    current_user: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db)
):
    """
    Importa estudiantes desde un archivo CSV y envía las credenciales
    automáticamente a cada estudiante por correo electrónico.
    
    El CSV debe incluir las columnas:
    - first_name (requerido)
    - first_surname (requerido)
    - account_number (requerido)
    - email (recomendado para envío automático)
    - second_name, second_surname, section (opcionales)
    
    Solo accesible para usuarios con rol de docente.
    """
    # Validar que sea un archivo CSV
    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo debe ser un CSV"
        )
    
    try:
        # Leer contenido del archivo
        content = await file.read()
        csv_content = content.decode('utf-8')
        
        # Importar estudiantes y enviar correos
        csv_service = CSVImportService(db)
        result = await csv_service.import_students_from_csv(csv_content, default_section)
        
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al procesar el archivo: {str(e)}"
        )


@router.get("/students-template")
async def download_students_template(
    current_user: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db)
):
    """
    Descarga la plantilla CSV para importar estudiantes.
    La plantilla incluye el campo 'email' para el envío automático de credenciales.
    Solo accesible para usuarios con rol de docente.
    """
    try:
        csv_service = CSVImportService(db)
        template_content = await csv_service.generate_csv_template()
        
        # Crear respuesta con el archivo
        output = io.StringIO(template_content)
        
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode('utf-8')),
            media_type="text/csv",
            headers={
                "Content-Disposition": "attachment; filename=students_template.csv"
            }
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al generar la plantilla: {str(e)}"
        )
