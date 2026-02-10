import { useNavigate } from 'react-router-dom';
import useSimulatorStore from '../../store/useSimulatorStore';
import Button from '../common/Button';
import '../../styles/stages.css';

export default function S6_Recording() {
  const navigate = useNavigate();
  const { practiceId, practiceConfig, recordedVolume, setCurrentStage } = useSimulatorStore();

  const expectedVolume = practiceConfig?.titration?.expectedVolume || 0;
  const diff = recordedVolume != null ? Math.abs(recordedVolume - expectedVolume) : null;

  const handleNext = () => {
    setCurrentStage(7);
    navigate(`/practice/${practiceId}/stage/7`);
  };

  return (
    <div className="stage-container">
      <div className="stage-header">
        <h2>Etapa 6: Registro del Resultado</h2>
        <p>Confirma tu lectura de bureta</p>
      </div>

      <div className="recording-layout">
        <div className="recording-card">
          <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
            Tu lectura registrada
          </div>
          <div className="recording-value">
            {recordedVolume != null ? recordedVolume.toFixed(2) : '---'} mL
          </div>

          <div style={{
            display: 'flex', flexDirection: 'column', gap: '8px',
            margin: '20px 0', padding: '16px',
            background: 'var(--color-bg)', borderRadius: 'var(--radius-md)',
            fontSize: '0.9rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Gasto registrado:</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                {recordedVolume?.toFixed(2)} mL
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Gasto teórico:</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                {expectedVolume.toFixed(2)} mL
              </span>
            </div>
            {diff != null && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Diferencia:</span>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontWeight: 600,
                  color: diff <= 0.3 ? 'var(--color-success)' : diff <= 1.0 ? 'var(--color-warning)' : 'var(--color-error)',
                }}>
                  {diff.toFixed(2)} mL
                </span>
              </div>
            )}
          </div>

          <Button onClick={handleNext} style={{ width: '100%' }}>
            Continuar al cálculo
          </Button>
        </div>
      </div>
    </div>
  );
}
