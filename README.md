# Simulador de Laboratorio de Química Analítica

Simulador interactivo de laboratorio virtual para prácticas de volumetría cuantitativa. Los estudiantes realizan titulaciones a través de un flujo de 9 etapas: selección de práctica → materiales → medición → montaje → titulación → registro → cálculo → curva de titulación → evaluación.

## Prácticas disponibles

| # | Práctica | Método | Estado |
|---|----------|--------|--------|
| 2 | Índice de Saponificación | Ácido-base | Pendiente |
| 3 | Argentometría (Mohr) | Precipitación | Pendiente |
| **4** | **Determinación de Cloruros** | **Volhard (retrotitulación)** | **Completa** |
| **5** | **Dureza Total en Agua** | **Complejometría con EDTA** | **Completa** |
| 6 | Permanganimetría | Redox | Pendiente |
| 7 | Hierro por Permanganimetría | Redox | Pendiente |
| 8 | Yodimetría | Redox | Pendiente |

## Estructura del proyecto

```
iq_app/
├── lab-simulator/
│   ├── backend/       FastAPI + SQLAlchemy async + SQLite
│   └── frontend/      React 19 + Vite 7 + react-konva + Zustand
├── run.sh             Script de inicio (libera puertos 8000 y 5173 automáticamente)
└── venv/              Entorno virtual Python
```

## Instalación y ejecución

```bash
# Inicio rápido (levanta backend y frontend en paralelo)
./run.sh

# O manualmente:
# Backend (cwd: lab-simulator/backend)
pip install -r requirements.txt
uvicorn main:app --reload          # localhost:8000

# Frontend (cwd: lab-simulator/frontend)
npm install
npm run dev                        # localhost:5173
```

El proxy de Vite redirige `/api/*` al backend automáticamente. La base de datos SQLite se crea sola en el primer arranque.

## Base de datos

SQLite en `lab-simulator/backend/lab_simulator.db`. Se gestiona con SQLAlchemy async (aiosqlite).

### Tabla `practice_sessions`

Registra cada sesión de práctica de un estudiante.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID (PK) | Identificador único de sesión |
| `practice_id` | Integer | Número de práctica (2–8) |
| `student_name` | String | Nombre del estudiante |
| `started_at` | DateTime | Fecha/hora de inicio |
| `completed_at` | DateTime | Fecha/hora de finalización |
| `current_stage` | Integer | Etapa actual (1–9) |
| `status` | String | `"in_progress"` o `"completed"` |
| `sample_id` | String | ID de la muestra seleccionada |
| `measured_value` | Float | Volumen/masa medido en etapa 3 (mL) |
| `measured_unit` | String | Unidad de medición |
| `expected_volume` | Float | Volumen teórico de titulante calculado (mL) |
| `recorded_volume` | Float | Lectura de bureta registrada por el estudiante (mL) |
| `student_calculation` | Float | Resultado calculado por el estudiante |
| `correct_calculation` | Float | Resultado correcto calculado por el sistema |
| `percent_error` | Float | Error porcentual absoluto (%) |
| `materials_correct` | Boolean | Si la selección de materiales fue correcta |
| `assembly_correct` | Boolean | Si el montaje fue completado |
| `total_score` | Float | Puntuación final (0–100) |
| `feedback` | Text | Retroalimentación general generada |

### Tabla `practice_results`

Detalle de la evaluación por criterio, vinculado a una sesión.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | Integer (PK) | Autoincremental |
| `session_id` | UUID (FK) | Referencia a `practice_sessions.id` |
| `criterion_id` | String | Identificador del criterio (ej. `"endpoint"`) |
| `criterion_label` | String | Etiqueta legible del criterio |
| `score` | Float | Puntos obtenidos en este criterio |
| `max_score` | Float | Puntos máximos posibles |
| `feedback` | Text | Retroalimentación específica del criterio |

## Arquitectura en resumen

**Backend data-driven:** cada práctica es un objeto de configuración Python que define materiales, pasos de montaje, parámetros de titulación, fórmula de cálculo y rúbrica. Agregar una práctica nueva = agregar un archivo de configuración, sin código de componentes nuevo.

**Frontend por etapas:** cada etapa es un componente React independiente (`S1_PracticeSelect` → `S9_Evaluation`). El estado global vive en dos stores Zustand: `useSimulatorStore` (flujo completo) y `useTitrationStore` (titulación en tiempo real).

**Canvas interactivo:** el equipo de laboratorio (bureta, Erlenmeyer, probeta) se renderiza con react-konva. Las transiciones de color del indicador se interpolan en espacio HSL con modificadores según las decisiones del estudiante en el montaje.

**Curva de titulación:** al final de cada práctica implementada se genera una curva teórica en Python (matplotlib + numpy): pAg vs V(KSCN) para Práctica 4 y pCa vs V(EDTA) para Práctica 5, con la lectura del estudiante marcada sobre la curva.

## API REST (resumen)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/practices` | Lista de prácticas |
| GET | `/api/practices/{id}` | Config completa de una práctica |
| POST | `/api/sessions` | Crear sesión nueva |
| GET | `/api/sessions/{id}` | Estado de la sesión |
| PUT | `/api/sessions/{id}/measurement` | Registrar volumen medido |
| PUT | `/api/sessions/{id}/materials` | Validar selección de materiales |
| PUT | `/api/sessions/{id}/titration` | Registrar lectura de bureta |
| POST | `/api/calculations/validate` | Validar cálculo del estudiante |
| GET | `/api/sessions/{id}/report` | Reporte de evaluación |
| GET | `/api/sessions/{id}/titration-curve` | Curva teórica (SVG/PNG) |
