import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useSimulatorStore from '../../store/useSimulatorStore';
import * as api from '../../api/client';
import MeasurementBench from '../canvas/MeasurementBench';
import Button from '../common/Button';
import '../../styles/stages.css';

export default function S3_Measurement() {
  const navigate = useNavigate();
  const { practiceConfig, practiceId, sessionId, setMeasurement, setCurrentStage } = useSimulatorStore();
  const measurement = practiceConfig?.measurement;

  const [volume, setVolume] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const [isFilling, setIsFilling] = useState(false);

  const fillInterval = useRef(null);

  const minVal = measurement?.range?.[0] || 10;
  const maxVal = measurement?.range?.[1] || 250;

  // Hold-to-fill logic
  const startFilling = useCallback(() => {
    if (confirmed) return;
    fillInterval.current = setInterval(() => {
      setVolume(prev => {
        const next = prev + 2;
        return next > maxVal ? maxVal : Math.round(next * 10) / 10;
      });
    }, 100);
  }, [confirmed, maxVal]);

  const stopFilling = useCallback(() => {
    if (fillInterval.current) {
      clearInterval(fillInterval.current);
      fillInterval.current = null;
    }
  }, []);

  // Safety net: always stop filling on any pointer/mouse release globally
  useEffect(() => {
    const handleGlobalUp = () => stopFilling();
    window.addEventListener('pointerup', handleGlobalUp);
    window.addEventListener('mouseup', handleGlobalUp);
    window.addEventListener('touchend', handleGlobalUp);
    return () => {
      stopFilling();
      window.removeEventListener('pointerup', handleGlobalUp);
      window.removeEventListener('mouseup', handleGlobalUp);
      window.removeEventListener('touchend', handleGlobalUp);
    };
  }, [stopFilling]);

  const adjustVolume = (delta) => {
    if (confirmed) return;
    setVolume(prev => {
      const next = Math.round((prev + delta) * 10) / 10;
      return Math.max(0, Math.min(maxVal, next));
    });
  };

  const handleReset = () => {
    if (confirmed) return;
    setVolume(0);
  };

  const handleConfirm = async () => {
    if (volume < minVal) return;
    try {
      await api.updateMeasurement(sessionId, volume, measurement?.unit || 'mL');
      setMeasurement(volume, measurement?.unit || 'mL');
      setConfirmed(true);
    } catch (e) {
      console.error('Error updating measurement:', e);
    }
  };

  const handleNext = () => {
    setCurrentStage(4);
    navigate(`/practice/${practiceId}/stage/4`);
  };

  if (!measurement) return <div className="stage-container"><p>Configuración no disponible</p></div>;

  return (
    <div className="stage-container">
      <div className="stage-header">
        <h2>Etapa 3: Medición de Muestra</h2>
        <p>{measurement.instruction}</p>
      </div>

      <div className="measurement-interactive-layout">
        {/* Left: Canvas */}
        <div className="measurement-canvas-wrapper">
          <MeasurementBench
            width={400}
            height={450}
            currentVolume={volume}
            maxVolume={maxVal}
          />
        </div>

        {/* Right: Controls */}
        <div className="measurement-controls-panel">
          {/* Volume readout */}
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '2.5rem',
            fontWeight: 700,
            color: 'var(--color-primary)',
            textAlign: 'center',
            marginBottom: '8px',
          }}>
            {volume.toFixed(1)} mL
          </div>

          {/* Hold-to-fill button */}
          <Button
            onPointerDown={startFilling}
            onPointerUp={stopFilling}
            onPointerLeave={stopFilling}
            onPointerCancel={stopFilling}
            disabled={confirmed}
            variant="primary"
            style={{ width: '100%', touchAction: 'none' }}
            className="fill-button"
          >
            Abrir llave (mantener)
          </Button>

          {/* Fine-tune buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button onClick={() => adjustVolume(-5)} disabled={confirmed} variant="outline" style={{ flex: 1 }}>
              -5
            </Button>
            <Button onClick={() => adjustVolume(-1)} disabled={confirmed} variant="outline" style={{ flex: 1 }}>
              -1
            </Button>
            <Button onClick={() => adjustVolume(1)} disabled={confirmed} variant="outline" style={{ flex: 1 }}>
              +1
            </Button>
            <Button onClick={() => adjustVolume(5)} disabled={confirmed} variant="outline" style={{ flex: 1 }}>
              +5
            </Button>
          </div>

          {/* Range slider */}
          <div>
            <input
              type="range"
              min={0}
              max={maxVal}
              step={0.5}
              value={volume}
              onChange={(e) => !confirmed && setVolume(parseFloat(e.target.value))}
              disabled={confirmed}
              style={{ width: '100%' }}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              color: 'var(--color-text-secondary)',
            }}>
              <span>0 mL</span>
              <span>{maxVal} mL</span>
            </div>
          </div>

          {/* Reset */}
          <Button onClick={handleReset} variant="outline" disabled={confirmed} style={{ width: '100%' }}>
            Vaciar
          </Button>

          {/* Recommendation hint */}
          <div style={{
            padding: '10px 14px',
            background: '#EFF6FF',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem',
            color: '#1D4ED8',
            border: '1px solid #BFDBFE',
          }}>
            Se recomiendan {measurement.defaultValue || 100} mL
          </div>

          {/* Warning if outside recommended */}
          {volume > 0 && volume !== (measurement.defaultValue || 100) && !confirmed && (
            <div style={{
              padding: '8px 12px',
              background: '#FEF3C7',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8rem',
              color: '#92400E',
              border: '1px solid #FDE68A',
            }}>
              Valor no estándar — el volumen esperado de titulante cambiará proporcionalmente
            </div>
          )}

          {/* Confirm / Continue */}
          {confirmed ? (
            <>
              <div style={{
                padding: '10px 14px',
                background: '#F0FDF4',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-success)',
                fontWeight: 500,
                fontSize: '0.9rem',
                textAlign: 'center',
              }}>
                Medición registrada: {volume.toFixed(1)} {measurement.unit}
              </div>
              <Button onClick={handleNext} variant="success" style={{ width: '100%' }}>
                Continuar al montaje
              </Button>
            </>
          ) : (
            <Button
              onClick={handleConfirm}
              disabled={volume < minVal}
              style={{ width: '100%' }}
            >
              Confirmar medición
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
