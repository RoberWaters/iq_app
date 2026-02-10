import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useSimulatorStore from '../../store/useSimulatorStore';
import * as api from '../../api/client';
import useAssembly from '../../hooks/useAssembly';
import InstructionPanel from '../ui/InstructionPanel';
import AssemblyBench from '../canvas/AssemblyBench';
import Button from '../common/Button';
import '../../styles/stages.css';

export default function S4_Assembly() {
  const navigate = useNavigate();
  const {
    practiceConfig, practiceId, sessionId, measuredValue,
    completedSteps, completeStep,
    setAssemblyCorrect, setCurrentStage,
    setBufferVolume, setIndicatorDrops,
  } = useSimulatorStore();

  const steps = practiceConfig?.assemblySteps || [];
  const assemblyConfig = practiceConfig?.assemblyConfig;
  const maxCapacity = practiceConfig?.measurement?.range?.[1] || 250;

  const {
    currentSubStep, isAnimating,
    erlenmeyerFill, erlenmeyerColor,
    cylinderLevel, bufferAmount, setBufferAmount,
    dropCount, completed,
    confirmStep1, pourWater, pourBuffer,
    addIndicatorDrop, finishAssembly, cleanup,
  } = useAssembly(measuredValue || 100, maxCapacity);

  const [bufferSliderVal, setBufferSliderVal] = useState(
    assemblyConfig?.buffer?.defaultVolume || 10
  );
  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Track completed steps for InstructionPanel
  useEffect(() => {
    if (currentSubStep > 1 && !completedSteps.includes('medir_muestra')) {
      completeStep('medir_muestra');
    }
    if (currentSubStep > 2 && !completedSteps.includes('transferir_erlenmeyer')) {
      completeStep('transferir_erlenmeyer');
    }
    if (currentSubStep > 3 && !completedSteps.includes('agregar_tampon')) {
      completeStep('agregar_tampon');
    }
  }, [currentSubStep, completedSteps, completeStep]);

  // Canvas callback: pour water (step 2 drag)
  const handlePourWater = () => {
    pourWater();
  };

  // Canvas callback: pour buffer (step 3 drag)
  const handlePourBuffer = () => {
    setBufferAmount(bufferSliderVal);
    pourBuffer(bufferSliderVal);
  };

  // Canvas callback: add indicator drop (step 4 click)
  const handleAddDrop = () => {
    addIndicatorDrop();
  };

  const handleFinish = () => {
    if (!completedSteps.includes('agregar_indicador')) {
      completeStep('agregar_indicador');
    }
    finishAssembly();
    setShowSummary(true);

    setBufferVolume(bufferAmount);
    setIndicatorDrops(dropCount);
    setAssemblyCorrect(true);
    api.updateStage(sessionId, 4, { assembly_correct: true }).catch(console.error);
  };

  const handleNext = () => {
    setCurrentStage(5);
    navigate(`/practice/${practiceId}/stage/5`);
  };

  // Warnings
  const bufferThresholds = assemblyConfig?.buffer?.qualityThresholds;
  const indicatorThresholds = assemblyConfig?.indicator?.intensityThresholds;
  const warnings = [];
  if (showSummary) {
    if (bufferThresholds && bufferAmount < bufferThresholds.poor) {
      warnings.push('Poco tampón puede afectar la detección del punto final');
    } else if (bufferThresholds && bufferAmount > bufferThresholds.excess) {
      warnings.push('Exceso de tampón podría interferir con el indicador');
    }
    if (indicatorThresholds && dropCount < indicatorThresholds.faint) {
      warnings.push('Pocas gotas de indicador — el color será tenue y difícil de observar');
    } else if (indicatorThresholds && dropCount > indicatorThresholds.dark) {
      warnings.push('Muchas gotas de indicador — el color será oscuro y difícil de leer');
    }
  }

  const currentStepIndex = Math.min(currentSubStep - 1, steps.length - 1);

  return (
    <div className="stage-container">
      <div className="stage-header">
        <h2>Etapa 4: Montaje del Experimento</h2>
        <p>Realiza los pasos de montaje interactuando con el equipo de laboratorio</p>
      </div>

      <div className="assembly-layout">
        {/* Left: Instructions + Controls */}
        <div>
          <InstructionPanel
            title="Pasos de montaje"
            steps={steps}
            currentStep={currentStepIndex}
          />

          <div className="assembly-substep-controls">
            {/* Sub-step 1: Confirm water measured */}
            {currentSubStep === 1 && (
              <div>
                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: '12px' }}>
                  Agua medida: <strong>{measuredValue || 100} mL</strong> en probeta
                </p>
                <Button onClick={confirmStep1} style={{ width: '100%' }}>
                  Continuar
                </Button>
              </div>
            )}

            {/* Sub-step 2: Drag cylinder to erlenmeyer */}
            {currentSubStep === 2 && (
              <div>
                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                  Vacía el agua de la probeta al Erlenmeyer
                </p>
                <div style={{
                  padding: '10px 14px',
                  background: '#EFF6FF',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid #BFDBFE',
                  fontSize: '0.85rem',
                  color: '#1D4ED8',
                }}>
                  {isAnimating
                    ? 'Vaciando...'
                    : '\u{1F449} Arrastra la probeta hacia el Erlenmeyer en el canvas'}
                </div>
              </div>
            )}

            {/* Sub-step 3: Select buffer amount, then drag */}
            {currentSubStep === 3 && (
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.9rem',
                  color: 'var(--color-text-secondary)',
                  marginBottom: '8px',
                }}>
                  {assemblyConfig?.buffer?.label || 'Solución tampón pH 10'}
                </label>

                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '1.3rem',
                  fontWeight: 600,
                  color: 'var(--color-primary)',
                  textAlign: 'center',
                  marginBottom: '8px',
                }}>
                  {bufferSliderVal} mL
                </div>

                <input
                  type="range"
                  min={0}
                  max={assemblyConfig?.buffer?.range?.[1] || 30}
                  step={1}
                  value={bufferSliderVal}
                  onChange={(e) => setBufferSliderVal(parseInt(e.target.value))}
                  disabled={isAnimating}
                  style={{ width: '100%', marginBottom: '8px' }}
                />

                <div style={{
                  padding: '6px 10px',
                  background: '#EFF6FF',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8rem',
                  color: '#1D4ED8',
                  border: '1px solid #BFDBFE',
                  marginBottom: '8px',
                }}>
                  Se recomiendan {assemblyConfig?.buffer?.defaultVolume || 10} mL
                </div>

                <div style={{
                  padding: '10px 14px',
                  background: '#EFF6FF',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid #BFDBFE',
                  fontSize: '0.85rem',
                  color: '#1D4ED8',
                }}>
                  {isAnimating
                    ? 'Agregando tampón...'
                    : '\u{1F449} Arrastra el vaso de tampón al Erlenmeyer'}
                </div>
              </div>
            )}

            {/* Sub-step 4: Click bottle to add drops */}
            {currentSubStep === 4 && !showSummary && (
              <div>
                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                  {assemblyConfig?.indicator?.label || 'Indicador NET'}
                </p>

                <div className="drop-counter">
                  <span>Gotas:</span>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '1.2rem',
                    fontWeight: 700,
                    color: 'var(--color-primary)',
                  }}>
                    {dropCount}
                  </span>
                </div>

                <div style={{
                  padding: '6px 10px',
                  background: '#EFF6FF',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8rem',
                  color: '#1D4ED8',
                  border: '1px solid #BFDBFE',
                  marginBottom: '8px',
                }}>
                  Se recomiendan {assemblyConfig?.indicator?.defaultDrops || 5} gotas
                </div>

                <div style={{
                  padding: '10px 14px',
                  background: '#EFF6FF',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid #BFDBFE',
                  fontSize: '0.85rem',
                  color: '#1D4ED8',
                  marginBottom: '12px',
                }}>
                  {isAnimating
                    ? 'Agregando gota...'
                    : '\u{1F449} Haz clic sobre el frasco de indicador en el canvas'}
                </div>

                <Button
                  onClick={handleFinish}
                  disabled={dropCount < 1}
                  variant="success"
                  style={{ width: '100%' }}
                >
                  Listo
                </Button>
              </div>
            )}

            {/* Summary after all steps */}
            {showSummary && (
              <div>
                <div style={{
                  padding: '12px 16px',
                  background: '#F0FDF4',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid #BBF7D0',
                  marginBottom: '12px',
                }}>
                  <div style={{ fontWeight: 600, marginBottom: '8px', color: '#166534' }}>
                    Montaje completo
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#15803D', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span>Agua: {measuredValue || 100} mL</span>
                    <span>Tampón pH 10: {bufferAmount} mL</span>
                    <span>Indicador NET: {dropCount} gotas</span>
                  </div>
                </div>

                {warnings.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                    {warnings.map((w, i) => (
                      <div key={i} style={{
                        padding: '8px 12px',
                        background: '#FEF3C7',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.8rem',
                        color: '#92400E',
                        border: '1px solid #FDE68A',
                      }}>
                        {w}
                      </div>
                    ))}
                  </div>
                )}

                <Button onClick={handleNext} variant="success" style={{ width: '100%' }}>
                  Continuar a la titulación
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Interactive Canvas */}
        <div className="titration-canvas-wrapper">
          <AssemblyBench
            width={500}
            height={480}
            currentStep={showSummary ? 5 : currentSubStep}
            isAnimating={isAnimating}
            erlenmeyerColor={erlenmeyerColor}
            erlenmeyerFill={erlenmeyerFill}
            cylinderVolume={cylinderLevel}
            maxCylinderVolume={maxCapacity}
            bufferBeakerVolume={bufferAmount}
            dropColor="#CD5C5C"
            onPourWater={handlePourWater}
            onPourBuffer={handlePourBuffer}
            onAddDrop={handleAddDrop}
          />
        </div>
      </div>
    </div>
  );
}
