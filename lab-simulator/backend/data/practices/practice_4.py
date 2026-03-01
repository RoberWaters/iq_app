PRACTICE_4 = {
    "id": 4,
    "number": 4,
    "name": "Método de Volhard",
    "fullName": "Determinación de Cloruros en Solución Salina. Método de Volhard",
    "description": "Determinación de cloruros en solución salina mediante retrotitulación con KSCN 0.08 M, usando alumbre férrico como indicador (método de Volhard).",
    "objective": "Determinar la concentración de cloruros en una solución salina de concentración desconocida mediante retrotitulación del exceso de AgNO₃ con KSCN, utilizando alumbre férrico como indicador.",
    "category": "Precipitación",
    "methodType": "retrotitulación",
    "difficulty": "media",
    "estimatedTime": "40 minutos",
    "implemented": True,
    "comingSoon": False,

    # Stage 2: Materials
    "requiredInstruments": ["PIP-V10", "MAT-050", "BUR-050", "PAP-ALU"],
    "requiredReagents": ["AGUA-DEST", "HNO3-1A1", "AGNO3-010M", "NITROBENZ", "IND-ALUMFE", "KSCN-008M"],
    "requiredSample": "SOL-SAL-2",

    "distractorInstruments": ["PRO-250", "ERL-250", "PIP-V25", "BEA-250"],
    "distractorReagents": ["AGNO3-001M", "IND-K2CRO4", "EDTA-001M", "TAMPON-PH10"],

    # Stage 3: Measurement — fixed pipette 10 mL (no interactive fill)
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

    # Stage 4: Assembly — 7 sequential steps per spec
    # Order: muestra → agua destilada → HNO₃ → AgNO₃ 50 mL → papel aluminio → nitrobenceno → indicador
    "assemblySteps": [
        {
            "order": 1,
            "id": "medir_muestra",
            "action": "measure_and_transfer",
            "description": "Pipetear 10 mL de solución salina al matraz de 50 mL",
            "instrument": "PIP-V10",
            "sample": "SOL-SAL-2",
            "volume": 10,
            "visualAfter": {
                "containerColor": "#F8F8FF",
                "fillLevel": 0.14,
                "label": "10 mL muestra",
            },
        },
        {
            "order": 2,
            "id": "agregar_agua",
            "action": "add_reagent",
            "description": "Agregar 10 mL de agua destilada",
            "reagent": "AGUA-DEST",
            "volume": 10,
            "unit": "mL",
            "visualAfter": {
                "containerColor": "#F8F8FF",
                "fillLevel": 0.27,
                "label": "Muestra diluida",
            },
        },
        {
            "order": 3,
            "id": "agregar_hno3",
            "action": "add_reagent",
            "description": "Agregar 1 mL de HNO₃ 1:1 para acidificar",
            "reagent": "HNO3-1A1",
            "volume": 1,
            "unit": "mL",
            "visualAfter": {
                "containerColor": "#F8F8FF",
                "fillLevel": 0.29,
                "label": "Medio ácido",
            },
        },
        {
            "order": 4,
            "id": "agregar_agno3",
            "action": "add_reagent",
            "description": "Agregar 50 mL de AgNO₃ 0.10 M (exceso conocido)",
            "reagent": "AGNO3-010M",
            "volume": 50,
            "unit": "mL",
            "criticalNote": "El AgNO₃ se agrega en EXCESO para asegurar la precipitación completa de los cloruros como AgCl. Se forma un precipitado blanco.",
            "visualAfter": {
                "containerColor": "#F5F5E8",
                "fillLevel": 0.78,
                "label": "Precipitado AgCl blanco",
                "precipitate": {"type": "granular", "color": "#FFFFFF", "opacity": 0.8},
            },
        },
        {
            "order": 5,
            "id": "tapar_aluminio",
            "action": "cover",
            "description": "Tapar el matraz con papel aluminio",
            "instrument": "PAP-ALU",
            "criticalNote": "El papel aluminio protege la solución de la luz, ya que el AgCl es fotosensible y se oscurece con la luz solar.",
            "visualAfter": {
                "containerColor": "#F5F5E8",
                "fillLevel": 0.78,
                "label": "Protegido de la luz",
                "precipitate": {"type": "granular", "color": "#FFFFFF", "opacity": 0.8},
                "foilCovered": True,
            },
        },
        {
            "order": 6,
            "id": "agregar_nitrobenceno",
            "action": "add_reagent",
            "description": "Agregar 1 mL de nitrobenceno y agitar vigorosamente",
            "reagent": "NITROBENZ",
            "volume": 1,
            "unit": "mL",
            "criticalNote": "El nitrobenceno recubre el precipitado de AgCl impidiendo que reaccione con el KSCN durante la retrotitulación. El precipitado se ve más compacto, como encapsulado.",
            "visualAfter": {
                "containerColor": "#F8F8E8",
                "fillLevel": 0.80,
                "label": "Precipitado encapsulado",
                "precipitate": {"type": "compact", "color": "#F0F0E0", "opacity": 0.6},
                "foilCovered": True,
            },
        },
        {
            "order": 7,
            "id": "agregar_indicador",
            "action": "add_indicator",
            "description": "Agregar 1 mL (20 gotas) de alumbre férrico como indicador",
            "reagent": "IND-ALUMFE",
            "amount": 1,
            "unit": "mL",
            "visualAfter": {
                "containerColor": "#FFF8E0",
                "fillLevel": 0.83,
                "label": "Listo para titular — beige pálido",
                "precipitate": {"type": "compact", "color": "#F0F0E0", "opacity": 0.6},
                "foilCovered": True,
            },
        },
    ],

    # No interactive assembly config (no buffer/indicator sliders)
    "assemblyConfig": None,

    "preReaction": None,

    # Stage 5: Titration with KSCN 0.08 M
    "titration": {
        "titrant": "KSCN-008M",
        "titrantConcentration": 0.08,
        "titrantConcentrationUnit": "M",
        "titrantColor": "#F0F0F0",
        "dropColor": "#F0F0F0",
        "titrantInstrument": "BUR-050",
        "sampleContainer": "MAT-050",
        "maxBuretteVolume": 50,

        "expectedVolume": 16.93,
        "referenceValue": 10,
        "proportionality": "fixed",

        # Flask fill level during titration (post-assembly: ~73 mL in flask)
        "flaskFillLevel": 0.85,

        "colorTransitions": [
            {"progress": 0.00, "color": "#FFF8E0", "description": "Beige pálido — inicio"},
            {"progress": 0.10, "color": "#FFF6D8", "description": "Beige claro"},
            {"progress": 0.25, "color": "#FFF4D0", "description": "Beige"},
            {"progress": 0.40, "color": "#FFF2C8", "description": "Beige cálido"},
            {"progress": 0.55, "color": "#FFF0C0", "description": "Beige amarillento"},
            {"progress": 0.70, "color": "#FFEEB8", "description": "Amarillo pálido"},
            {"progress": 0.85, "color": "#FFECB0", "description": "Amarillo crema"},
            {"progress": 0.93, "color": "#FFE8D0", "description": "Crema rosáceo"},
            {"progress": 0.97, "color": "#FFE0D0", "description": "Rosa muy pálido"},
            {"progress": 1.00, "color": "#FFD8C8", "description": "Rosa salmón tenue — PUNTO FINAL"},
            {"progress": 1.05, "color": "#FFC8B8", "description": "Rosa salmón (exceso)"},
            {"progress": 1.15, "color": "#FFB0A0", "description": "Rosa rojizo (exceso marcado)"},
        ],

        "endpointDescription": "La solución cambia de beige pálido a un tenue rosa salmón persistente. El complejo Fe(SCN)²⁺ rojizo indica el exceso de tiocianato. El cambio es muy sutil — un tenue color rojo marca el punto final.",
        "solutionIsTransparent": False,

        # Two precipitate layers visible during titration:
        # 1) Compact AgCl encapsulated by nitrobenzene (from assembly)
        # 2) Granular AgSCN that forms progressively during titration
        "precipitate": {
            "layers": [
                {"type": "compact", "color": "#F0F0E0", "opacity": 0.5, "density": 0.6},
                {"type": "granular", "color": "#FFFFFF", "opacity": 0.7, "density": 0.5, "dynamic": True},
            ],
        },

        "dropVolume": 0.05,
        "streamVolume": 0.50,
        "endpointTolerance": 0.5,
    },

    # Stages 6-7: Calculation
    "calculation": {
        "formulaText": "mg Cl⁻/mL = [(V_AgNO₃ × M_AgNO₃) − (V_KSCN × M_KSCN)] × PM_Cl / V_muestra",
        "formulaLatex": r"\text{mg Cl}^{-}/\text{mL} = \frac{(V_{AgNO_3} \times M_{AgNO_3}) - (V_{KSCN} \times M_{KSCN}) \times PM_{Cl}}{V_{muestra}}",
        "variables": [
            {"symbol": "V_AgNO3", "name": "Volumen de AgNO₃ agregado", "unit": "mL", "source": "constant", "value": 50, "description": "Volumen de AgNO₃ 0.10 M agregado en exceso"},
            {"symbol": "M_AgNO3", "name": "Molaridad del AgNO₃", "unit": "mol/L", "source": "constant", "value": 0.10},
            {"symbol": "V_KSCN", "name": "Volumen de KSCN gastado", "unit": "mL", "source": "titration_result", "description": "Lectura de la bureta al punto final"},
            {"symbol": "M_KSCN", "name": "Molaridad del KSCN", "unit": "mol/L", "source": "constant", "value": 0.08},
            {"symbol": "PM_Cl", "name": "Peso atómico del Cl⁻", "unit": "g/mol", "source": "constant", "value": 35.45},
            {"symbol": "V_muestra", "name": "Volumen de muestra", "unit": "mL", "source": "measurement", "description": "Volumen pipeteado de solución salina"},
        ],
        "resultUnit": "mg Cl⁻/mL",
        "expectedResult": 12.92,
        "displayExpectedResult": 12.9,
        "tolerance": 2,
        "interpretation": {
            "ranges": [
                {"min": 0, "max": 5, "label": "Concentración baja de cloruros", "color": "#4CAF50"},
                {"min": 5, "max": 15, "label": "Concentración normal de cloruros", "color": "#2196F3"},
                {"min": 15, "max": 30, "label": "Concentración alta de cloruros", "color": "#FF9800"},
                {"min": 30, "max": 9999, "label": "Concentración muy alta de cloruros", "color": "#F44336"},
            ],
            "explanation": "La concentración de cloruros se determina por retrotitulación. Se agrega un exceso conocido de AgNO₃ (50 mL × 0.10 M) que precipita los Cl⁻ como AgCl. El precipitado se encapsula con nitrobenceno. El exceso de Ag⁺ remanente se valora con KSCN 0.08 M. El alumbre férrico actúa como indicador: al consumirse todo el Ag⁺ en exceso, la primera gota extra de KSCN forma el complejo Fe(SCN)²⁺ de color rojo tenue.",
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
                    {"maxError": 0.2, "score": 25, "feedback": "Excelente: punto final detectado con precisión"},
                    {"maxError": 0.5, "score": 20, "feedback": "Muy bien: punto final cercano al teórico"},
                    {"maxError": 1.0, "score": 15, "feedback": "Aceptable: punto final dentro de tolerancia"},
                    {"maxError": 2.0, "score": 10, "feedback": "Deficiente: punto final alejado del teórico"},
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
