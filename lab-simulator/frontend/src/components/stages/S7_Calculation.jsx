import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useSimulatorStore from '../../store/useSimulatorStore';
import * as api from '../../api/client';
import CalculationForm from '../ui/CalculationForm';
import Button from '../common/Button';
import '../../styles/stages.css';

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

      // Find interpretation
      if (calc?.interpretation?.ranges) {
        const correctVal = resp.correct_result;
        const range = calc.interpretation.ranges.find(
          (r) => correctVal >= r.min && correctVal < r.max
        );
        setInterpretation(range || null);
      }
    } catch (e) {
      console.error('Error validating calculation:', e);
    }
  };

  const handleAutoCalculate = () => {
    if (!calc || recordedVolume == null || measuredValue == null) return;
    // Practice 5 formula
    const mEdta = 0.01;
    const pmCaCO3 = 100.09;
    const autoResult = (recordedVolume * mEdta * pmCaCO3 * 1000) / measuredValue;
    handleSubmit(Math.round(autoResult * 100) / 100);
  };

  const handleNext = () => {
    setCurrentStage(8);
    navigate(`/practice/${practiceId}/stage/8`);
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
          <div style={{
            padding: '16px',
            background: '#F0F7FF',
            borderRadius: 'var(--radius-md)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.95rem',
            textAlign: 'center',
            marginBottom: '20px',
            lineHeight: 1.8,
            border: '1px solid #BFDBFE',
          }}>
            {calc.formulaText}
          </div>

          <div style={{
            padding: '12px',
            background: 'var(--color-bg)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem',
          }}>
            <div style={{ fontWeight: 500, marginBottom: '8px' }}>Datos experimentales:</div>
            <div style={{ fontFamily: 'var(--font-mono)' }}>
              <div>V_EDTA (tu lectura) = {recordedVolume?.toFixed(2)} mL</div>
              <div>V_muestra = {measuredValue} mL</div>
            </div>
          </div>
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
