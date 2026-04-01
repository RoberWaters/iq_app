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
6. **`requirements.txt`** - Dependencias (pandas, openpyxl, xlrd)

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

Consulta con el departamento de TI los valores correctos para:
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USE_TLS` (true/false)

## Formato del CSV

 El archivo Excel debe contener las columnas estándar del sistema de la universidad:

- **N°** - Número de fila (se ignora)
- **Cuenta** - Número de cuenta del estudiante
- **Nombre Completo** - Nombre completo del estudiante
- **Correo Institucional** - Correo electrónico para envío de credenciales
- **Centro Estudiante** - Centro donde estudia (se ignora)
- **Matricula Excepcional** - Indicador de matrícula (se ignora)

## Separación Automática del Nombre

El sistema separa automáticamente el **Nombre Completo** en sus componentes:

| Nombre Completo | Primer Nombre | Segundo Nombre | Primer Apellido | Segundo Apellido 

## Algoritmo de Separación

El sistema utiliza el siguiente algoritmo:

1. **2 nombres + 2 apellidos** (caso más común): Los últimos 2 elementos son apellidos
2. **3 elementos**: Asume 2 nombres + 1 apellido
3. **Más de 4 elementos**: Primer nombre, resto como segundo nombre, últimos 2 como apellidos

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

### Error al leer el archivo Excel

- Asegúrate de que el archivo no esté corrupto
- Verifica que tenga las columnas requeridas: Cuenta, Nombre Completo
- El sistema acepta tanto .xlsx como .xls

### Nombres no se separan correctamente

El sistema asume el formato estándar hispano:
- 2 nombres + 2 apellidos (caso más común)

Si un estudiante tiene un formato diferente, el username puede generarse incorrectamente. En estos casos:
1. El estudiante puede usar el username generado
2. O el administrador puede modificar el username manualmente en la base de datos

### Correos no se envían

1. Verifica la configuración SMTP
2. Revisa que los correos en el Excel sean válidos
3. Consulta los logs del servidor para errores específicos


## Instalación de Dependencias

```bash
pip install -r requirements.txt
```