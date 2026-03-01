import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useSimulatorStore from '../../store/useSimulatorStore';
import Button from '../common/Button';
import '../../styles/stages.css';

export default function S8_TitrationCurve() {
  const navigate = useNavigate();
  const { sessionId, practiceId, setCurrentStage } = useSimulatorStore();
  const [imgError, setImgError] = useState(false);

  const curveBase = `/api/sessions/${sessionId}/titration-curve`;

  const handleNext = () => {
    setCurrentStage(9);
    navigate(`/practice/${practiceId}/stage/9`);
  };

  return (
    <div className="stage-container">
      <div className="stage-header">
        <h2>Etapa 8: Análisis de la Titulación</h2>
        <p>Curva teórica calculada a partir de los equilibrios químicos de la práctica</p>
      </div>

      {imgError ? (
        <div style={{
          padding: '40px', textAlign: 'center',
          color: 'var(--color-text-secondary)',
          border: '1px dashed var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          marginBottom: '24px',
        }}>
          No hay curva de titulación disponible para esta práctica.
        </div>
      ) : (
        <div style={{
          background: '#fff',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}>
          <img
            src={curveBase}
            alt="Curva de titulación teórica"
            onError={() => setImgError(true)}
            style={{ width: '100%', maxWidth: '820px', display: 'block', margin: '0 auto' }}
          />

          <div style={{
            display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'center',
          }}>
            <a href={`${curveBase}?format=svg`} download="curva_titulacion.svg">
              <Button variant="outline" size="sm">Descargar SVG</Button>
            </a>
            <a href={`${curveBase}?format=png`} download="curva_titulacion.png">
              <Button variant="outline" size="sm">Descargar PNG</Button>
            </a>
          </div>
        </div>
      )}

      <div style={{ textAlign: 'center' }}>
        <Button onClick={handleNext}>
          Continuar a la evaluación
        </Button>
      </div>
    </div>
  );
}
