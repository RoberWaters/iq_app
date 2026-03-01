import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import useSimulatorStore from '../../store/useSimulatorStore';
import * as api from '../../api/client';
import { calculatePractice4, calculatePractice5 } from '../../utils/chemistryCalculations';
import CalculationForm from '../ui/CalculationForm';
import Button from '../common/Button';
import '../../styles/stages.css';

const formulaMap = {
  4: calculatePractice4,
  5: calculatePractice5,
};

function LatexFormula({ latex }) {
  const html = katex.renderToString(latex, { throwOnError: false, displayMode: true });
  return (
    <div
      style={{
        padding: '16px',
        background: '#F0F7FF',
        borderRadius: 'var(--radius-md)',
        textAlign: 'center',
        marginBottom: '20px',
        border: '1px solid #BFDBFE',
        overflowX: 'auto',
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export default function S7_Calculation() {
  const navigate = useNavigate();
  const {
    practiceConfig, practiceId, sessionId,
    recordedVolume, measuredValue,
    setCalculationResults, setCurrentStage,
  } = useSimulatorStore();

  const [result, setResult] = useState(null);
  const [interpretation, setInterpretation] = useState(null);
  const calc = practiceConfig?.calculation;

  const handleSubmit = async (studentResult) => {
    try {
      const resp = await api.validateCalculation(sessionId, studentResult);
      setResult(resp);
      setCalculationResults(studentResult, resp.correct_result, resp.percent_error);

      if (calc?.interpretation?.ranges) {
        const range = calc.interpretation.ranges.find(
          (r) => resp.correct_result >= r.min && resp.correct_result < r.max
        );
        setInterpretation(range || null);
      }
    } catch (e) {
      console.error('Error validating calculation:', e);
    }
  };

  const handleAutoCalculate = () => {
    if (!calc || recordedVolume == null || measuredValue == null) return;
    const autoCalc = formulaMap[practiceId];
    if (!autoCalc) return;
    const autoResult = autoCalc(recordedVolume, measuredValue);
    handleSubmit(Math.round(autoResult * 100) / 100);
  };

  const handleNext = () => {
    setCurrentStage(8);
    navigate(`/practice/${practiceId}/stage/8`);  // → S8 Análisis (curva)
  };

  if (!calc) return <div className="stage-container"><p>Configuración no disponible</p></div>;

  return (
    <div className="stage-container">
      <div className="stage-header">
        <h2>Etapa 7: Cálculo y Análisis</h2>
        <p>Utiliza la fórmula para calcular el resultado</p>
      </div>

      <div className="calculation-layout">
        <div className="formula-panel">
          <h3 style={{ marginBottom: '16px' }}>Fórmula</h3>
          <LatexFormula latex={calc.formulaLatex} />
        </div>

        <div className="result-panel">
          <CalculationForm
            variables={calc.variables}
            onSubmit={handleSubmit}
            onAutoCalculate={handleAutoCalculate}
            result={result}
          />

          {interpretation && (
            <div style={{
              marginTop: '16px',
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              background: interpretation.color + '15',
              border: `1px solid ${interpretation.color}40`,
            }}>
              <div style={{ fontWeight: 600, color: interpretation.color, marginBottom: '4px' }}>
                {interpretation.label}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                {calc.interpretation.explanation}
              </div>
            </div>
          )}

          {result && (
            <div style={{ marginTop: '16px' }}>
              <Button onClick={handleNext} style={{ width: '100%' }}>
                Continuar a la evaluación
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
