PRACTICE_2 = {
    "id": 2,
    "number": 2,
    "name": "Índice de Saponificación",
    "fullName": "Determinación del Índice de Saponificación de una Grasa",
    "description": "Valoración por retroceso para determinar los mg de KOH necesarios para saponificar 1 g de grasa. Se añade KOH en exceso, se refluja, y el exceso se valora con HCl 0.50 M.",
    "objective": "Determinar el índice de saponificación de una grasa mediante retrotitulación: se hace reaccionar la grasa con un exceso conocido de KOH 0.50 M a reflujo, y el KOH no consumido se valora con HCl 0.50 M usando fenolftaleína.",
    "category": "Ácido-Base",
    "methodType": "retrotitulación",
    "difficulty": "media",
    "estimatedTime": "50 minutos",
    "implemented": True,
    "comingSoon": False,

    # Stage 2: Materials
    "requiredInstruments": ["BAL-001", "MAT-250", "BUR-050", "COND-AHL"],
    "requiredReagents": ["KOH-050M", "HCL-050M", "IND-FENOL"],
    "requiredSample": None,   # sample is chosen by student in S3 (G1/G2/G3)

    "distractorInstruments": ["ERL-250", "PRO-250", "PIP-V10", "BEA-250"],
    "distractorReagents": ["EDTA-001M", "TAMPON-PH10", "IND-NET", "KSCN-008M"],

    # Stage 3: Measurement — analytical balance, ~1 g of fat
    # Student picks one of three fat samples (G1/G2/G3) and weighs it.
    # The sample choice is recorded as selectedSampleId; the mass as measuredValue.
    "measurement": {
        "type": "mass",
        "instrument": "BAL-001",
        "defaultValue": 1.000,
        "fixedValue": False,
        "range": [0.850, 1.150],   # g
        "unit": "g",
        "label": "Masa de grasa (balanza analítica)",
        "instruction": "Pesar aproximadamente 1 g de la grasa seleccionada en la balanza analítica. La masa exacta se usará en el cálculo.",
        "sampleOptions": ["GRASA-G1", "GRASA-G2", "GRASA-G3"],
        "sampleLabel": "Selecciona la grasa a analizar:",
    },

    # Stage 4: Sequential assembly — reflux mode
    # Steps: transfer fat → add KOH → attach condenser → reflux → cool → add indicator
    "assemblySteps": [
        {
            "order": 1,
            "id": "transferir_grasa",
            "action": "weigh_and_transfer",
            "description": "Transferir la grasa pesada al matraz de 250 mL",
            "visualAfter": {
                "fillLevel": 0.01,
                "containerColor": "#FFFDE0",
                "label": "Grasa en matraz",
                "condenserOn": False,
            },
        },
        {
            "order": 2,
            "id": "agregar_koh",
            "action": "add_reagent",
            "description": "Agregar 25 mL de KOH 0.50 M al matraz",
            "reagent": "KOH-050M",
            "volume": 25,
            "unit": "mL",
            "criticalNote": "El KOH se agrega en exceso. Todo el KOH que NO reaccione con la grasa será valorado con HCl en la etapa de titulación.",
            "visualAfter": {
                "fillLevel": 0.10,
                "containerColor": "#F4F8F4",
                "label": "Grasa + KOH 0.50 M",
                "condenserOn": False,
            },
        },
        {
            "order": 3,
            "id": "colocar_condensador",
            "action": "attach_condenser",
            "description": "Instalar el condensador de Ahlin sobre el matraz y conectar el agua de refrigeración",
            "instrument": "COND-AHL",
            "criticalNote": "El condensador evita la pérdida de disolvente por evaporación durante el calentamiento y devuelve los vapores condensados al matraz.",
            "visualAfter": {
                "fillLevel": 0.10,
                "containerColor": "#F4F8F4",
                "label": "Condensador instalado",
                "condenserOn": True,
            },
        },
        {
            "order": 4,
            "id": "reflujo",
            "action": "reflux",
            "description": "Calentar a reflujo durante 30 minutos para completar la saponificación",
            "criticalNote": "El reflujo permite que el KOH saponifique completamente los ésteres de la grasa. El tiempo es crítico para la reacción completa.",
            "visualAfter": {
                "fillLevel": 0.10,
                "containerColor": "#FFFCE8",
                "label": "Saponificación completa",
                "condenserOn": True,
            },
        },
        {
            "order": 5,
            "id": "enfriar",
            "action": "cool",
            "description": "Retirar el calor y dejar enfriar a temperatura ambiente",
            "visualAfter": {
                "fillLevel": 0.10,
                "containerColor": "#F0F8F0",
                "label": "Matraz frío",
                "condenserOn": False,
            },
        },
        {
            "order": 6,
            "id": "agregar_indicador",
            "action": "add_indicator",
            "description": "Agregar unas gotas de fenolftaleína como indicador ácido-base",
            "reagent": "IND-FENOL",
            "visualAfter": {
                "fillLevel": 0.10,
                "containerColor": "#E91E8C",
                "label": "Listo para titular — fucsia",
                "condenserOn": False,
            },
        },
    ],

    # No interactive assembly sliders; sequential click-based + reflux animations
    "assemblyConfig": None,
    "assemblyMode": "reflux",

    "preReaction": None,

    # Stage 5: Titration with HCl 0.50 M
    # The solution turns from fuchsia (phenolphthalein in alkaline KOH) to colorless at endpoint.
    # Proportionality: inverse — less fat mass → more excess KOH → more HCl needed.
    # Expected HCl volume per fat at reference mass = 1.000 g:
    #   G1: 17.94 mL → IS ≈ 198 mg KOH/g
    #   G2: 16.98 mL → IS ≈ 225 mg KOH/g
    #   G3: 18.20 mL → IS ≈ 191 mg KOH/g
    "titration": {
        "titrant": "HCL-050M",
        "titrantConcentration": 0.50,
        "titrantConcentrationUnit": "M",
        "titrantColor": "#F8F8FF",
        "dropColor": "#F8F8FF",
        "titrantInstrument": "BUR-050",
        "sampleContainer": "MAT-250",
        "maxBuretteVolume": 50,

        "expectedVolume": 17.94,      # fallback (G1 at 1.000 g)
        "referenceValue": 1.000,      # reference mass in grams
        "proportionality": "inverse", # less mass → more HCl

        "volumesBySample": {
            "GRASA-G1": 17.94,
            "GRASA-G2": 16.98,
            "GRASA-G3": 18.20,
        },

        "flaskFillLevel": 0.18,

        "colorTransitions": [
            {"progress": 0.00, "color": "#E91E8C", "description": "Fucsia intenso — KOH en exceso"},
            {"progress": 0.20, "color": "#EC407A", "description": "Fucsia"},
            {"progress": 0.40, "color": "#EF5E8C", "description": "Fucsia claro"},
            {"progress": 0.60, "color": "#F48FB1", "description": "Rosa pálido"},
            {"progress": 0.75, "color": "#F8BBD0", "description": "Rosa muy pálido"},
            {"progress": 0.88, "color": "#FCE4EC", "description": "Levemente rosado"},
            {"progress": 0.95, "color": "#FFF0F5", "description": "Casi incoloro"},
            {"progress": 1.00, "color": "#FFFFFF", "description": "Incoloro — PUNTO FINAL"},
            {"progress": 1.05, "color": "#FFFFFF", "description": "Incoloro (exceso de HCl)"},
            {"progress": 1.15, "color": "#FFFFFF", "description": "Incoloro"},
        ],

        "endpointDescription": "La solución cambia de fucsia a incolora al añadir la primera gota en exceso de HCl. El cambio es brusco y permanente (la fenolftaleína vira de color a pH < 8.2).",
        "solutionIsTransparent": True,

        "dropVolume": 0.05,
        "streamVolume": 0.50,
        "endpointTolerance": 0.5,
    },

    # Stage 7: Calculation
    # IS (Índice de Saponificación) = [(V_KOH × M_KOH) − (V_HCl × M_HCl)] × PM_KOH × 1000 / m_grasa
    # where V in L, M in mol/L, PM_KOH = 56.11 g/mol, m_grasa in g
    # Result: mg KOH per gram of fat
    "calculation": {
        "formulaText": "IS = [(V_KOH × M_KOH) − (V_HCl × M_HCl)] × PM_KOH × 1000 / m_grasa",
        "formulaLatex": r"\text{IS} = \frac{[(V_{KOH} \times M_{KOH}) - (V_{HCl} \times M_{HCl})] \times PM_{KOH} \times 1000}{m_{grasa}}",
        "variables": [
            {"symbol": "V_KOH",  "name": "Volumen de KOH agregado",    "unit": "mL",    "source": "constant",        "value": 25,   "description": "25 mL de KOH 0.50 M agregados en exceso"},
            {"symbol": "M_KOH",  "name": "Molaridad del KOH",          "unit": "mol/L", "source": "constant",        "value": 0.50},
            {"symbol": "V_HCl",  "name": "Volumen de HCl gastado",      "unit": "mL",    "source": "titration_result","description": "Lectura de la bureta al punto final"},
            {"symbol": "M_HCl",  "name": "Molaridad del HCl",           "unit": "mol/L", "source": "constant",        "value": 0.50},
            {"symbol": "PM_KOH", "name": "Peso molar del KOH",          "unit": "g/mol", "source": "constant",        "value": 56.11},
            {"symbol": "m_grasa","name": "Masa de grasa pesada",        "unit": "g",     "source": "measurement",     "description": "Masa registrada en la balanza analítica"},
        ],
        "resultUnit": "mg KOH/g grasa",
        "expectedResult": 198.07,    # G1 at 1.000 g
        "displayExpectedResult": 198.1,
        "tolerance": 5,
        "interpretation": {
            "ranges": [
                {"min": 0,   "max": 180, "label": "IS muy bajo — posible contaminación o adulteración", "color": "#F44336"},
                {"min": 180, "max": 215, "label": "IS típico de aceites vegetales (oliva, palma)",       "color": "#4CAF50"},
                {"min": 215, "max": 250, "label": "IS típico de mantecas animales (mantequilla, sebo)",  "color": "#2196F3"},
                {"min": 250, "max": 280, "label": "IS alto — típico de aceite de coco o palmiste",       "color": "#FF9800"},
                {"min": 280, "max": 9999,"label": "IS muy alto — posible error de análisis",             "color": "#F44336"},
            ],
            "explanation": "El índice de saponificación (IS) indica la cantidad de KOH en mg necesaria para saponificar 1 g de grasa. Valores típicos: aceite de oliva 184–196, mantequilla 210–232, aceite de coco 248–265. Un IS mayor indica ácidos grasos de cadena más corta o mayor insaponificable.",
        },
    },

    # Stage 8: Evaluation
    "evaluation": {
        "criteria": [
            {"id": "materials",    "label": "Selección correcta de materiales",         "weight": 15, "type": "boolean"},
            {"id": "measurement",  "label": "Pesada correcta de la muestra",             "weight": 10, "type": "boolean"},
            {"id": "assembly",     "label": "Montaje y reflujo completados en orden",    "weight": 15, "type": "boolean"},
            {
                "id": "endpoint", "label": "Detección del punto final",                  "weight": 35, "type": "range",
                "scoring": [
                    {"maxError": 0.2, "score": 35, "feedback": "Excelente: punto final detectado con precisión"},
                    {"maxError": 0.5, "score": 28, "feedback": "Muy bien: punto final cercano al teórico"},
                    {"maxError": 1.0, "score": 21, "feedback": "Aceptable: punto final dentro de tolerancia"},
                    {"maxError": 2.0, "score": 14, "feedback": "Deficiente: punto final alejado del teórico"},
                    {"maxError": 999, "score": 0,  "feedback": "Incorrecto: punto final no detectado"},
                ],
            },
            {
                "id": "calculation", "label": "Cálculo correcto del IS",                "weight": 15, "type": "range",
                "scoring": [
                    {"maxError": 1,  "score": 15, "feedback": "Cálculo exacto"},
                    {"maxError": 2,  "score": 12, "feedback": "Cálculo con error menor al 2%"},
                    {"maxError": 5,  "score": 9,  "feedback": "Cálculo con error menor al 5%"},
                    {"maxError": 10, "score": 3,  "feedback": "Cálculo con error significativo"},
                    {"maxError": 999,"score": 0,  "feedback": "Cálculo incorrecto"},
                ],
            },
            {"id": "interpretation","label": "Interpretación del índice de saponificación","weight": 10, "type": "boolean"},
        ],
        "maxScore": 100,
        "passingScore": 60,
    },
}
