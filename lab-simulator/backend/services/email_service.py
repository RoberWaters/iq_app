"""
Servicio para enviar correos de credenciales a estudiantes.
"""
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from config import settings


class EmailService:
    """Envio SMTP simple para credenciales de estudiantes."""

    def __init__(self):
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_username = settings.SMTP_USERNAME
        self.smtp_password = settings.SMTP_PASSWORD
        self.smtp_use_tls = settings.SMTP_USE_TLS
        self.from_email = settings.FROM_EMAIL
        self.from_name = settings.FROM_NAME

    def is_configured(self) -> bool:
        return bool(self.smtp_host and self.smtp_port and self.smtp_username and self.smtp_password)

    async def send_credentials_email(
        self,
        *,
        to_email: str | None,
        student_name: str,
        username: str,
        password: str,
        account_number: str,
    ) -> dict:
        if not to_email:
            return {"success": False, "message": "El estudiante no tiene correo registrado"}
        if not self.is_configured():
            return {"success": False, "message": "SMTP no configurado en el servidor"}

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = "Credenciales de acceso - Simulador de Quimica"
            msg["From"] = f"{self.from_name} <{self.from_email}>"
            msg["To"] = to_email

            msg.attach(
                MIMEText(
                    self._text_template(
                        student_name=student_name,
                        username=username,
                        password=password,
                        account_number=account_number,
                    ),
                    "plain",
                    "utf-8",
                )
            )
            msg.attach(
                MIMEText(
                    self._html_template(
                        student_name=student_name,
                        username=username,
                        password=password,
                        account_number=account_number,
                    ),
                    "html",
                    "utf-8",
                )
            )

            await self._send_message(msg)
            return {"success": True, "message": f"Correo enviado a {to_email}"}
        except Exception as exc:  # pragma: no cover
            return {"success": False, "message": f"Error al enviar correo: {exc}"}

    async def _send_message(self, msg: MIMEMultipart) -> None:
        import aiosmtplib

        smtp = aiosmtplib.SMTP(
            hostname=self.smtp_host,
            port=self.smtp_port,
            use_tls=self.smtp_use_tls,
        )
        await smtp.connect()
        if not self.smtp_use_tls:
            try:
                await smtp.starttls()
            except Exception:
                pass
        await smtp.login(self.smtp_username, self.smtp_password)
        await smtp.send_message(msg)
        await smtp.quit()

    def _text_template(self, *, student_name: str, username: str, password: str, account_number: str) -> str:
        return (
            "Simulador de Quimica - Credenciales de acceso\n\n"
            f"Hola {student_name},\n\n"
            "Se han generado tus credenciales para ingresar al sistema.\n\n"
            f"Numero de cuenta: {account_number}\n"
            f"Usuario: {username}\n"
            f"Clave temporal: {password}\n\n"
            "Al iniciar sesion por primera vez deberas cambiar tu clave.\n"
            "No compartas estas credenciales.\n"
        )

    def _html_template(self, *, student_name: str, username: str, password: str, account_number: str) -> str:
        return f"""
        <html>
          <body style="font-family:Segoe UI,Arial,sans-serif;background:#f5f7fb;padding:24px;">
            <div style="max-width:620px;margin:0 auto;background:white;border-radius:12px;padding:28px;border:1px solid #dbe3ef;">
              <h1 style="margin-top:0;color:#17324d;">Simulador de Quimica</h1>
              <p>Hola <strong>{student_name}</strong>,</p>
              <p>Se han generado tus credenciales para ingresar al laboratorio virtual.</p>
              <div style="background:#f7fafc;border-left:4px solid #2563eb;padding:16px;border-radius:8px;">
                <p><strong>Numero de cuenta:</strong> {account_number}</p>
                <p><strong>Usuario:</strong> <code>{username}</code></p>
                <p><strong>Clave temporal:</strong> <code>{password}</code></p>
              </div>
              <p style="margin-top:18px;color:#92400e;background:#fffbeb;padding:12px;border-radius:8px;border:1px solid #fcd34d;">
                Al iniciar sesion por primera vez deberas cambiar tu clave.
              </p>
            </div>
          </body>
        </html>
        """
