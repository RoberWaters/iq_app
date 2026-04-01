"""
Servicio para importar estudiantes desde archivos Excel (.xls/.xlsx) 
o archivos HTML con extensión .xls (pseudo-Excel del sistema de registro).
"""
import io
import re
from typing import List, Dict, Tuple, Optional

import pandas as pd
from bs4 import BeautifulSoup
from sqlalchemy.ext.asyncio import AsyncSession

from schemas.auth import StudentCreate, CSVImportResult, StudentCreationResult
from services.auth_service import AuthService
from services.email_service import EmailService


class ExcelImportService:
    """Servicio para importar estudiantes desde archivos Excel o HTML."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.auth_service = AuthService(db)
        self.email_service = EmailService()
    
    @staticmethod
    def is_html_file(file_content: bytes) -> bool:
        """
        Detecta si el contenido es HTML (a pesar de tener extensión .xls).
        
        Args:
            file_content: Contenido binario del archivo
            
        Returns:
            True si es HTML, False si es un archivo Excel real
        """
        # Leer los primeros 100 bytes para detectar el tipo
        header = file_content[:100].lower()
        
        # Patrones que indican HTML
        html_patterns = [
            b'<html',
            b'<!doctype html',
            b'<table',
            b'<form',
            b'<div',
            b'<!DOCTYPE HTML',
        ]
        
        for pattern in html_patterns:
            if pattern in header:
                return True
        
        return False
    
    @staticmethod
    def parse_html_table(file_content: bytes) -> pd.DataFrame:
        """
        Parsea una tabla HTML y la convierte en DataFrame.
        
        Args:
            file_content: Contenido HTML binario
            
        Returns:
            DataFrame con los datos de la tabla
        """
        # Decodificar el HTML
        html_content = file_content.decode('utf-8', errors='ignore')
        
        # Parsear con BeautifulSoup
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Buscar la tabla principal (generalmente tiene id como GridView1)
        table = soup.find('table', {'id': 'MainContent_GridView1'})
        
        # Si no se encuentra esa tabla específica, buscar cualquier tabla
        if not table:
            table = soup.find('table')
        
        if not table:
            raise ValueError("No se encontró ninguna tabla en el archivo HTML")
        
        # Extraer encabezados
        headers = []
        header_row = table.find('tr')
        if header_row:
            # Buscar th o td en la primera fila
            th_cells = header_row.find_all('th')
            td_cells = header_row.find_all('td')
            
            cells = th_cells if th_cells else td_cells
            
            for cell in cells:
                # Limpiar el texto del encabezado
                header_text = cell.get_text(strip=True)
                # Decodificar entidades HTML
                header_text = header_text.replace('&#186;', 'º').replace('&nbsp;', ' ')
                headers.append(header_text)
        
        # Extraer filas de datos (ignorar la primera que es el header)
        rows = []
        data_rows = table.find_all('tr')[1:]  # Saltar el header
        
        for row in data_rows:
            cells = row.find_all(['td', 'th'])
            row_data = []
            
            for cell in cells:
                # Obtener texto y limpiar
                cell_text = cell.get_text(strip=True)
                # Decodificar entidades HTML
                cell_text = cell_text.replace('&#186;', 'º').replace('&nbsp;', ' ')
                row_data.append(cell_text)
            
            # Solo agregar filas que tengan datos
            if any(row_data):
                rows.append(row_data)
        
        # Crear DataFrame
        df = pd.DataFrame(rows, columns=headers)
        
        return df
    
    @staticmethod
    def parse_full_name(full_name: str) -> Tuple[str, Optional[str], str, Optional[str]]:
        """
        Separa el nombre completo en sus componentes.
        
        Estrategia:
        - Divide el nombre por espacios
        - Los últimos 2 elementos son los apellidos (first_surname, second_surname)
        - Los elementos restantes son los nombres (first_name, second_name)
        
        Args:
            full_name: Nombre completo del estudiante
            
        Returns:
            Tuple de (first_name, second_name, first_surname, second_surname)
        """
        if not full_name or not full_name.strip():
            return ("", None, "", None)
        
        # Limpiar el nombre (quitar espacios extra, convertir a mayúsculas)
        full_name = full_name.strip().upper()
        
        # Dividir por espacios
        parts = full_name.split()
        
        # Eliminar elementos vacíos
        parts = [p for p in parts if p]
        
        n_parts = len(parts)
        
        if n_parts == 0:
            return ("", None, "", None)
        elif n_parts == 1:
            # Solo un nombre, sin apellidos
            return (parts[0], None, "", None)
        elif n_parts == 2:
            # Un nombre y un apellido
            return (parts[0], None, parts[1], None)
        elif n_parts == 3:
            # Dos nombres y un apellido O un nombre y dos apellidos
            return (parts[0], parts[1], parts[2], None)
        elif n_parts == 4:
            # Dos nombres y dos apellidos (caso más común)
            return (parts[0], parts[1], parts[2], parts[3])
        else:
            # Más de 4 partes: primer nombre, resto como segundo nombre, últimos 2 como apellidos
            first_name = parts[0]
            second_name = " ".join(parts[1:-2])
            first_surname = parts[-2]
            second_surname = parts[-1]
            return (first_name, second_name if second_name else None, first_surname, second_surname)
    
    def read_excel_file(self, file_content: bytes, filename: str) -> pd.DataFrame:
        """
        Lee un archivo Excel (.xls o .xlsx) o HTML con extensión .xls
        y retorna un DataFrame.
        
        Args:
            file_content: Contenido binario del archivo
            filename: Nombre del archivo (para determinar el formato)
            
        Returns:
            DataFrame con los datos
        """
        # Primero verificar si es un archivo HTML disfrazado de Excel
        if self.is_html_file(file_content):
            return self.parse_html_table(file_content)
        
        # Si no es HTML, intentar leer como Excel
        try:
            # Determinar el motor según la extensión
            if filename.lower().endswith('.xlsx'):
                engine = 'openpyxl'
            elif filename.lower().endswith('.xls'):
                engine = 'xlrd'
            else:
                # Intentar detectar automáticamente
                try:
                    return pd.read_excel(io.BytesIO(file_content), engine='openpyxl')
                except:
                    return pd.read_excel(io.BytesIO(file_content), engine='xlrd')
            
            return pd.read_excel(io.BytesIO(file_content), engine=engine)
            
        except Exception as e:
            # Si falla la lectura como Excel, intentar como HTML por si acaso
            try:
                return self.parse_html_table(file_content)
            except:
                raise e
    
    async def import_students_from_excel(
        self,
        file_content: bytes,
        filename: str,
        default_section: str
    ) -> CSVImportResult:
        """
        Importa estudiantes desde un archivo Excel o HTML.
        
        Columnas esperadas:
        - N° (número de fila - se ignora)
        - Cuenta (número de cuenta del estudiante)
        - Nombre Completo (nombre completo a separar)
        - Correo Institucional (email del estudiante)
        - Centro Estudiante (se ignora)
        - Matricula Excepcional (se ignora)
        
        Args:
            file_content: Contenido binario del archivo
            filename: Nombre del archivo
            default_section: Sección por defecto
            
        Returns:
            CSVImportResult con conteo de creados, errores, lista de estudiantes
            y resultados de envío de correos
        """
        created_count = 0
        errors: List[Dict] = []
        students: List[StudentCreationResult] = []
        email_results: List[Dict] = []
        
        try:
            # Leer el archivo (Excel o HTML)
            df = self.read_excel_file(file_content, filename)
            
            # Limpiar nombres de columnas (quitar espacios)
            df.columns = df.columns.str.strip()
            
        except Exception as e:
            return CSVImportResult(
                created_count=0,
                errors=[{"row": 0, "error": f"Error al leer archivo: {str(e)}"}],
                students=[],
                email_results=[]
            )
        
        # Mapeo de columnas esperadas
        column_mapping = self._detect_columns(df)
        
        if not column_mapping:
            return CSVImportResult(
                created_count=0,
                errors=[{"row": 0, "error": "No se pudieron detectar las columnas requeridas. Asegúrese de que el archivo tenga las columnas: Cuenta, Nombre Completo, Correo Institucional"}],
                students=[],
                email_results=[]
            )
        
        # Procesar cada fila
        for index, row in df.iterrows():
            row_num = index + 2  # +2 porque el Excel/HTML empieza en 1 y hay header
            
            try:
                # Obtener valores de las columnas mapeadas
                account_number = str(row.get(column_mapping.get('cuenta', ''), '')).strip()
                full_name = str(row.get(column_mapping.get('nombre', ''), '')).strip()
                email = str(row.get(column_mapping.get('correo', ''), '')).strip()
                
                # Validar campos requeridos
                if not account_number or account_number.lower() in ['nan', 'none', '']:
                    errors.append({
                        "row": row_num,
                        "error": "Campo 'Cuenta' es requerido"
                    })
                    continue
                
                if not full_name or full_name.lower() in ['nan', 'none', '']:
                    errors.append({
                        "row": row_num,
                        "error": "Campo 'Nombre Completo' es requerido"
                    })
                    continue
                
                # Separar el nombre completo
                first_name, second_name, first_surname, second_surname = self.parse_full_name(full_name)
                
                # Validar que se obtuvo al menos un nombre y un apellido
                if not first_name:
                    errors.append({
                        "row": row_num,
                        "error": f"No se pudo extraer el nombre de: '{full_name}'"
                    })
                    continue
                
                if not first_surname:
                    errors.append({
                        "row": row_num,
                        "error": f"No se pudo extraer el apellido de: '{full_name}'"
                    })
                    continue
                
                # Limpiar email si es inválido
                if email.lower() in ['nan', 'none', '']:
                    email = None
                
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
                    section=default_section,
                    account_number=account_number,
                    generic_password=temp_password
                )
                
                # Crear estudiante
                user, username, generated_password = await self.auth_service.create_student(
                    student_data
                )
                
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
                    student_name=full_name.title(),
                    username=username,
                    password=generated_password,
                    account_number=account_number
                )
                email_result['account_number'] = account_number
                email_result['email'] = email
                email_results.append(email_result)
                
            except Exception as e:
                errors.append({
                    "row": row_num,
                    "error": f"Error al crear estudiante: {str(e)}"
                })
        
        return CSVImportResult(
            created_count=created_count,
            errors=errors,
            students=students,
            email_results=email_results
        )
    
    def _detect_columns(self, df: pd.DataFrame) -> Optional[Dict[str, str]]:
        """
        Detecta las columnas relevantes en el DataFrame.
        
        Args:
            df: DataFrame con los datos
            
        Returns:
            Diccionario con el mapeo de columnas o None si no se detectan
        """
        columns = df.columns.tolist()
        mapping = {}
        
        # Buscar columna de cuenta
        for col in columns:
            col_lower = col.lower()
            if 'cuenta' in col_lower or 'account' in col_lower:
                mapping['cuenta'] = col
                break
        
        # Buscar columna de nombre
        for col in columns:
            col_lower = col.lower()
            if 'nombre completo' in col_lower or 'nombre' in col_lower:
                mapping['nombre'] = col
                break
        
        # Buscar columna de correo
        for col in columns:
            col_lower = col.lower()
            if 'correo' in col_lower or 'email' in col_lower:
                mapping['correo'] = col
                break
        
        # Verificar que tenemos las columnas mínimas necesarias
        if 'cuenta' in mapping and 'nombre' in mapping:
            return mapping
        
        return None
    
    async def generate_excel_template(self) -> bytes:
        """
        Genera una plantilla Excel de ejemplo.
        
        Returns:
            Contenido binario del archivo Excel
        """
        # Crear datos de ejemplo
        data = {
            'N°': [1, 2, 3],
            'Cuenta': ['2024001', '2024002', '2024003'],
            'Nombre Completo': [
                'JUAN CARLOS PEREZ GARCIA',
                'MARIA CELESTE LOPEZ FUNEZ',
                'PEDRO ANTONIO RODRIGUEZ MARTINEZ'
            ],
            'Correo Institucional': [
                'juan.perez@universidad.edu',
                'maria.lopez@universidad.edu',
                'pedro.rodriguez@universidad.edu'
            ],
            'Centro Estudiante': [
                'CIUDAD UNIVERSITARIA',
                'CIUDAD UNIVERSITARIA',
                'CIUDAD UNIVERSITARIA'
            ],
            'Matricula Excepcional': ['NO', 'NO', 'NO']
        }
        
        df = pd.DataFrame(data)
        
        # Guardar en buffer
        output = io.BytesIO()
        df.to_excel(output, index=False, engine='openpyxl')
        output.seek(0)
        
        return output.getvalue()