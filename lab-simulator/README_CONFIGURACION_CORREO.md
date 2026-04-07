# Configuracion de correo e importacion Excel

Este proyecto ahora puede:

- importar estudiantes por seccion desde `CSV`
- importar estudiantes por seccion desde `XLSX` o `XLS`
- leer tablas HTML exportadas con extension `.xls`
- enviar credenciales por correo cuando el archivo incluya email

## Variables de entorno

Configura estas variables en el backend:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=tu_correo@dominio.com
SMTP_PASSWORD=tu_password_o_app_password
SMTP_USE_TLS=false
FROM_EMAIL=noreply@simulatoral.edu
FROM_NAME=Simulador de Quimica
```

Si `SMTP_USERNAME` o `SMTP_PASSWORD` estan vacios, el sistema no intentara enviar correos y lo reportara en el resumen de importacion.

## Formatos soportados

### CSV por seccion

Columnas esperadas:

- `nombre`
- `apellido`
- `numero_cuenta`
- `email` opcional

### Excel o HTML por seccion

Columnas detectadas automaticamente:

- `Cuenta`
- `Nombre Completo`
- `Correo Institucional` opcional

Tambien se aceptan nombres de columnas que incluyan palabras como `correo` o `email`.

## Resultado de importacion

El modal de la vista docente muestra:

- estudiantes creados
- errores por fila
- estado del envio de correo por estudiante

## Plantillas

La vista docente permite descargar:

- plantilla CSV
- plantilla Excel
