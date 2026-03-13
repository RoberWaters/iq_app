PRACTICE_3 = {
    "id": 3,
    "number": 3,
    "name": "Argentometría",
    "fullName": "Determinación de Cloruros por Argentometría (Método de Mohr)",
    "description": "Determinación de la concentración de cloruros en una solución salina mediante titulación argentométrica directa con AgNO₃, usando K₂CrO₄ como indicador (método de Mohr).",
    "objective": "Determinar la concentración de cloruros en una solución salina mediante titulación directa con AgNO₃ 0.010 M, utilizando K₂CrO₄ como indicador del punto final.",
    "category": "Precipitación",
    "methodType": "titulación directa",
    "difficulty": "media",
    "estimatedTime": "25 minutos",
    "implemented": True,
    "comingSoon": False,

    # ── Stage 2: Materials ───────────────────────────────────────────────────
    "requiredInstruments": ["PIP-V10", "MAT-050", "BUR-050"],
    "requiredReagents": ["AGNO3-001M", "IND-K2CRO4"],
    "requiredSample": "SOL-SAL-1",

    "distractorInstruments": ["PIP-V25", "ERL-250", "PRO-250", "PAP-ALU"],
    "distractorReagents": ["AGNO3-010M", "KSCN-008M", "IND-ALUMFE", "EDTA-001M"],

    # ── Stage 3: Measurement — fixed 10 mL pipette ──────────────────────────
    "measurement": {
        "type": "volume",
        "instrument": "PIP-V10",
        "defaultValue": 10,
        "fixedValue": True,
        "range": [10, 10],
        "unit": "mL",
        "label": "Volumen de muestra (pipeta volumétrica)",
        "instruction": "Tomar exactamente 10 mL de la solución salina con la pipeta volumétrica de 10 mL y transferir al matraz.",
    },

    # ── Stage 4: Assembly — 1 step: add K₂CrO₄ indicator ────────────────────
    # The sample is already in the flask from S3. The initial flask state
    # reflects the transferred sample.
    "initialFlaskState": {
        "fillLevel": 0.14,
        "containerColor": "#F8F8FF",
        "label": "10 mL muestra",
    },

    "assemblySteps": [
        {
            "order": 1,
            "id": "agregar_indicador",
            "action": "add_indicator",
            "description": "Agregar 3–4 gotas de indicador K₂CrO₄ al matraz",
            "reagent": "IND-K2CRO4",
            "amount": 4,
            "unit": "gotas",
            "criticalNote": "El K₂CrO₄ actúa como indicador: al agotarse los Cl⁻, el exceso de Ag⁺ precipita como Ag₂CrO₄ (rojo ladrillo), marcando el punto final.",
            "visualAfter": {
                "containerColor": "#FFE066",
                "fillLevel": 0.18,
                "label": "Listo para titular — amarillo",
            },
        },
    ],

    # No interactive assembly config (sequential mode)
    "assemblyConfig": None,

    "preReaction": None,

    # ── Stage 5: Titration with AgNO₃ 0.010 M ───────────────────────────────
    "titration": {
        "titrant": "AGNO3-001M",
        "titrantConcentration": 0.010,
        "titrantConcentrationUnit": "M",
        "titrantColor": "#F0F0F0",
        "dropColor": "#F0F0F0",
        "titrantInstrument": "BUR-050",
        "sampleContainer": "MAT-050",
        "maxBuretteVolume": 50,

        "expectedVolume": 17.11,
        "referenceValue": 10,
        "proportionality": "direct",

        # Flask fill level during titration (sample + indicator ≈ 11 mL in 50 mL flask)
        "flaskFillLevel": 0.22,

        "colorTransitions": [
            {"progress": 0.00, "color": "#FFE066", "description": "Amarillo — indicador K₂CrO₄"},
            {"progress": 0.15, "color": "#FFD84D", "description": "Amarillo ligeramente turbio"},
            {"progress": 0.30, "color": "#FFD033", "description": "Amarillo con turbidez blanca"},
            {"progress": 0.50, "color": "#FFC81A", "description": "Amarillo-naranja turbio"},
            {"progress": 0.70, "color": "#FFC000", "description": "Amarillo-naranja"},
            {"progress": 0.85, "color": "#FFB030", "description": "Naranja cálido"},
            {"progress": 0.93, "color": "#F0A040", "description": "Naranja rojizo"},
            {"progress": 0.97, "color": "#E89050", "description": "Rojo-naranja suave"},
            {"progress": 1.00, "color": "#D08050", "description": "Rojo suave — PUNTO FINAL"},
            {"progress": 1.05, "color": "#C07040", "description": "Rojo ladrillo (exceso)"},
            {"progress": 1.15, "color": "#A05030", "description": "Rojo oscuro (exceso marcado)"},
        ],

        "endpointDescription": "La solución cambia de amarillo (K₂CrO₄) a un rojo suave persistente. El precipitado rojo ladrillo de Ag₂CrO₄ indica el punto final. Se observa turbidez blanca (AgCl) durante toda la titulación.",
        "solutionIsTransparent": False,

        # White AgCl precipitate forms progressively during titration
        "precipitate": {
            "layers": [
                {"type": "granular", "color": "#FFFFFF", "opacity": 0.6, "density": 0.5, "dynamic": True},
            ],
        },

        "dropVolume": 0.05,
        "streamVolume": 0.50,
        "endpointTolerance": 0.5,
    },

    # ── Stages 6-7: Calculation ──────────────────────────────────────────────
    "calculation": {
        "formulaText": "mg Cl⁻/mL = (V_AgNO₃ × M_AgNO₃ × PM_Cl) / V_muestra",
        "formulaLatex": r"\text{mg Cl}^{-}/\text{mL} = \frac{V_{AgNO_3} \times M_{AgNO_3} \times PM_{Cl}}{V_{muestra}}",
        "variables": [
            {
                "symbol": "V_AgNO3",
                "name": "Volumen de AgNO₃ gastado",
                "unit": "mL",
                "source": "titration_result",
                "description": "Lectura de la bureta al punto final",
            },
            {
                "symbol": "M_AgNO3",
                "name": "Molaridad del AgNO₃",
                "unit": "mol/L",
                "source": "constant",
                "value": 0.010,
            },
            {
                "symbol": "PM_Cl",
                "name": "Peso atómico del Cl⁻",
                "unit": "g/mol",
                "source": "constant",
                "value": 35.45,
            },
            {
                "symbol": "V_muestra",
                "name": "Volumen de muestra",
                "unit": "mL",
                "source": "measurement",
                "description": "Volumen pipeteado de solución salina",
            },
        ],
        "resultUnit": "mg Cl⁻/mL",
        "expectedResult": 0.61,
        "displayExpectedResult": 0.61,
        "tolerance": 2,
        "interpretation": {
            "ranges": [
                {"min": 0, "max": 0.3, "label": "Concentración baja de cloruros", "color": "#4CAF50"},
                {"min": 0.3, "max": 0.8, "label": "Concentración normal de cloruros", "color": "#2196F3"},
                {"min": 0.8, "max": 1.5, "label": "Concentración moderada de cloruros", "color": "#FF9800"},
                {"min": 1.5, "max": 9999, "label": "Concentración alta de cloruros", "color": "#F44336"},
            ],
            "explanation": "La concentración de cloruros se determina por titulación directa con AgNO₃ (argentometría, método de Mohr). Los iones Cl⁻ precipitan como AgCl blanco. Al agotarse los Cl⁻, el exceso de Ag⁺ reacciona con el indicador K₂CrO₄ formando Ag₂CrO₄ de color rojo ladrillo, señalando el punto final.",
        },
    },

    # ── Stage 8: Evaluation ──────────────────────────────────────────────────
    "evaluation": {
        "criteria": [
            {
                "id": "materials",
                "label": "Selección correcta de materiales",
                "weight": 15,
                "type": "boolean",
            },
            {
                "id": "measurement",
                "label": "Medición correcta de la muestra",
                "weight": 10,
                "type": "boolean",
            },
            {
                "id": "assembly",
                "label": "Montaje completo y en orden",
                "weight": 15,
                "type": "boolean",
            },
            {
                "id": "endpoint",
                "label": "Detección del punto final",
                "weight": 25,
                "type": "range",
                "scoring": [
                    {"maxError": 0.2, "score": 25, "feedback": "Excelente: punto final detectado con precisión"},
                    {"maxError": 0.5, "score": 20, "feedback": "Muy bien: punto final cercano al teórico"},
                    {"maxError": 1.0, "score": 15, "feedback": "Aceptable: punto final dentro de tolerancia"},
                    {"maxError": 2.0, "score": 10, "feedback": "Deficiente: punto final alejado del teórico"},
                    {"maxError": 999, "score": 0, "feedback": "Incorrecto: punto final no detectado"},
                ],
            },
            {
                "id": "calculation",
                "label": "Cálculo correcto del resultado",
                "weight": 25,
                "type": "range",
                "scoring": [
                    {"maxError": 1, "score": 25, "feedback": "Cálculo exacto"},
                    {"maxError": 2, "score": 20, "feedback": "Cálculo con error menor al 2%"},
                    {"maxError": 5, "score": 15, "feedback": "Cálculo con error menor al 5%"},
                    {"maxError": 10, "score": 5, "feedback": "Cálculo con error significativo"},
                    {"maxError": 999, "score": 0, "feedback": "Cálculo incorrecto"},
                ],
            },
            {
                "id": "interpretation",
                "label": "Interpretación del resultado",
                "weight": 10,
                "type": "boolean",
            },
        ],
        "maxScore": 100,
        "passingScore": 60,
    },
}
