# Simulador de Laboratorio de Quimica Analitica

Simulador interactivo de laboratorio virtual para practicas de quimica analitica cuantitativa (volumetria). Los estudiantes realizan titulaciones virtuales a traves de un flujo de trabajo de 8 etapas, desde la seleccion de materiales hasta la evaluacion final con calificacion automatizada.

---

## Tabla de Contenidos

- [Descripcion General](#descripcion-general)
- [Practicas Disponibles](#practicas-disponibles)
- [Tecnologias](#tecnologias)
- [Requisitos Previos](#requisitos-previos)
- [Instalacion y Ejecucion](#instalacion-y-ejecucion)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Arquitectura](#arquitectura)
  - [Sistema Data-Driven](#sistema-data-driven)
  - [Estado (Zustand)](#estado-zustand)
  - [Canvas Interactivo (Konva.js)](#canvas-interactivo-konvajs)
  - [Motor de Titulacion](#motor-de-titulacion)
  - [Base de Datos](#base-de-datos)
- [Flujo de Trabajo: Las 8 Etapas](#flujo-de-trabajo-las-8-etapas)
- [API REST](#api-rest)
- [Practica 5: Valores de Referencia](#practica-5-valores-de-referencia)
- [Guia para Agregar Nuevas Practicas](#guia-para-agregar-nuevas-practicas)
- [Configuracion](#configuracion)
- [Sistema de Diseno](#sistema-de-diseno)

---

## Descripcion General

Este simulador permite a los estudiantes de quimica analitica realizar practicas de volumetria en un entorno virtual interactivo. A diferencia de un simple cuestionario, el estudiante debe:

- **Seleccionar** los instrumentos y reactivos correctos de un catalogo con distractores
- **Medir** volumenes usando una probeta interactiva con llenado por presion
- **Montar** el experimento arrastrando equipo sobre el canvas (transferir agua, agregar tampon, agregar indicador gota a gota)
- **Titular** controlando una bureta virtual gota a gota, observando el cambio de color en tiempo real
- **Registrar** la lectura de la bureta al detectar el punto final
- **Calcular** el resultado usando la formula quimica correcta
- **Recibir** una evaluacion detallada con retroalimentacion por criterio

El sistema califica automaticamente cada etapa y genera un reporte con puntuacion sobre 100.

---

## Practicas Disponibles

| # | Practica | Categoria | Dificultad | Estado |
|---|----------|-----------|------------|--------|
| 2 | Indice de Saponificacion | Acido-base | Media | Pendiente |
| 3 | Argentometria (Mohr) | Precipitacion | Media | Pendiente |
| 4 | Metodo de Volhard | Precipitacion | Media-Alta | Pendiente |
| **5** | **Dureza en Agua (EDTA)** | **Complejometria** | **Media** | **Completa** |
| 6 | Permanganimetria | Redox | Alta | Pendiente |
| 7 | Hierro por Permanganimetria | Redox | Alta | Pendiente |
| 8 | Yodimetria | Redox | Alta | Pendiente |

> La Practica 5 (Determinacion de Dureza Total en Agua por Complejometria con EDTA) es la unica completamente implementada. Las demas existen como configuraciones stub y pueden completarse agregando sus datos de configuracion.

---

## Tecnologias

### Backend

| Tecnologia | Version | Proposito |
|------------|---------|-----------|
| Python | 3.11+ | Lenguaje del servidor |
| FastAPI | >= 0.104 | Framework web asincrono |
| Pydantic | v2 (>= 2.5) | Validacion de esquemas |
| SQLAlchemy | >= 2.0 (async) | ORM con soporte asincrono |
| SQLite + aiosqlite | >= 0.19 | Base de datos embebida |
| Uvicorn | >= 0.24 | Servidor ASGI |

### Frontend

| Tecnologia | Version | Proposito |
|------------|---------|-----------|
| React | 19 | Interfaz de usuario |
| Vite | 7 | Bundler y servidor de desarrollo |
| Konva.js / react-konva | 10 / 19 | Canvas interactivo para equipo de lab |
| Zustand | 5 | Manejo de estado global |
| React Router | v7 | Navegacion entre etapas |
| Framer Motion | 12 | Animaciones de UI |

---

## Requisitos Previos

- **Python 3.11+** con `pip`
- **Node.js 18+** con `npm`
- Sistema operativo: Linux, macOS o Windows (WSL recomendado)

---

## Instalacion y Ejecucion

### 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd lab-simulator
```

### 2. Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

El servidor inicia en `http://localhost:8000`. La base de datos SQLite se crea automaticamente al iniciar.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

La aplicacion inicia en `http://localhost:5173`. El proxy de Vite redirige las llamadas `/api/*` al backend automaticamente.

### 4. Build de Produccion

```bash
cd frontend
npm run build    # Genera la carpeta dist/
```

---

## Estructura del Proyecto

```
lab-simulator/
├── backend/
│   ├── main.py                       # Punto de entrada FastAPI (CORS, lifespan, routers)
│   ├── config.py                     # Configuracion (DB URL, CORS origins, debug)
│   ├── database.py                   # Motor async SQLAlchemy + fabrica de sesiones
│   ├── requirements.txt
│   ├── models/
│   │   ├── session.py                # Modelo ORM: PracticeSession (UUID, etapas, scores)
│   │   └── result.py                 # Modelo ORM: PracticeResult
│   ├── schemas/
│   │   ├── practice.py               # Schemas Pydantic para practicas
│   │   ├── session.py                # SessionCreate, SessionResponse, StageUpdate
│   │   └── calculation.py            # Validacion de calculos
│   ├── routers/
│   │   ├── practices.py              # GET /practices, /practices/{id}, /materials
│   │   ├── sessions.py               # CRUD sesiones + actualizacion por etapa
│   │   └── calculations.py           # POST validacion, volumen esperado
│   ├── services/
│   │   ├── titration_engine.py       # Calculo de volumen esperado (direct/inverse/fixed)
│   │   ├── calculation_engine.py     # Validacion de formulas quimicas
│   │   └── report_generator.py       # Generacion de reportes de evaluacion
│   └── data/
│       ├── catalog.py                # Catalogo maestro: instrumentos, reactivos, muestras
│       ├── registry.py               # Registro de practicas (get/list)
│       └── practices/
│           ├── __init__.py           # Import-time registration de todas las practicas
│           ├── practice_5.py         # Configuracion COMPLETA de Dureza en Agua
│           └── practice_{2-8}.py     # Stubs de las demas practicas
│
├── frontend/
│   ├── index.html
│   ├── vite.config.js                # Proxy API a localhost:8000
│   ├── package.json
│   └── src/
│       ├── main.jsx                  # React root con BrowserRouter
│       ├── App.jsx                   # Rutas S1-S8, Header, StepIndicator
│       ├── api/
│       │   └── client.js             # Wrapper fetch (getPractices, createSession, etc.)
│       ├── store/
│       │   ├── useSimulatorStore.js   # Estado global: practica, materiales, medicion
│       │   └── useTitrationStore.js   # Estado titulacion: volumen, color, endpoint
│       ├── data/
│       │   ├── catalog.js            # Espejo frontend del catalogo de instrumentos/reactivos
│       │   ├── practices.js          # Configuraciones de practicas (espejo del backend)
│       │   └── colorMaps.js          # Mapas de transicion de color por practica
│       ├── hooks/
│       │   ├── useAssembly.js        # Maquina de estados para montaje (4 sub-pasos)
│       │   ├── useTitration.js       # Logica de titulacion (progreso, volumen)
│       │   ├── useColorTransition.js # Interpolacion HSL para colores
│       │   └── usePracticeFlow.js    # Navegacion entre etapas
│       ├── components/
│       │   ├── stages/               # S1 a S8 (una por etapa del flujo)
│       │   ├── canvas/               # Componentes Konva (Burette, Erlenmeyer, etc.)
│       │   ├── ui/                   # Paneles (TitrationControls, ToolStand, etc.)
│       │   ├── layout/               # Header, Sidebar, StepIndicator
│       │   └── common/               # Button, Modal, Tooltip, ProgressBar
│       ├── utils/
│       │   ├── colorInterpolation.js # Interpolacion HSL, stretch/lighten/darken
│       │   ├── chemistryCalculations.js
│       │   └── constants.js
│       └── styles/
│           ├── global.css            # Fuentes, variables CSS
│           ├── stages.css            # Estilos de cada etapa
│           └── canvas.css            # Contenedores Konva
│
└── prompt.txt                        # Especificacion completa del proyecto
```

---

## Arquitectura

### Sistema Data-Driven

Cada practica es un **objeto de configuracion** que define todo el comportamiento sin necesidad de codigo nuevo. Los campos clave son:

| Campo | Etapa | Descripcion |
|-------|-------|-------------|
| `requiredInstruments` / `requiredReagents` | S2 | Instrumentos y reactivos correctos |
| `distractorInstruments` / `distractorReagents` | S2 | Items incorrectos para confundir |
| `measurement` | S3 | Tipo (volumen/masa), rango, valor por defecto |
| `assemblySteps` | S4 | Secuencia ordenada de pasos de montaje |
| `assemblyConfig` | S4 | Parametros de buffer e indicador (rangos, umbrales) |
| `titration.colorTransitions` | S5 | Arreglo de puntos progreso-color para interpolar |
| `titration.expectedVolume` | S5 | Volumen de titulante esperado |
| `titration.proportionality` | S5 | `"fixed"`, `"direct"` o `"inverse"` |
| `calculation.variables` + `compute` | S7 | Formula y logica de validacion |
| `evaluation.criteria` | S8 | Rubrica con criterios y pesos |

Para agregar una nueva practica, basta con crear su archivo de configuracion — no se requiere codigo de componentes nuevo a menos que necesite visualizaciones unicas.

### Estado (Zustand)

Dos stores independientes, ambos agnosticos a la practica:

**`useSimulatorStore`** — Estado global de la sesion:
- Practica seleccionada y su configuracion
- Etapa actual, ID de sesion
- Instrumentos y reactivos seleccionados
- Valor medido, volumen de buffer, gotas de indicador
- Volumen registrado, calculo del estudiante, reporte

**`useTitrationStore`** — Estado exclusivo de la titulacion:
- Volumen agregado, nivel de bureta
- Color actual (interpolado en HSL)
- Estado del punto final (alcanzado, sobrepasado)
- `initTitration(config, expectedVol, modifiers)` — acepta modificadores del montaje que alteran las transiciones de color

### Canvas Interactivo (Konva.js)

El equipo de laboratorio se renderiza como componentes interactivos en un canvas Konva (`react-konva`):

| Componente | Etapas | Descripcion |
|------------|--------|-------------|
| `GraduatedCylinder` | S3, S4 | Probeta graduada con marcas, llenado animado |
| `Burette` | S5 | Bureta vertical (0 arriba, como una real) |
| `Erlenmeyer` | S4, S5 | Matraz con color de liquido dinamico |
| `LiquidFill` | S4, S5 | Renderizador de liquido con menisco curvo |
| `IndicatorBottle` | S4 | Frasco gotero para indicador |
| `DropAnimation` | S4, S5 | Gotas cayendo por gravedad (~350ms) |
| `PourAnimation` | S4 | Arco curvo simulando vertido entre recipientes |
| `MeasurementBench` | S3 | Orquestador Stage+Layer para medicion |
| `AssemblyBench` | S4 | Orquestador Stage+Layer para montaje |
| `ToolStand` | S2 | Panel lateral con pestanas de instrumentos/reactivos |
| `LabBench` | S2 | Mesa de trabajo Konva donde se colocan materiales |

Las transiciones de color interpolan entre puntos definidos (progreso 0.0 a 1.15) usando espacio HSL. La utilidad `colorInterpolation.js` tambien provee funciones para estirar, aclarar y oscurecer transiciones segun las decisiones del estudiante en el montaje.

### Motor de Titulacion

El calculo del volumen esperado soporta tres modos de proporcionalidad:

- **`fixed`**: El volumen no varia con la medicion
- **`direct`**: El volumen escala proporcionalmente (Practica 5: 6.5 mL base para 100 mL, escala linealmente)
- **`inverse`**: El volumen escala inversamente

Las decisiones no estandar en el montaje tienen consecuencias en la titulacion:

| Decision del estudiante | Efecto en S5 |
|------------------------|--------------|
| Poco tampon (< 5 mL) | Transicion del punto final estirada (mas dificil de detectar) |
| Pocas gotas de indicador (< 3) | Colores tenues y dificiles de ver |
| Muchas gotas de indicador (> 7) | Colores oscuros y turbios |

### Base de Datos

SQLite embebido con SQLAlchemy asincrono. Se crea automaticamente al iniciar el backend.

**Tabla `PracticeSession`:**

| Columna | Tipo | Descripcion |
|---------|------|-------------|
| `id` | String (UUID) | Clave primaria |
| `practice_id` | Integer | Practica seleccionada |
| `student_name` | String | Nombre del estudiante (opcional) |
| `current_stage` | Integer | Etapa actual (1-8) |
| `status` | String | `"in_progress"` o `"completed"` |
| `measured_value` | Float | Volumen medido en S3 |
| `expected_volume` | Float | Volumen teorico de titulante |
| `recorded_volume` | Float | Lectura de bureta registrada en S6 |
| `student_calculation` | Float | Resultado del estudiante en S7 |
| `correct_calculation` | Float | Resultado correcto calculado por el backend |
| `percent_error` | Float | Error porcentual |
| `materials_correct` | Boolean | Seleccion de materiales correcta |
| `assembly_correct` | Boolean | Montaje completado |
| `total_score` | Float | Puntuacion final (0-100) |
| `feedback` | Text | Retroalimentacion detallada |

---

## Flujo de Trabajo: Las 8 Etapas

### Etapa 1: Seleccion de Practica

El estudiante elige una practica del catalogo. Solo la Practica 5 esta habilitada actualmente; las demas muestran una etiqueta "Proximamente".

### Etapa 2: Preparacion de Materiales

Interfaz dividida en dos paneles:

- **Stand de Herramientas** (izquierda): Panel con pestanas "Instrumentos" y "Reactivos". Cada item es arrastrable hacia la mesa de trabajo.
- **Mesa de Trabajo** (derecha): Canvas Konva con una mesa trapezoidal. Los items arrastrados aparecen como objetos sobre la mesa. Doble clic para remover.

La validacion requiere coincidencia exacta: los instrumentos correctos (ej. probeta de 250 mL, no de 100 mL) y los reactivos correctos (ej. EDTA 0.01 M, no 0.10 M).

### Etapa 3: Medicion de Muestra

Canvas interactivo con una probeta graduada animada:

- **Boton "Abrir llave"**: Mantener presionado para llenar (pointer events + listeners globales de seguridad)
- **Botones finos**: +1, -1, +5, -5 mL
- **Slider**: Ajuste continuo
- Rango configurable (10-250 mL), valor recomendado: 100 mL
- El valor medido afecta el volumen esperado de titulante en S5

### Etapa 4: Montaje del Experimento

Cuatro sub-pasos interactivos manejados por el hook `useAssembly`:

1. **Confirmar agua medida**: Revision visual del volumen
2. **Transferir al Erlenmeyer**: Arrastrar la probeta hacia el matraz (animacion de vertido)
3. **Agregar tampon pH 10**: Seleccionar volumen con slider (0-30 mL), luego arrastrar el vaso al matraz
4. **Agregar indicador NET**: Hacer clic en el frasco gotero, una gota a la vez (el color del liquido evoluciona)

Cada sub-paso incluye deteccion de proximidad, efecto glow en el objetivo, y snap-back al soltar.

### Etapa 5: Ejecucion (Titulacion)

La etapa central del simulador. Layout con canvas a la izquierda y controles a la derecha:

- **Bureta**: Tubo graduado vertical (0 arriba, como una real)
- **Erlenmeyer**: Matraz con color que cambia en tiempo real segun el progreso
- **Controles**: "Gota (0.05 mL)" y "Chorro (0.50 mL)"
- El estudiante **puede sobrepasarse** del punto final; no hay auto-stop
- El color sigue cambiando despues del punto final
- Se muestra una pista sutil si se excede mas del 10%
- Boton "Registrar lectura" para confirmar el punto final detectado

### Etapa 6: Registro

El estudiante confirma la lectura final de la bureta. Este valor se usa para validar el calculo en S7.

### Etapa 7: Calculo

Formulario donde el estudiante ingresa:
- Las variables de la formula (volumen de EDTA, molaridad, peso molecular, volumen de muestra)
- El resultado final

El backend valida contra el resultado correcto calculado a partir del volumen **realmente registrado** por el estudiante (no el teorico).

### Etapa 8: Evaluacion

Reporte final con puntuacion desglosada por criterio:

| Criterio | Peso |
|----------|------|
| Seleccion de materiales | 15% |
| Precision en la medicion | 10% |
| Montaje completo | 15% |
| Deteccion del punto final | 25% |
| Precision del calculo | 25% |
| Interpretacion del resultado | 10% |

Puntuacion maxima: 100 puntos. Aprobatorio: 60 puntos.

---

## API REST

Todos los endpoints estan bajo el prefijo `/api`.

### Practicas

```
GET  /api/practices                   # Lista todas las practicas (metadata)
GET  /api/practices/{id}              # Configuracion completa de una practica
GET  /api/practices/{id}/materials    # Instrumentos y reactivos (correctos + distractores)
```

### Sesiones

```
POST /api/sessions                    # Crear sesion nueva
     Body: { "practice_id": 5, "student_name": "..." }

GET  /api/sessions/{id}               # Obtener estado de sesion

PUT  /api/sessions/{id}/stage         # Actualizar etapa actual
     Body: { "stage": 3, "data": { ... } }

PUT  /api/sessions/{id}/measurement   # Registrar volumen medido
     Body: { "value": 100.0, "unit": "mL" }

PUT  /api/sessions/{id}/materials     # Validar seleccion de materiales
     Body: { "instruments": [...], "reagents": [...] }

PUT  /api/sessions/{id}/titration     # Registrar lectura de bureta
     Body: { "volume": 6.5 }
```

### Calculos

```
POST /api/calculations/validate            # Validar calculo del estudiante
     Body: { "session_id": "...", "student_result": 65.06, "variables": { ... } }

POST /api/calculations/expected-volume     # Obtener volumen esperado
     Body: { "practice_id": 5, "measured_value": 100.0 }
```

### Reportes y Salud

```
GET  /api/sessions/{id}/report        # Reporte completo de evaluacion
GET  /api/health                      # { "status": "healthy" }
```

---

## Practica 5: Valores de Referencia

**Titulo completo:** Determinacion de Dureza Total en Agua por Complejometria con EDTA

| Parametro | Valor |
|-----------|-------|
| Muestra | Agua de la llave (10-250 mL, recomendado 100 mL) |
| Tampon | pH 10 (0-30 mL, recomendado 10 mL) |
| Indicador | Negro de Eriocromo T (1-12 gotas, recomendado 5) |
| Titulante | EDTA Na2 0.01 M en bureta de 50 mL |
| Volumen esperado | `(6.5 / 100) x V_muestra` mL (proporcionalidad directa) |
| Incremento gota | 0.05 mL |
| Incremento chorro | 0.50 mL |
| Tolerancia punto final | +/- 0.3 mL |

**Formula de calculo:**

```
Dureza (ppm CaCO3) = (V_EDTA x M_EDTA x PM_CaCO3 x 1000) / V_muestra
```

Con valores estandar: `(6.5 x 0.01 x 100.09 x 1000) / 100 = 65.06 ppm`

**Transicion de color:** Rojizo (#CD5C5C) -> Purpura -> Azul real (#4169E1) -> Azul oscuro (exceso)

**Clasificacion WHO:**

| Rango (ppm CaCO3) | Clasificacion |
|--------------------|---------------|
| 0 - 60 | Agua blanda |
| 60 - 120 | Moderadamente dura |
| 120 - 180 | Agua dura |
| > 180 | Muy dura |

El resultado estandar (65.06 ppm) clasifica como **agua moderadamente dura**.

---

## Guia para Agregar Nuevas Practicas

### 1. Backend: Crear archivo de configuracion

Crear `backend/data/practices/practice_N.py` con la estructura completa:

```python
PRACTICE_N = {
    "id": N,
    "name": "Nombre Corto",
    "fullName": "Nombre Completo de la Practica",
    "description": "Descripcion de lo que determina",
    "category": "Categoria",          # Acido-base, Redox, Precipitacion, etc.
    "difficulty": "media",             # baja, media, alta
    "estimatedTime": "30 minutos",
    "implemented": True,

    # Etapa 2: Materiales
    "requiredInstruments": ["ID-001", "ID-002"],
    "requiredReagents": ["REA-001"],
    "requiredSample": "MUESTRA-ID",
    "distractorInstruments": ["DIST-001"],
    "distractorReagents": ["DIST-REA-001"],

    # Etapa 3: Medicion
    "measurement": {
        "type": "volume",              # "volume" o "mass"
        "instrument": "PRO-250",
        "defaultValue": 100,
        "fixedValue": False,           # True = no interactivo
        "range": [10, 250],
        "unit": "mL",
        "label": "Descripcion de lo que se mide",
        "instruction": "Instruccion para el estudiante",
    },

    # Etapa 4: Montaje
    "assemblySteps": [
        {"id": "paso_1", "label": "Descripcion del paso 1"},
        # ... mas pasos
    ],
    "assemblyConfig": {
        "buffer": {
            "label": "Nombre del buffer",
            "defaultVolume": 10,
            "range": [0, 30],
            "qualityThresholds": {"poor": 5, "excess": 20},
        },
        "indicator": {
            "label": "Nombre del indicador",
            "defaultDrops": 5,
            "intensityThresholds": {"faint": 3, "dark": 7},
        },
    },

    # Etapa 5: Titulacion
    "titration": {
        "titrant": "REACTIVO-TITULANTE",
        "titrantConcentration": 0.01,
        "buretteCapacity": 50,
        "expectedVolume": 6.5,
        "proportionality": "direct",   # "fixed", "direct" o "inverse"
        "dropVolume": 0.05,
        "streamVolume": 0.50,
        "endpointTolerance": 0.3,
        "colorTransitions": [
            {"progress": 0.0, "color": "#COLOR1"},
            {"progress": 0.5, "color": "#COLOR2"},
            {"progress": 1.0, "color": "#COLOR3"},
        ],
    },

    # Etapa 7: Calculo
    "calculation": {
        "formula": "Descripcion de la formula",
        "variables": [
            {"name": "V_titulante", "label": "Volumen", "unit": "mL", "source": "recorded"},
            {"name": "M_titulante", "label": "Molaridad", "unit": "mol/L", "value": 0.01},
        ],
        "unit": "ppm CaCO3",
        "tolerance": 2,
    },

    # Etapa 8: Evaluacion
    "evaluation": {
        "criteria": [
            {"name": "materials", "label": "Seleccion de materiales", "weight": 15},
            {"name": "measurement", "label": "Precision en medicion", "weight": 10},
            {"name": "assembly", "label": "Montaje", "weight": 15},
            {"name": "endpoint", "label": "Punto final", "weight": 25},
            {"name": "calculation", "label": "Calculo", "weight": 25},
            {"name": "interpretation", "label": "Interpretacion", "weight": 10},
        ],
    },
}
```

### 2. Registrar la practica

En `backend/data/practices/__init__.py`, agregar:

```python
from .practice_N import PRACTICE_N
register_practice(PRACTICE_N)
```

### 3. Frontend: Agregar datos espejo

Agregar la configuracion correspondiente en:
- `frontend/src/data/practices.js` — Configuracion de la practica
- `frontend/src/data/catalog.js` — Nuevos instrumentos/reactivos si es necesario
- `frontend/src/data/colorMaps.js` — Mapa de transiciones de color

### 4. Verificar

```bash
# Backend: verificar que la practica aparece
curl http://localhost:8000/api/practices

# Frontend: verificar que compila
cd frontend && npm run build
```

No se necesitan componentes de UI nuevos a menos que la practica requiera visualizaciones unicas (ej. un nuevo tipo de instrumento en el canvas).

---

## Configuracion

### Backend (`backend/config.py`)

| Variable | Valor por defecto | Descripcion |
|----------|-------------------|-------------|
| `APP_NAME` | `"Chemistry Lab Simulator"` | Nombre de la aplicacion |
| `DEBUG` | `True` | Modo debug |
| `DATABASE_URL` | `"sqlite+aiosqlite:///./lab_simulator.db"` | URL de la base de datos |
| `CORS_ORIGINS` | `["http://localhost:5173", "http://localhost:3000"]` | Origenes permitidos para CORS |

### Frontend (`frontend/vite.config.js`)

El proxy de desarrollo redirige `/api` al backend:

```javascript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8000',
      changeOrigin: true,
    }
  }
}
```

---

## Sistema de Diseno

### Colores

| Rol | Hex | Uso |
|-----|-----|-----|
| Primary | `#2563EB` | Acciones principales, links, elementos activos |
| Success | `#16A34A` | Confirmaciones, pasos completados |
| Warning | `#F59E0B` | Advertencias, valores no estandar |
| Error | `#DC2626` | Errores, selecciones incorrectas |
| Background | `#F8FAFC` | Fondo general |
| Surface | `#FFFFFF` | Paneles, tarjetas |
| Text | `#1E293B` | Texto principal |
| Text Secondary | `#64748B` | Texto secundario, etiquetas |

### Tipografia

- **IBM Plex Sans**: Interfaz general (titulos, botones, instrucciones)
- **IBM Plex Mono**: Datos numericos (lecturas de bureta, volumenes, resultados)

### Layout

- Canvas ocupa ~60% del ancho durante las etapas interactivas (S3, S4, S5)
- Panel de controles/instrucciones en el 40% restante
- Ancho maximo del contenedor: 1200px
- Animacion de entrada `fadeIn` en cada cambio de etapa
