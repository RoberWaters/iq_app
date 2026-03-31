"""
Servicio para enviar correos electrónicos a estudiantes.
"""
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Dict, Optional
from config import settings


class EmailService:
    """Servicio para enviar correos electrónicos."""
    
    def __init__(self):
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_username = settings.SMTP_USERNAME
        self.smtp_password = settings.SMTP_PASSWORD
        self.smtp_use_tls = settings.SMTP_USE_TLS
        self.from_email = settings.FROM_EMAIL
        self.from_name = settings.FROM_NAME
    
    async def send_credentials_email(
        self,
        to_email: str,
        student_name: str,
        username: str,
        password: str,
        account_number: str
    ) -> Dict:
        """
        Envía un correo con las credenciales de acceso al estudiante.
        
        Args:
            to_email: Correo electrónico del estudiante
            student_name: Nombre completo del estudiante
            username: Nombre de usuario generado
            password: Contraseña temporal generada
            account_number: Número de cuenta del estudiante
            
        Returns:
            Dict con el resultado del envío (success, message)
        """
        try:
            # Validar que el correo no esté vacío
            if not to_email:
                return {
                    "success": False,
                    "message": "El estudiante no tiene correo electrónico registrado"
                }
            
            # Crear el mensaje
            msg = MIMEMultipart('alternative')
            msg['Subject'] = 'Credenciales de Acceso - Simulatoral de Química'
            msg['From'] = f"{self.from_name} <{self.from_email}>"
            msg['To'] = to_email
            
            # Versión HTML del correo
            html_content = self._get_credentials_html_template(
                student_name=student_name,
                username=username,
                password=password,
                account_number=account_number
            )
            
            # Versión texto plano del correo
            text_content = self._get_credentials_text_template(
                student_name=student_name,
                username=username,
                password=password,
                account_number=account_number
            )
            
            # Adjuntar ambas versiones
            msg.attach(MIMEText(text_content, 'plain', 'utf-8'))
            msg.attach(MIMEText(html_content, 'html', 'utf-8'))
            
            # Enviar el correo
            await self._send_email(to_email, msg)
            
            return {
                "success": True,
                "message": f"Correo enviado exitosamente a {to_email}"
            }
            
        except Exception as e:
            return {
                "success": False,
                "message": f"Error al enviar correo: {str(e)}"
            }
    
    async def send_credentials_batch(
        self,
        students_data: List[Dict]
    ) -> List[Dict]:
        """
        Envía correos con credenciales a múltiples estudiantes.
        
        Args:
            students_data: Lista de diccionarios con datos de estudiantes
                Cada diccionario debe contener:
                - email: Correo del estudiante
                - student_name: Nombre completo
                - username: Usuario generado
                - temp_password: Contraseña temporal
                - account_number: Número de cuenta
                
        Returns:
            Lista de resultados de envío para cada estudiante
        """
        results = []
        
        for student in students_data:
            result = await self.send_credentials_email(
                to_email=student.get('email', ''),
                student_name=student.get('student_name', 'Estudiante'),
                username=student.get('username', ''),
                password=student.get('temp_password', ''),
                account_number=student.get('account_number', '')
            )
            result['account_number'] = student.get('account_number', '')
            result['email'] = student.get('email', '')
            results.append(result)
        
        return results
    
    async def _send_email(self, to_email: str, msg: MIMEMultipart) -> None:
        """
        Envía un correo electrónico usando SMTP.
        
        Args:
            to_email: Correo destinatario
            msg: Mensaje MIME a enviar
        """
        smtp = aiosmtplib.SMTP(
            hostname=self.smtp_host,
            port=self.smtp_port,
            use_tls=self.smtp_use_tls
        )
        
        await smtp.connect()
        
        # Si no usamos TLS directo, intentamos STARTTLS
        if not self.smtp_use_tls:
            try:
                await smtp.starttls()
            except Exception:
                # Si falla STARTTLS, continuamos sin encriptación
                pass
        
        # Autenticar si hay credenciales
        if self.smtp_username and self.smtp_password:
            await smtp.login(self.smtp_username, self.smtp_password)
        
        # Enviar el correo
        await smtp.send_message(msg)
        await smtp.quit()
    
    def _get_credentials_html_template(
        self,
        student_name: str,
        username: str,
        password: str,
        account_number: str
    ) -> str:
        """Genera la plantilla HTML para el correo de credenciales."""
        return f"""
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Credenciales de Acceso</title>
            <style>
                body {{
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background-color: #f5f5f5;
                    margin: 0;
                    padding: 20px;
                }}
                .container {{
                    max-width: 600px;
                    margin: 0 auto;
                    background-color: #ffffff;
                    border-radius: 8px;
                    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                    overflow: hidden;
                }}
                .header {{
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 30px;
                    text-align: center;
                }}
                .header h1 {{
                    margin: 0;
                    font-size: 24px;
                }}
                .content {{
                    padding: 30px;
                }}
                .welcome {{
                    font-size: 18px;
                    color: #333;
                    margin-bottom: 20px;
                }}
                .credentials-box {{
                    background-color: #f8f9fa;
                    border-left: 4px solid #667eea;
                    padding: 20px;
                    margin: 20px 0;
                    border-radius: 4px;
                }}
                .credential-item {{
                    margin: 10px 0;
                    font-size: 16px;
                }}
                .credential-label {{
                    font-weight: bold;
                    color: #555;
                    display: inline-block;
                    width: 150px;
                }}
                .credential-value {{
                    color: #333;
                    font-family: monospace;
                    background-color: #e9ecef;
                    padding: 4px 8px;
                    border-radius: 4px;
                }}
                .warning {{
                    background-color: #fff3cd;
                    border: 1px solid #ffc107;
                    border-radius: 4px;
                    padding: 15px;
                    margin: 20px 0;
                    color: #856404;
                }}
                .warning strong {{
                    color: #856404;
                }}
                .footer {{
                    text-align: center;
                    padding: 20px;
                    color: #666;
                    font-size: 14px;
                    border-top: 1px solid #eee;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🧪 Simulatoral de Química</h1>
                </div>
                <div class="content">
                    <p class="welcome">Hola <strong>{student_name}</strong>,</p>
                    
                    <p>Se han generado tus credenciales de acceso para el <strong>Simulatoral de Química</strong>.</p>
                    
                    <div class="credentials-box">
                        <div class="credential-item">
                            <span class="credential-label">Número de Cuenta:</span>
                            <span class="credential-value">{account_number}</span>
                        </div>
                        <div class="credential-item">
                            <span class="credential-label">Usuario:</span>
                            <span class="credential-value">{username}</span>
                        </div>
                        <div class="credential-item">
                            <span class="credential-label">Contraseña:</span>
                            <span class="credential-value">{password}</span>
                        </div>
                    </div>
                    
                    <div class="warning">
                        <strong>⚠️ Importante:</strong>
                        <ul>
                            <li>Al iniciar sesión por primera vez, <strong>deberás cambiar tu contraseña</strong>.</li>
                            <li>No compartas estas credenciales con nadie.</li>
                            <li>Si tienes problemas para acceder, contacta a tu docente.</li>
                        </ul>
                    </div>
                    
                    <p>¡Bienvenido al sistema!</p>
                </div>
                <div class="footer">
                    <p>Este es un correo automático del Simulatoral de Química.<br>
                    Por favor no respondas a este mensaje.</p>
                </div>
            </div>
        </body>
        </html>
        """
    
    def _get_credentials_text_template(
        self,
        student_name: str,
        username: str,
        password: str,
        account_number: str
    ) -> str:
        """Genera la plantilla de texto plano para el correo de credenciales."""
        return f"""
Simulatoral de Química - Credenciales de Acceso

Hola {student_name},

Se han generado tus credenciales de acceso para el Simulatoral de Química.

DATOS DE ACCESO:
================
Número de Cuenta: {account_number}
Usuario: {username}
Contraseña: {password}

IMPORTANTE:
===========
- Al iniciar sesión por primera vez, deberás cambiar tu contraseña.
- No compartas estas credenciales con nadie.
- Si tienes problemas para acceder, contacta a tu docente.

¡Bienvenido al sistema!

---
Este es un correo automático del Simulatoral de Química.
Por favor no respondas a este mensaje.
        """


# Instancia global del servicio
email_service = EmailService()
