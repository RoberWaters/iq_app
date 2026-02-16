PRACTICE_5 = {
    "id": 5,
    "number": 5,
    "name": "Dureza en Agua",
    "fullName": "Determinación de Dureza Total en Agua por Complejometría con EDTA",
    "description": "Se determina la dureza total del agua de la llave mediante valoración complejométrica con EDTA Na₂, usando Negro de Eriocromo T (NET) como indicador metalcrómico a pH 10.",
    "objective": "Determinar la concentración de iones Ca²⁺ y Mg²⁺ expresada como ppm de CaCO₃ mediante titulación con EDTA.",
    "category": "Complejometría",
    "methodType": "directa",
    "difficulty": "media",
    "estimatedTime": "30 minutos",
    "implemented": True,
    "comingSoon": False,

    # Stage 2: Materials
    "requiredInstruments": ["PRO-250", "ERL-250", "BUR-050"],
    "requiredReagents": ["TAMPON-PH10", "IND-NET", "EDTA-001M"],
    "requiredSample": "AGUA-LLAVE",

    "distractorInstruments": ["PRO-100", "ERL-100", "ERL-500", "BUR-025", "PIP-V10"],
    "distractorReagents": ["EDTA-010M", "IND-FENOL", "IND-K2CRO4", "KOH-050M", "HCL-050M"],

    # Stage 3: Measurement
    "measurement": {
        "type": "volume",
        "instrument": "PRO-250",
        "defaultValue": 100,
        "fixedValue": False,
        "range": [10, 250],
        "unit": "mL",
        "label": "Volumen de agua de la llave",
        "instruction": "Medir el volumen de agua de la llave en la probeta de 250 mL (se recomiendan 100 mL)",
    },

    # Stage 4: Assembly
    "assemblySteps": [
        {
            "order": 1,
            "id": "medir_muestra",
            "action": "measure_and_transfer",
            "description": "Medir 100 mL de agua de la llave con la probeta de 250 mL",
            "instrument": "PRO-250",
            "sample": "AGUA-LLAVE",
            "volume": 100,
            "visualBefore": {"containerColor": "#F8F8FF", "label": "Probeta con agua"},
            "visualAfter": {"containerColor": "#F8F8FF", "label": "100 mL medidos"},
        },
        {
            "order": 2,
            "id": "transferir_erlenmeyer",
            "action": "transfer",
            "description": "Colocar los 100 mL en el Erlenmeyer de 250 mL",
            "from": "PRO-250",
            "to": "ERL-250",
            "visualAfter": {"containerColor": "#F8F8FF", "fillLevel": 0.40, "label": "Erlenmeyer con muestra"},
        },
        {
            "order": 3,
            "id": "agregar_tampon",
            "action": "add_reagent",
            "description": "Agregar 10 mL de solución tampón pH 10",
            "reagent": "TAMPON-PH10",
            "volume": 10,
            "unit": "mL",
            "visualAfter": {"containerColor": "#F0F0F0", "fillLevel": 0.44, "label": "pH ajustado a 10"},
        },
        {
            "order": 4,
            "id": "agregar_indicador",
            "action": "add_indicator",
            "description": "Agregar 5 gotas del indicador NET (Negro de Eriocromo T)",
            "reagent": "IND-NET",
            "amount": 5,
            "unit": "gotas",
            "visualAfter": {
                "containerColor": "#CD5C5C",
                "fillLevel": 0.44,
                "label": "Solución rojiza — lista para titular",
                "isTransparent": True,
            },
            "criticalNote": "La solución debe tornarse de color rojizo/vino transparente. Este color indica que el NET está formando complejo con los iones Ca²⁺ y Mg²⁺.",
        },
    ],

    # Assembly configuration for interactive mode
    "assemblyConfig": {
        "buffer": {
            "reagent": "TAMPON-PH10",
            "defaultVolume": 10,
            "range": [0, 30],
            "unit": "mL",
            "label": "Solución tampón pH 10",
            "qualityThresholds": {
                "poor": 5,
                "excess": 20,
            },
        },
        "indicator": {
            "reagent": "IND-NET",
            "defaultDrops": 5,
            "range": [1, 12],
            "unit": "gotas",
            "label": "Indicador NET",
            "intensityThresholds": {
                "faint": 3,
                "dark": 7,
            },
        },
    },

    "preReaction": None,

    # Stage 5: Titration
    "titration": {
        "titrant": "EDTA-001M",
        "titrantConcentration": 0.01,
        "titrantConcentrationUnit": "M",
        "titrantColor": "#F0F0F0",
        "titrantInstrument": "BUR-050",
        "sampleContainer": "ERL-250",
        "maxBuretteVolume": 50,

        "expectedVolume": 6.5,
        "referenceValue": 100,
        "proportionality": "direct",

        "colorTransitions": [
            {"progress": 0.00, "color": "#D07070", "description": "Rojo pálido — inicio"},
            {"progress": 0.20, "color": "#C87080", "description": "Rojizo con tinte"},
            {"progress": 0.40, "color": "#B87090", "description": "Rojo-púrpura"},
            {"progress": 0.60, "color": "#A078A8", "description": "Púrpura"},
            {"progress": 0.75, "color": "#8888B8", "description": "Púrpura-azulado"},
            {"progress": 0.85, "color": "#7898C8", "description": "Azul-violeta"},
            {"progress": 0.92, "color": "#70A0D0", "description": "Azul claro"},
            {"progress": 0.97, "color": "#6B98D8", "description": "Azul"},
            {"progress": 1.00, "color": "#6B90E0", "description": "Azul pálido — PUNTO FINAL"},
            {"progress": 1.05, "color": "#5B80D0", "description": "Azul medio (exceso)"},
            {"progress": 1.15, "color": "#4870C0", "description": "Azul (exceso marcado)"},
        ],

        "endpointDescription": "La solución cambia de color rojizo a azul claro y finalmente a azul intenso limpio. El cambio es gradual cerca del punto final.",
        "solutionIsTransparent": True,
        "precipitate": None,

        "dropVolume": 0.05,
        "streamVolume": 0.50,
        "endpointTolerance": 0.3,
    },

    # Stages 6-7: Calculation
    "calculation": {
        "formulaText": "Dureza (ppm CaCO₃) = (V_EDTA × M_EDTA × PM_CaCO₃ × 1000) / V_muestra",
        "formulaLatex": r"\text{Dureza} = \frac{V_{EDTA} \times M_{EDTA} \times PM_{CaCO_3} \times 1000}{V_{muestra}}",
        "variables": [
            {"symbol": "V_EDTA", "name": "Volumen de EDTA gastado", "unit": "mL", "source": "titration_result", "description": "Lectura de la bureta al punto final"},
            {"symbol": "M_EDTA", "name": "Molaridad del EDTA", "unit": "mol/L", "source": "constant", "value": 0.01},
            {"symbol": "PM_CaCO3", "name": "Peso molecular del CaCO₃", "unit": "g/mol", "source": "constant", "value": 100.09},
            {"symbol": "V_muestra", "name": "Volumen de muestra", "unit": "mL", "source": "measurement", "description": "Volumen de agua medido en la probeta"},
        ],
        "resultUnit": "ppm como CaCO₃",
        "expectedResult": 65.06,
        "displayExpectedResult": 65,
        "tolerance": 2,
        "interpretation": {
            "ranges": [
                {"min": 0, "max": 60, "label": "Agua blanda", "color": "#4CAF50"},
                {"min": 60, "max": 120, "label": "Agua moderadamente dura", "color": "#FFC107"},
                {"min": 120, "max": 180, "label": "Agua dura", "color": "#FF9800"},
                {"min": 180, "max": 9999, "label": "Agua muy dura", "color": "#F44336"},
            ],
            "explanation": "La dureza del agua se debe a la presencia de iones Ca²⁺ y Mg²⁺ disueltos. Según la OMS, agua con 60-120 ppm de CaCO₃ se clasifica como moderadamente dura. El agua analizada tiene ~65 ppm, lo cual es típico de agua potable municipal.",
        },
    },

    # Stage 8: Evaluation
    "evaluation": {
        "criteria": [
            {"id": "materials", "label": "Selección correcta de materiales", "weight": 15, "type": "boolean"},
            {"id": "measurement", "label": "Medición correcta de la muestra", "weight": 10, "type": "boolean"},
            {"id": "assembly", "label": "Montaje completo y en orden", "weight": 15, "type": "boolean"},
            {
                "id": "endpoint", "label": "Detección del punto final", "weight": 25, "type": "range",
                "scoring": [
                    {"maxError": 0.1, "score": 25, "feedback": "Excelente: punto final detectado con precisión"},
                    {"maxError": 0.3, "score": 20, "feedback": "Muy bien: punto final cercano al teórico"},
                    {"maxError": 0.5, "score": 15, "feedback": "Aceptable: punto final dentro de tolerancia"},
                    {"maxError": 1.0, "score": 10, "feedback": "Deficiente: punto final alejado del teórico"},
                    {"maxError": 999, "score": 0, "feedback": "Incorrecto: punto final no detectado"},
                ],
            },
            {
                "id": "calculation", "label": "Cálculo correcto del resultado", "weight": 25, "type": "range",
                "scoring": [
                    {"maxError": 1, "score": 25, "feedback": "Cálculo exacto"},
                    {"maxError": 2, "score": 20, "feedback": "Cálculo con error menor al 2%"},
                    {"maxError": 5, "score": 15, "feedback": "Cálculo con error menor al 5%"},
                    {"maxError": 10, "score": 5, "feedback": "Cálculo con error significativo"},
                    {"maxError": 999, "score": 0, "feedback": "Cálculo incorrecto"},
                ],
            },
            {"id": "interpretation", "label": "Interpretación del resultado", "weight": 10, "type": "boolean"},
        ],
        "maxScore": 100,
        "passingScore": 60,
    },
}
