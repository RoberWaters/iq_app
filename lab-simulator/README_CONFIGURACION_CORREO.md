# Configuración del Envío de Correos - Simulatoral de Química

# 1 Crear el Primer Docente

Antes de poder usar el sistema, debe crear al menos un docente:

```bash
cd lab-simulator/backend
python -m backend.scripts.create_teacher
```

Siga las instrucciones interactivas para crear el docente. El script generará automáticamente un username.

## Resumen de Cambios

El sistema ahora envía automáticamente las credenciales de acceso a cada estudiante por correo electrónico después de importar el CSV. Esto elimina la necesidad de que el docente envíe manualmente las credenciales.

## Archivos Modificados/Creados

### Backend
1. **`services/email_service.py`** (NUEVO) - Servicio para enviar correos electrónicos
2. **`services/csv_import_service.py`** - Modificado para enviar correos automáticamente
3. **`config.py`** - Agregada configuración SMTP
4. **`schemas/auth.py`** - Agregado `EmailResult` al esquema de respuesta
5. **`routers/teacher.py`** - Eliminado endpoint de exportación CSV (ya no es necesario)
6. **`requirements.txt`** - Agregada dependencia `aiosmtplib`

### Frontend
1. **`TeacherDashboard.jsx`** - Actualizado para mostrar estado de envío de correos

## Configuración del Servidor SMTP

### Opción 1: Gmail (Recomendado para pruebas)

1. Ve a tu cuenta de Google → Seguridad → Verificación en dos pasos (activar)
2. Genera una "Contraseña de aplicación" para el correo
3. Configura las variables de entorno:

```bash
export SMTP_HOST="smtp.gmail.com"
export SMTP_PORT="587"
export SMTP_USERNAME="tu_correo@gmail.com"
export SMTP_PASSWORD="tu_contraseña_de_aplicacion"
export SMTP_USE_TLS="false"
export FROM_EMAIL="noreply@simulatoral.edu"
export FROM_NAME="Simulatoral de Química"
```

### Opción 2: Outlook/Hotmail

```bash
export SMTP_HOST="smtp.office365.com"
export SMTP_PORT="587"
export SMTP_USERNAME="tu_correo@outlook.com"
export SMTP_PASSWORD="tu_contraseña"
export SMTP_USE_TLS="false"
export FROM_EMAIL="noreply@simulatoral.edu"
export FROM_NAME="Simulatoral de Química"
```

### Opción 3: Servidor SMTP Institucional

Consulta con tu departamento de TI los valores correctos para:
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USE_TLS` (true/false)

## Formato del CSV

El archivo CSV debe incluir la columna `email` para que el sistema pueda enviar las credenciales:

```csv
first_name,second_name,first_surname,second_surname,email,section,account_number
Juan,Carlos,Pérez,García,juan.perez@universidad.edu,A,2024001
María,,López,,maria.lopez@universidad.edu,B,2024002
```

### Columnas Requeridas:
- `first_name` - Primer nombre
- `first_surname` - Primer apellido
- `account_number` - Número de cuenta

### Columnas Opcionales:
- `second_name` - Segundo nombre
- `second_surname` - Segundo apellido
- `email` - Correo electrónico (recomendado para envío automático)
- `section` - Sección (si no se especifica, usa la seleccionada en el formulario)

## Flujo de Trabajo

1. El docente sube el archivo CSV otorgado por Registro, para prueba de este simulador el csv esta conformado por 
las columnas first_name, second_name, first_surname, second_surname, email, section, account_number.
2. El sistema:
   - Crea las cuentas de usuario
   - Genera usernames y contraseñas
   - **Envía automáticamente las credenciales a cada estudiante haciendo  uso de un correo creado exclusivamente para ello**
5. El docente ve el resumen con el estado de envío de cada correo

## Seguridad

- Cada correo se envía de forma individual para mantener la confidencialidad
- Las contraseñas temporales se generan aleatoriamente
- Los estudiantes deben cambiar su contraseña en el primer inicio de sesión
- Los correos incluyen instrucciones de seguridad

## Solución de Problemas

### Los correos no se envían
1. Verifica la configuración SMTP en las variables de entorno
2. Revisa los logs del servidor para errores específicos
3. Asegúrate de que el puerto SMTP no esté bloqueado por el firewall

### Estudiantes sin correo
- El sistema mostrará un mensaje indicando que no se pudo enviar el correo
- El docente puede ver la contraseña temporal en la tabla de resultados
- Se recomienda contactar al estudiante directamente

### Gmail bloquea el acceso
- Usa una "Contraseña de aplicación" en lugar de tu contraseña normal
- Verifica que la "Verificación en dos pasos" esté activada
- Revisa la bandeja de entrada para alertas de seguridad

## Instalación de Dependencias

```bash
pip install -r requirements.txt
```

La nueva dependencia `aiosmtplib` permite el envío asíncrono de correos sin bloquear el servidor.
