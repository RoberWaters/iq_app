import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useSimulatorStore from '../../store/useSimulatorStore';
import * as api from '../../api/client';
import MeasurementBench from '../canvas/MeasurementBench';
import PipetteBench from '../canvas/PipetteBench';
import AnalyticalBalance from '../canvas/AnalyticalBalance';
import Button from '../common/Button';
import { INSTRUMENTS } from '../../data/catalog';
import '../../styles/stages.css';

// Sample labels for mass measurement (fat samples)
const SAMPLE_LABELS = {
  'GRASA-G1': 'Grasa G1',
  'GRASA-G2': 'Grasa G2',
  'GRASA-G3': 'Grasa G3',
};

export default function S3_Measurement() {
  const navigate = useNavigate();
  const {
    practiceConfig, practiceId, sessionId,
    setMeasurement, setSelectedSampleId, setCurrentStage,
  } = useSimulatorStore();
  const measurement = practiceConfig?.measurement;
  const isFixed = measurement?.fixedValue === true;
  const isMass = measurement?.type === 'mass';

  const [volume, setVolume] = useState(isFixed ? (measurement?.defaultValue || 10) : 0);
  const [confirmed, setConfirmed] = useState(false);
  const [isFilling, setIsFilling] = useState(false);

  // Mass measurement state (P2)
  const defaultSample = measurement?.sampleOptions?.[0] || null;
  const [selectedSample, setSelectedSample] = useState(defaultSample);
  const massMin = measurement?.range?.[0] || 0.850;
  const massMax = measurement?.range?.[1] || 1.150;
  const massDefault = measurement?.defaultValue || 1.000;
  const [mass, setMass] = useState(massDefault);

  const fillInterval = useRef(null);

  const minVal = measurement?.range?.[0] || 10;
  const maxVal = measurement?.range?.[1] || 250;

  // Hold-to-fill logic (only for interactive mode)
  const startFilling = useCallback(() => {
    if (confirmed || fillInterval.current || isFixed) return;
    setIsFilling(true);
    fillInterval.current = setInterval(() => {
      setVolume(prev => {
        const next = prev + 2;
        return next > maxVal ? maxVal : Math.round(next * 10) / 10;
      });
    }, 100);
  }, [confirmed, maxVal, isFixed]);

  const stopFilling = useCallback(() => {
    setIsFilling(false);
    if (fillInterval.current) {
      clearInterval(fillInterval.current);
      fillInterval.current = null;
    }
  }, []);

  // Safety net: always stop filling on any pointer/mouse release globally
  useEffect(() => {
    if (isFixed) return;
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
  }, [stopFilling, isFixed]);

  const adjustVolume = (delta) => {
    if (confirmed || isFixed) return;
    setVolume(prev => {
      const next = Math.round((prev + delta) * 10) / 10;
      return Math.max(0, Math.min(maxVal, next));
    });
  };

  const handleReset = () => {
    if (confirmed || isFixed) return;
    setVolume(0);
  };

  // Called when PipetteBench drag-transfer completes (fixed mode)
  const handleTransferComplete = async () => {
    try {
      await api.updateMeasurement(sessionId, volume, measurement?.unit || 'mL');
      setMeasurement(volume, measurement?.unit || 'mL');
      setConfirmed(true);
    } catch (e) {
      console.error('Error updating measurement:', e);
    }
  };

  const handleConfirm = async () => {
    if (!isFixed && volume < minVal) return;
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

  const handleConfirmMass = async () => {
    if (!selectedSample) return;
    try {
      await api.updateMeasurement(sessionId, mass, measurement?.unit || 'g', selectedSample);
      setMeasurement(mass, measurement?.unit || 'g');
      setSelectedSampleId(selectedSample);
      setConfirmed(true);
    } catch (e) {
      console.error('Error updating measurement:', e);
    }
  };

  if (!measurement) return <div className="stage-container"><p>Configuración no disponible</p></div>;

  // Mass measurement mode (P2 — analytical balance + fat sample selection)
  if (isMass) {
    return (
      <div className="stage-container">
        <div className="stage-header">
          <h2>Etapa 3: Pesada de la Muestra</h2>
          <p>{measurement.instruction || 'Selecciona la grasa y pesa aproximadamente 1 g en la balanza analítica.'}</p>
        </div>

        <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* Left: controls */}
          <div style={{ flex: '1 1 260px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Sample selector */}
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '8px' }}>
                {measurement.sampleLabel || 'Selecciona la grasa a analizar:'}
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {(measurement.sampleOptions || []).map((sId) => (
                  <button
                    key={sId}
                    onClick={() => !confirmed && setSelectedSample(sId)}
                    disabled={confirmed}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 'var(--radius-md)',
                      border: `2px solid ${selectedSample === sId ? 'var(--color-primary)' : '#CBD5E1'}`,
                      background: selectedSample === sId ? '#EFF6FF' : '#F8FAFC',
                      color: selectedSample === sId ? 'var(--color-primary)' : 'var(--color-text)',
                      fontWeight: selectedSample === sId ? 600 : 400,
                      cursor: confirmed ? 'default' : 'pointer',
                      fontSize: '0.9rem',
                    }}
                  >
                    {SAMPLE_LABELS[sId] || sId}
                  </button>
                ))}
              </div>
            </div>

            {/* Mass readout */}
            <div style={{
              padding: '24px',
              background: '#F0F7FF',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid #BFDBFE',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                Masa registrada
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '2.4rem',
                fontWeight: 700,
                color: 'var(--color-primary)',
              }}>
                {mass.toFixed(4)} g
              </div>
            </div>

            {/* Slider */}
            {!confirmed && (
              <div>
                <input
                  type="range"
                  min={massMin}
                  max={massMax}
                  step={0.0001}
                  value={mass}
                  onChange={(e) => setMass(parseFloat(e.target.value))}
                  style={{ width: '100%' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                  <span>{massMin.toFixed(3)} g</span>
                  <span>{massMax.toFixed(3)} g</span>
                </div>
              </div>
            )}

            {/* Fine-tune buttons */}
            {!confirmed && (
              <div style={{ display: 'flex', gap: '6px' }}>
                {[-0.010, -0.001, +0.001, +0.010].map((d) => (
                  <Button
                    key={d}
                    onClick={() => setMass(m => Math.max(massMin, Math.min(massMax, Math.round((m + d) * 10000) / 10000)))}
                    variant="outline"
                    style={{ flex: 1, fontSize: '0.8rem' }}
                  >
                    {d > 0 ? '+' : ''}{d.toFixed(3)}
                  </Button>
                ))}
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
                  Pesada registrada: {mass.toFixed(4)} g ({SAMPLE_LABELS[selectedSample] || selectedSample})
                </div>
                <Button onClick={handleNext} variant="success" style={{ width: '100%' }}>
                  Continuar al montaje
                </Button>
              </>
            ) : (
              <Button
                onClick={handleConfirmMass}
                disabled={!selectedSample}
                style={{ width: '100%' }}
              >
                Registrar pesada
              </Button>
            )}
          </div>

          {/* Right: realistic analytical balance canvas */}
          <div style={{ flex: '0 0 auto' }}>
            <AnalyticalBalance
              width={420}
              height={340}
              mass={mass}
              hasSample={!!selectedSample}
              sampleLabel={SAMPLE_LABELS[selectedSample] || selectedSample || ''}
              sampleColor="#F5E6C8"
            />
          </div>
        </div>
      </div>
    );
  }

  // Fixed measurement mode — drag-based pipette canvas (no buttons)
  if (isFixed) {
    return (
      <div className="stage-container">
        <div className="stage-header">
          <h2>Etapa 3: Medición de Muestra</h2>
          <p>{measurement.instruction}</p>
        </div>

        <div style={{
          display: 'flex',
          gap: '24px',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
        }}>
          {/* Canvas: pipette + sample beaker + flask */}
          <div style={{ flex: '0 0 auto' }}>
            <PipetteBench
              width={420}
              height={400}
              onTransferComplete={handleTransferComplete}
              pipetteVolume={measurement?.defaultValue || 10}
              flaskLabel={INSTRUMENTS[practiceConfig?.titration?.sampleContainer]?.name || "Matraz 50 mL"}
            />
          </div>

          {/* Right panel: info */}
          <div style={{
            flex: '1 1 200px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            paddingTop: '8px',
          }}>
            {/* Volume badge */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '28px 20px',
              background: '#F0F7FF',
              borderRadius: 'var(--radius-lg, 12px)',
              border: '1px solid #BFDBFE',
              textAlign: 'center',
            }}>
              <div>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '2.2rem',
                  fontWeight: 700,
                  color: 'var(--color-primary)',
                }}>
                  {measurement.defaultValue} {measurement.unit}
                </div>
                <div style={{
                  fontSize: '0.85rem',
                  color: 'var(--color-text-secondary)',
                  marginTop: '4px',
                }}>
                  {measurement.label}
                </div>
              </div>
            </div>

            {/* Info box */}
            <div style={{
              padding: '12px 16px',
              background: '#EFF6FF',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              color: '#1D4ED8',
              border: '1px solid #BFDBFE',
            }}>
              La pipeta volumétrica entrega exactamente {measurement.defaultValue} {measurement.unit} de muestra con precisión analítica.
            </div>

            {/* Continue (appears after drag-transfer completes) */}
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
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  // Interactive measurement mode (P5 and similar)
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
            isFilling={isFilling}
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
