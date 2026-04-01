"""
Router para endpoints específicos de docentes.
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from dependencies.auth import require_teacher
from models.user import User
from services.excel_import_service import ExcelImportService

router = APIRouter(prefix="/teacher", tags=["Teacher"])


@router.post("/import-students")
async def import_students(
    file: UploadFile = File(...),
    default_section: str = Form("A"),
    current_user: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db)
):
    """
    Importa estudiantes desde un archivo Excel (.xls o .xlsx) y envía las credenciales
    automáticamente a cada estudiante por correo electrónico.
    
    El Excel debe incluir las columnas:
    - Cuenta (número de cuenta del estudiante)
    - Nombre Completo (nombre completo del estudiante)
    - Correo Institucional (correo para envío automático - recomendado)
    
    Columnas opcionales que se ignoran:
    - N° (número de fila)
    - Centro Estudiante
    - Matricula Excepcional
    
    El sistema separará automáticamente el nombre completo en:
    - Primer nombre
    - Segundo nombre (si existe)
    - Primer apellido
    - Segundo apellido (si existe)
    
    Solo accesible para usuarios con rol de docente.
    """
    # Validar que sea un archivo Excel
    filename = file.filename.lower()
    if not (filename.endswith('.xlsx') or filename.endswith('.xls')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo debe ser un Excel (.xlsx o .xls)"
        )
    
    try:
        # Leer contenido del archivo
        content = await file.read()
        
        # Importar estudiantes y enviar correos
        excel_service = ExcelImportService(db)
        result = await excel_service.import_students_from_excel(
            file_content=content,
            filename=file.filename,
            default_section=default_section
        )
        
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
    Descarga la plantilla Excel para importar estudiantes.
    La plantilla incluye el formato esperado del archivo.
    Solo accesible para usuarios con rol de docente.
    """
    try:
        excel_service = ExcelImportService(db)
        template_content = await excel_service.generate_excel_template()
        
        return StreamingResponse(
            iter([template_content]),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": "attachment; filename=students_template.xlsx"
            }
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al generar la plantilla: {str(e)}"
        )
