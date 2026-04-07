import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useSimulatorStore from '../../store/useSimulatorStore';
import * as api from '../../api/client';
import useAssembly from '../../hooks/useAssembly';
import useSequentialAssembly from '../../hooks/useSequentialAssembly';
import InstructionPanel from '../ui/InstructionPanel';
import AssemblyBench from '../canvas/AssemblyBench';
import SequentialAssemblyBench from '../canvas/SequentialAssemblyBench';
import RefluxBench from '../canvas/RefluxBench';
import BottleBench from '../canvas/BottleBench';
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
  const assemblyMode = practiceConfig?.assemblyMode || null;

  // Determine assembly mode: interactive (P5-style with buffer/indicator sliders)
  // vs sequential (P4-style click-to-add steps, also used for reflux P2-style)
  const isInteractive = !!assemblyConfig?.buffer;

  // Interactive assembly hook (only used for P5-style)
  const maxCapacity = practiceConfig?.measurement?.range?.[1] || 250;
  const interactiveAssembly = useAssembly(measuredValue || 100, maxCapacity);

  // Sequential assembly hook (only used for P4-style)
  const initialFlaskState = practiceConfig?.initialFlaskState || null;
  const sequentialAssembly = useSequentialAssembly(steps, initialFlaskState);

  if (isInteractive) {
    return (
      <InteractiveAssemblyView
        steps={steps}
        assemblyConfig={assemblyConfig}
        assembly={interactiveAssembly}
        measuredValue={measuredValue}
        practiceId={practiceId}
        sessionId={sessionId}
        completedSteps={completedSteps}
        completeStep={completeStep}
        setAssemblyCorrect={setAssemblyCorrect}
        setCurrentStage={setCurrentStage}
        setBufferVolume={setBufferVolume}
        setIndicatorDrops={setIndicatorDrops}
        maxCapacity={maxCapacity}
        navigate={navigate}
      />
    );
  }

  return (
    <SequentialAssemblyView
      steps={steps}
      assembly={sequentialAssembly}
      assemblyMode={assemblyMode}
      practiceId={practiceId}
      sessionId={sessionId}
      completedSteps={completedSteps}
      completeStep={completeStep}
      setAssemblyCorrect={setAssemblyCorrect}
      setCurrentStage={setCurrentStage}
      navigate={navigate}
      initialFlaskState={initialFlaskState}
    />
  );
}

// ─── Interactive Assembly (P5 style) ────────────────────────────────────────

function InteractiveAssemblyView({
  steps, assemblyConfig, assembly, measuredValue,
  practiceId, sessionId, completedSteps, completeStep,
  setAssemblyCorrect, setCurrentStage,
  setBufferVolume, setIndicatorDrops, maxCapacity,
  navigate,
}) {
  const {
    currentSubStep, isAnimating,
    erlenmeyerFill, erlenmeyerColor,
    cylinderLevel, bufferAmount,
    dropCount, pendingAdvance,
    pourWater, holdPourWater, stopPourWater, confirmAdvance, completeBuffer,
    addIndicatorDrop, finishAssembly, cleanup, reset,
    // Stirrer state
    stirrerOn, stirBarInFlask, stirrerSpeed,
    toggleStirrer, setStirBarInFlask, setStirrerSpeed,
    // Spot state
    spotColor, spotOpacity,
  } = assembly;
  const [showSummary, setShowSummary] = useState(false);
  const [pouringStep1, setPouringStep1] = useState(false);

  // ── Bottle measurement state for sub-step 2 (buffer from amber bottle) ──
  const bufferStep = steps[1]; // second step = buffer (index 1)
  const isBottleBuffer = bufferStep?.action === 'measure_with_bottle';
  const bottleCapacity = bufferStep?.cylinderCapacity || 25;
  const bottleTarget = bufferStep?.volume || 10;

  const [bottleVolume, setBottleVolume] = useState(0);
  const [bottleFilling, setBottleFilling] = useState(false);
  const [cylinderDraining, setCylinderDraining] = useState(false);
  const [drainStarted, setDrainStarted] = useState(false);
  const [originalDrainVolume, setOriginalDrainVolume] = useState(0);
  const bottleInterval = useRef(null);
  const drainInterval = useRef(null);
  const drainDelayTimeout = useRef(null);
  const fillDelayTimeout = useRef(null);

  const fillIncrement = bottleCapacity <= 10 ? 0.05 : bottleCapacity >= 100 ? 0.8 : 0.2;
  const drainIncrement = bottleCapacity <= 10 ? 0.05 : bottleCapacity >= 100 ? 1.0 : 0.3;
  const minDrainThreshold = bottleCapacity <= 10 ? 0.1 : 1;

  // Phase 1: Fill cylinder from bottle
  const startBottleFill = useCallback(() => {
    if (currentSubStep !== 2 || drainStarted || bottleInterval.current || fillDelayTimeout.current) return;
    setBottleFilling(true);
    // Wait for the bottle tilt animation to bring its spout over the cylinder
    fillDelayTimeout.current = setTimeout(() => {
      fillDelayTimeout.current = null;
      bottleInterval.current = setInterval(() => {
        setBottleVolume(prev => {
          const next = prev + fillIncrement;
          return next > bottleCapacity ? bottleCapacity : Math.round(next * 100) / 100;
        });
      }, 100);
    }, 600);
  }, [currentSubStep, drainStarted, bottleCapacity, fillIncrement]);

  const stopBottleFill = useCallback(() => {
    setBottleFilling(false);
    if (fillDelayTimeout.current) {
      clearTimeout(fillDelayTimeout.current);
      fillDelayTimeout.current = null;
    }
    if (bottleInterval.current) {
      clearInterval(bottleInterval.current);
      bottleInterval.current = null;
    }
  }, []);

  // Phase 2: Drain cylinder to flask
  const startCylinderDrain = useCallback(() => {
    if (currentSubStep !== 2 || bottleFilling || drainInterval.current || drainDelayTimeout.current) return;
    if (!drainStarted && bottleVolume < minDrainThreshold) return;
    if (bottleVolume <= 0) return;
    if (!drainStarted) {
      setDrainStarted(true);
      setOriginalDrainVolume(bottleVolume);
    }
    setCylinderDraining(true);
    // Wait for the cylinder tilt to bring its spout over the flask mouth
    drainDelayTimeout.current = setTimeout(() => {
      drainDelayTimeout.current = null;
      drainInterval.current = setInterval(() => {
        setBottleVolume(prev => {
          const next = Math.round((prev - drainIncrement) * 100) / 100;
          if (next <= 0) {
            clearInterval(drainInterval.current);
            drainInterval.current = null;
            setCylinderDraining(false);
            return 0;
          }
          return next;
        });
      }, 100);
    }, 650);
  }, [currentSubStep, bottleFilling, bottleVolume, drainStarted, drainIncrement, minDrainThreshold]);

  const stopCylinderDrain = useCallback(() => {
    setCylinderDraining(false);
    if (drainDelayTimeout.current) {
      clearTimeout(drainDelayTimeout.current);
      drainDelayTimeout.current = null;
    }
    if (drainInterval.current) {
      clearInterval(drainInterval.current);
      drainInterval.current = null;
    }
  }, []);

  // Complete buffer step when drain reaches 0
  useEffect(() => {
    if (currentSubStep === 2 && drainStarted && bottleVolume <= 0 && !cylinderDraining) {
      const drainedAmount = originalDrainVolume;
      const targetFill = bufferStep?.visualAfter?.fillLevel || 0.44;
      setTimeout(() => completeBuffer(drainedAmount, targetFill), 100);
    }
  }, [currentSubStep, drainStarted, bottleVolume, cylinderDraining, originalDrainVolume, completeBuffer, bufferStep]);

  // Global pointer release listener for bottle interactions
  useEffect(() => {
    if (currentSubStep !== 2 || !isBottleBuffer) return;
    const handleUp = () => {
      stopBottleFill();
      stopCylinderDrain();
    };
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchend', handleUp);
    return () => {
      handleUp();
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchend', handleUp);
    };
  }, [stopBottleFill, stopCylinderDrain, currentSubStep, isBottleBuffer]);

  // Global pointer release for sub-step 1 hold-to-pour
  useEffect(() => {
    if (currentSubStep !== 1) return;
    const handleUp = () => { stopPourWater(); setPouringStep1(false); };
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchend', handleUp);
    return () => {
      handleUp();
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchend', handleUp);
    };
  }, [currentSubStep, stopPourWater]);

  const adjustBottle = useCallback((delta) => {
    if (drainStarted || bottleFilling) return;
    const newVol = Math.max(0, Math.min(bottleCapacity, Math.round((bottleVolume + delta) * 10) / 10));
    if (newVol === bottleVolume) return;
    setBottleVolume(newVol);
    setBottleFilling(true);
    setTimeout(() => setBottleFilling(false), 600);
  }, [drainStarted, bottleFilling, bottleVolume, bottleCapacity]);

  const resetBottle = () => {
    if (drainStarted) return;
    setBottleVolume(0);
  };

  // Flask fill for BottleBench during drain
  const initialFlaskFill = erlenmeyerFill;
  const targetFlaskFill = bufferStep?.visualAfter?.fillLevel || 0.44;
  const drainFraction = drainStarted && originalDrainVolume > 0
    ? Math.max(0, 1 - bottleVolume / originalDrainVolume)
    : 0;
  const computedFlaskFill = initialFlaskFill + drainFraction * (targetFlaskFill - initialFlaskFill);

  const handleReset = () => {
    reset();
    setBottleVolume(0);
    setBottleFilling(false);
    setCylinderDraining(false);
    setDrainStarted(false);
    setOriginalDrainVolume(0);
    if (bottleInterval.current) { clearInterval(bottleInterval.current); bottleInterval.current = null; }
    if (drainInterval.current) { clearInterval(drainInterval.current); drainInterval.current = null; }
    setShowSummary(false);
  };

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Track completed steps for InstructionPanel
  useEffect(() => {
    if (currentSubStep > 1 && !completedSteps.includes('transferir_erlenmeyer')) {
      completeStep('transferir_erlenmeyer');
    }
    if (currentSubStep > 2 && !completedSteps.includes('agregar_tampon')) {
      completeStep('agregar_tampon');
    }
  }, [currentSubStep, completedSteps, completeStep]);

  const handlePourWater = () => pourWater();
  const handleAddDrop = () => addIndicatorDrop();

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
            {/* Reset button — available during all sub-steps */}
            <div style={{ marginBottom: '12px', textAlign: 'right' }}>
              <button
                onClick={handleReset}
                disabled={isAnimating}
                style={{
                  background: 'none',
                  border: '1px solid #CBD5E1',
                  borderRadius: 'var(--radius-md)',
                  padding: '4px 12px',
                  fontSize: '0.8rem',
                  color: 'var(--color-text-secondary)',
                  cursor: isAnimating ? 'not-allowed' : 'pointer',
                  opacity: isAnimating ? 0.4 : 1,
                }}
              >
                Reiniciar montaje
              </button>
            </div>

            {/* Sub-step 1: Hold the cylinder in the canvas to pour */}
            {currentSubStep === 1 && !pendingAdvance && (
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
                  Mantén presionada la probeta en el canvas para vaciarla en el Erlenmeyer
                </div>
              </div>
            )}

            {/* Sub-step 1: Continuar after pouring water */}
            {currentSubStep === 1 && pendingAdvance && (
              <div>
                <div style={{
                  padding: '10px 14px',
                  background: '#F0FDF4',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid #BBF7D0',
                  fontSize: '0.85rem',
                  color: '#166534',
                  marginBottom: '10px',
                }}>
                  ✓ Agua transferida al Erlenmeyer
                </div>
                <Button
                  onClick={confirmAdvance}
                  variant="primary"
                  style={{ width: '100%' }}
                >
                  Continuar
                </Button>
              </div>
            )}

            {/* Sub-step 2: Measure buffer from amber bottle */}
            {currentSubStep === 2 && !drainStarted && (
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
                  fontSize: '2rem',
                  fontWeight: 700,
                  color: 'var(--color-primary)',
                  textAlign: 'center',
                  marginBottom: '8px',
                }}>
                  {bottleVolume.toFixed(1)} mL
                </div>

                <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                  <Button onClick={() => adjustBottle(-0.1)} variant="outline" style={{ flex: 1 }} disabled={bottleFilling || bottleVolume < 0.1}>-0.1</Button>
                  <Button onClick={() => adjustBottle(0.1)} variant="outline" style={{ flex: 1 }} disabled={bottleFilling || bottleVolume >= bottleCapacity}>+0.1</Button>
                </div>

                <Button onClick={resetBottle} variant="outline" style={{ width: '100%', marginBottom: '8px' }} disabled={bottleFilling || bottleVolume < 0.1}>
                  Vaciar probeta
                </Button>

                <div style={{
                  padding: '8px 12px',
                  background: '#EFF6FF',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.85rem',
                  color: '#1D4ED8',
                  border: '1px solid #BFDBFE',
                  marginBottom: '8px',
                }}>
                  Se recomiendan {bottleTarget} mL
                </div>

                <div style={{
                  padding: '10px 14px',
                  background: '#EFF6FF',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid #BFDBFE',
                  fontSize: '0.85rem',
                  color: '#1D4ED8',
                }}>
                  {bottleVolume < minDrainThreshold
                    ? 'Mantén presionado el frasco en el canvas para llenar la probeta'
                    : 'Mantén presionada la probeta en el canvas para verter al matraz'
                  }
                </div>
              </div>
            )}

            {/* Sub-step 2: Draining to flask */}
            {currentSubStep === 2 && drainStarted && !pendingAdvance && (
              <div>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '1.8rem',
                  fontWeight: 700,
                  color: 'var(--color-primary)',
                  textAlign: 'center',
                  marginBottom: '8px',
                }}>
                  {bottleVolume.toFixed(1)} mL
                </div>
                <div style={{
                  padding: '10px 14px',
                  background: '#EFF6FF',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid #BFDBFE',
                  fontSize: '0.85rem',
                  color: '#1D4ED8',
                }}>
                  {bottleVolume > 0
                    ? 'Mantén presionada la probeta para verter al matraz'
                    : 'Vertido completo'
                  }
                </div>
              </div>
            )}

            {/* Sub-step 2: Continuar after buffer drain */}
            {currentSubStep === 2 && pendingAdvance && (
              <div>
                <div style={{
                  padding: '10px 14px',
                  background: '#F0FDF4',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid #BBF7D0',
                  fontSize: '0.85rem',
                  color: '#166534',
                  marginBottom: '10px',
                }}>
                  ✓ Tampón pH 10 agregado al Erlenmeyer
                </div>
                <Button
                  onClick={confirmAdvance}
                  variant="primary"
                  style={{ width: '100%' }}
                >
                  Continuar
                </Button>
              </div>
            )}

            {/* Sub-step 3: Click bottle to add drops */}
            {currentSubStep === 3 && !showSummary && (
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
                  marginBottom: '8px',
                }}>
                  Haz clic sobre el frasco de indicador en el canvas
                </div>

                {dropCount > 0 && !(stirrerOn && stirBarInFlask) && (
                  <div style={{
                    padding: '8px 12px',
                    background: '#FEF3C7',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.8rem',
                    color: '#92400E',
                    border: '1px solid #FDE68A',
                    marginBottom: '8px',
                  }}>
                    Enciende el agitador magnético para mezclar uniformemente
                  </div>
                )}

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
          {currentSubStep === 1 ? (
            <BottleBench
              width={600}
              height={480}
              currentVolume={cylinderLevel}
              maxVolume={maxCapacity}
              isFilling={false}
              liquidColor="#C8E4F4"
              showBottle={false}
              showFlask={true}
              flaskFillLevel={erlenmeyerFill}
              flaskLiquidColor={erlenmeyerColor}
              isDraining={pouringStep1}
              onCylinderPress={() => { setPouringStep1(true); holdPourWater(); }}
            />
          ) : currentSubStep === 2 && isBottleBuffer ? (
            <BottleBench
              width={600}
              height={480}
              currentVolume={bottleVolume}
              maxVolume={bottleCapacity}
              isFilling={bottleFilling}
              liquidColor={bufferStep?.liquidColor || '#E8E0D0'}
              sampleName={bufferStep?.bottleLabel || 'Tampón\npH 10'}
              showFlask={true}
              flaskFillLevel={computedFlaskFill}
              flaskLiquidColor={erlenmeyerColor}
              isDraining={cylinderDraining}
              onBottlePress={startBottleFill}
              onCylinderPress={startCylinderDrain}
              bottleStyle={bufferStep?.bottleStyle || 'amber'}
            />
          ) : (
            <AssemblyBench
              width={500}
              height={currentSubStep === 3 || showSummary ? 550 : 480}
              currentStep={showSummary ? 5 : currentSubStep === 1 ? 2 : currentSubStep === 3 ? 4 : currentSubStep}
              isAnimating={isAnimating}
              erlenmeyerColor={erlenmeyerColor}
              erlenmeyerFill={erlenmeyerFill}
              cylinderVolume={cylinderLevel}
              maxCylinderVolume={maxCapacity}
              dropColor="#CD5C5C"
              onPourWater={handlePourWater}
              onAddDrop={handleAddDrop}
              stirrerOn={stirrerOn}
              stirBarInFlask={stirBarInFlask}
              stirrerSpeed={stirrerSpeed}
              onToggleStirrer={toggleStirrer}
              onPlaceBar={() => setStirBarInFlask(true)}
              onRemoveBar={() => setStirBarInFlask(false)}
              onSpeedUp={() => setStirrerSpeed(stirrerSpeed + 1)}
              onSpeedDown={() => setStirrerSpeed(stirrerSpeed - 1)}
              spotColor={spotColor}
              spotOpacity={spotOpacity}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sequential Assembly (P4/P2 style) ──────────────────────────────────────

const ACTION_LABELS = {
  cover: 'Tapar con aluminio',
  attach_condenser: 'Instalar condensador',
  cool: 'Enfriar a temperatura ambiente',
  reflux: 'Iniciar reflujo (30 min)',
  weigh_and_transfer: 'Transferir al matraz',
  add_reagent: 'Agregar reactivo',
  add_indicator: 'Agregar indicador',
  measure_with_bottle: 'Medir y agregar',
};

const ANIMATING_LABELS = {
  cover: 'Cubriendo...',
  attach_condenser: 'Instalando condensador...',
  cool: 'Enfriando...',
  reflux: 'Reflujo en curso...',
  weigh_and_transfer: 'Transfiriendo...',
  add_reagent: 'Agregando reactivo...',
  add_indicator: 'Añadiendo indicador...',
  measure_with_bottle: 'Vertiendo al matraz...',
};

function getActionLabel(action) {
  return ACTION_LABELS[action] || 'Ejecutar paso';
}

function getAnimatingLabel(action) {
  return ANIMATING_LABELS[action] || 'Procesando...';
}

function SequentialAssemblyView({
  steps, assembly, assemblyMode,
  practiceId, sessionId, completedSteps, completeStep,
  setAssemblyCorrect, setCurrentStage,
  navigate, initialFlaskState,
}) {
  const {
    currentStepIndex, currentStep, totalSteps,
    isAnimating, completed, flaskState,
    executeStep, cleanup, reset,
    pendingAdvance, confirmAdvance,
    isDropStep, dropCount, isDropping, addDrop, finishDrops,
    refluxing, completeReflux,
  } = assembly;

  const [showSummary, setShowSummary] = useState(false);

  // ── Bottle measurement state (for measure_with_bottle steps) ───────────
  // Phase 1: hold bottle on canvas → fill cylinder
  // Phase 2: hold cylinder on canvas → pour to flask
  const isBottleStep = currentStep?.action === 'measure_with_bottle';
  const [bottleVolume, setBottleVolume] = useState(0);
  const [bottleFilling, setBottleFilling] = useState(false);
  const [cylinderDraining, setCylinderDraining] = useState(false);
  const [drainStarted, setDrainStarted] = useState(false);
  const [originalDrainVolume, setOriginalDrainVolume] = useState(0);
  const bottleInterval = useRef(null);
  const drainInterval = useRef(null);

  const bottleCapacity = currentStep?.cylinderCapacity || 25;

  // ── Auto-drop state (for add_indicator steps) ─────────────────────────
  const [autoDropTarget, setAutoDropTarget] = useState('');
  const [autoDropping, setAutoDropping] = useState(false);
  const autoDropRef = useRef(null);
  const autoDropCountRef = useRef(0);
  const autoDropTargetRef = useRef(0);
  const bottleTarget = currentStep?.volume || 10;

  // Fill/drain increments scale with cylinder capacity
  const fillIncrement = bottleCapacity <= 10 ? 0.05 : bottleCapacity >= 100 ? 0.8 : 0.2;
  const drainIncrement = bottleCapacity <= 10 ? 0.05 : bottleCapacity >= 100 ? 1.0 : 0.3;

  // ── Phase 1: Fill cylinder (hold bottle on canvas) ────────────
  const startBottleFill = useCallback(() => {
    if (drainStarted || bottleInterval.current) return;
    setBottleFilling(true);
    bottleInterval.current = setInterval(() => {
      setBottleVolume(prev => {
        const next = prev + fillIncrement;
        return next > bottleCapacity ? bottleCapacity : Math.round(next * 100) / 100;
      });
    }, 100);
  }, [drainStarted, bottleCapacity, fillIncrement]);

  const stopBottleFill = useCallback(() => {
    setBottleFilling(false);
    if (bottleInterval.current) {
      clearInterval(bottleInterval.current);
      bottleInterval.current = null;
    }
  }, []);

  // ── Phase 2: Drain cylinder to flask (hold cylinder on canvas) ──
  const minDrainThreshold = bottleCapacity <= 10 ? 0.1 : 1;

  const startCylinderDrain = useCallback(() => {
    if (bottleFilling || bottleVolume < minDrainThreshold || drainInterval.current) return;
    if (!drainStarted) {
      setDrainStarted(true);
      setOriginalDrainVolume(bottleVolume);
    }
    setCylinderDraining(true);
    drainInterval.current = setInterval(() => {
      setBottleVolume(prev => {
        const next = Math.round((prev - drainIncrement) * 100) / 100;
        if (next <= 0) {
          setTimeout(() => executeStep(), 50);
          clearInterval(drainInterval.current);
          drainInterval.current = null;
          setCylinderDraining(false);
          return 0;
        }
        return next;
      });
    }, 100);
  }, [bottleFilling, bottleVolume, drainStarted, executeStep, drainIncrement, minDrainThreshold]);

  const stopCylinderDrain = useCallback(() => {
    setCylinderDraining(false);
    if (drainInterval.current) {
      clearInterval(drainInterval.current);
      drainInterval.current = null;
    }
  }, []);

  // Global release listener — stops both fill and drain
  useEffect(() => {
    if (!isBottleStep) return;
    const handleUp = () => {
      stopBottleFill();
      stopCylinderDrain();
    };
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchend', handleUp);
    return () => {
      handleUp();
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchend', handleUp);
    };
  }, [stopBottleFill, stopCylinderDrain, isBottleStep]);

  const adjustBottle = useCallback((delta) => {
    if (drainStarted || bottleFilling) return;
    const newVol = Math.max(0, Math.min(bottleCapacity, Math.round((bottleVolume + delta) * 10) / 10));
    if (newVol === bottleVolume) return;
    setBottleVolume(newVol);
    // Trigger bottle tilt animation briefly
    setBottleFilling(true);
    setTimeout(() => setBottleFilling(false), 600);
  }, [drainStarted, bottleFilling, bottleVolume, bottleCapacity]);

  const resetBottle = () => {
    if (drainStarted) return;
    setBottleVolume(0);
  };

  // Compute flask fill level for BottleBench
  // Use current flaskState (evolves after each step) so fill is cumulative
  const initialFill = flaskState?.fillLevel || 0.08;
  const targetFill = currentStep?.visualAfter?.fillLevel || 0.14;
  const drainFraction = drainStarted && originalDrainVolume > 0
    ? Math.max(0, 1 - bottleVolume / originalDrainVolume)
    : 0;
  const computedFlaskFill = initialFill + drainFraction * (targetFill - initialFill);

  // Reset bottle state when step changes
  const prevStepIdx = useRef(currentStepIndex);
  useEffect(() => {
    if (prevStepIdx.current === currentStepIndex) return;
    prevStepIdx.current = currentStepIndex;
    // Defer resets to avoid cascading render warnings
    setTimeout(() => {
      setBottleVolume(0);
      setBottleFilling(false);
      setCylinderDraining(false);
      setDrainStarted(false);
      setOriginalDrainVolume(0);
      setAutoDropTarget('');
      setAutoDropping(false);
      autoDropCountRef.current = 0;
      autoDropTargetRef.current = 0;
      if (autoDropRef.current) clearTimeout(autoDropRef.current);
    }, 0);
  }, [currentStepIndex]);

  // ── Auto-drop effect — calls addDrop repeatedly with delay ──────────
  const startAutoDrop = useCallback(() => {
    const target = parseInt(autoDropTarget, 10);
    if (!target || target < 1 || target > 50) return;
    autoDropCountRef.current = 0;
    autoDropTargetRef.current = target;
    setAutoDropping(true);
  }, [autoDropTarget]);

  useEffect(() => {
    if (!autoDropping) return;
    // Schedule next drop after current drop animation finishes
    if (isDropping) return; // wait for current drop to finish

    if (autoDropCountRef.current >= autoDropTargetRef.current) {
      // All drops added
      setAutoDropping(false);
      return;
    }

    // Small delay before next drop so the animation is visible
    autoDropRef.current = setTimeout(() => {
      addDrop();
      autoDropCountRef.current += 1;
    }, 150);

    return () => {
      if (autoDropRef.current) clearTimeout(autoDropRef.current);
    };
  }, [autoDropping, isDropping, addDrop]);

  // ── Reflux timer (30 min simulated, compressed to ~10 s real time) ──────
  const REFLUX_DURATION_SIM = 30 * 60; // 30 min in seconds (simulated)
  const REFLUX_DURATION_REAL = 10;     // 10 seconds real time
  const [refluxElapsed, setRefluxElapsed] = useState(0);
  const refluxTimerRef = useRef(null);
  const refluxStartRef = useRef(null);

  useEffect(() => {
    if (!refluxing) {
      if (refluxTimerRef.current) cancelAnimationFrame(refluxTimerRef.current);
      refluxTimerRef.current = null;
      refluxStartRef.current = null;
      return;
    }
    refluxStartRef.current = null;
    let running = true;
    const tick = (ts) => {
      if (!running) return;
      if (!refluxStartRef.current) refluxStartRef.current = ts;
      const realSec = (ts - refluxStartRef.current) / 1000;
      const simSec = Math.min(REFLUX_DURATION_SIM, (realSec / REFLUX_DURATION_REAL) * REFLUX_DURATION_SIM);
      setRefluxElapsed(simSec);
      if (simSec < REFLUX_DURATION_SIM) {
        refluxTimerRef.current = requestAnimationFrame(tick);
      } else {
        refluxTimerRef.current = null;
      }
    };
    refluxTimerRef.current = requestAnimationFrame(tick);
    return () => {
      running = false;
      if (refluxTimerRef.current) cancelAnimationFrame(refluxTimerRef.current);
    };
  }, [refluxing]);

  const refluxProgress = refluxing ? Math.min(1, refluxElapsed / REFLUX_DURATION_SIM) : 0;
  const refluxMinLeft = Math.max(0, Math.ceil((REFLUX_DURATION_SIM - refluxElapsed) / 60));
  const refluxSecLeft = Math.max(0, Math.ceil((REFLUX_DURATION_SIM - refluxElapsed) % 60));
  const refluxDone = refluxElapsed >= REFLUX_DURATION_SIM;

  const handleFastForward = () => {
    setRefluxElapsed(REFLUX_DURATION_SIM);
  };

  const handleRefluxComplete = () => {
    setRefluxElapsed(0);
    completeReflux();
  };

  const handleReset = () => {
    setRefluxElapsed(0);
    setBottleVolume(0);
    setBottleFilling(false);
    setCylinderDraining(false);
    setDrainStarted(false);
    setOriginalDrainVolume(0);
    if (bottleInterval.current) {
      clearInterval(bottleInterval.current);
      bottleInterval.current = null;
    }
    if (drainInterval.current) {
      clearInterval(drainInterval.current);
      drainInterval.current = null;
    }
    reset();
    setShowSummary(false);
  };

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Mark steps as completed in the global store
  useEffect(() => {
    for (let i = 0; i < currentStepIndex; i++) {
      const stepId = steps[i]?.id;
      if (stepId && !completedSteps.includes(stepId)) {
        completeStep(stepId);
      }
    }
  }, [currentStepIndex, steps, completedSteps, completeStep]);

  // When all steps complete, mark assembly as done
  useEffect(() => {
    if (completed && !showSummary) {
      // Mark final step complete
      const lastStepId = steps[steps.length - 1]?.id;
      if (lastStepId && !completedSteps.includes(lastStepId)) {
        completeStep(lastStepId);
      }
      setAssemblyCorrect(true);
      api.updateStage(sessionId, 4, { assembly_correct: true }).catch(console.error);
      setShowSummary(true);
    }
  }, [completed, showSummary, steps, completedSteps, completeStep, setAssemblyCorrect, sessionId]);

  const handleNext = () => {
    setCurrentStage(5);
    navigate(`/practice/${practiceId}/stage/5`);
  };

  const handleExecuteStep = () => {
    executeStep();
  };

  return (
    <div className="stage-container">
      <div className="stage-header">
        <h2>Etapa 4: Montaje del Experimento</h2>
        <p>Realiza los pasos de montaje en el orden indicado</p>
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
            {/* Reset button — available during all steps */}
            {!isAnimating && (
              <div style={{ marginBottom: '12px', textAlign: 'right' }}>
                <button
                  onClick={handleReset}
                  style={{
                    background: 'none',
                    border: '1px solid #CBD5E1',
                    borderRadius: 'var(--radius-md)',
                    padding: '4px 12px',
                    fontSize: '0.8rem',
                    color: 'var(--color-text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  Reiniciar montaje
                </button>
              </div>
            )}

            {!showSummary && currentStep && (
              <div>
                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                  <strong>Paso {currentStepIndex + 1} de {totalSteps}:</strong>
                </p>
                <p style={{ fontSize: '0.9rem', marginBottom: '12px' }}>
                  {currentStep.description}
                </p>

                {/* Critical note */}
                {currentStep.criticalNote && (
                  <div style={{
                    padding: '10px 14px',
                    background: '#FEF3C7',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.8rem',
                    color: '#92400E',
                    border: '1px solid #FDE68A',
                    marginBottom: '12px',
                  }}>
                    {currentStep.criticalNote}
                  </div>
                )}

                {/* Button-only actions (condenser/cool steps — no drag equivalent) */}
                {(
                  ['attach_condenser', 'cool'].includes(currentStep.action)
                ) && !pendingAdvance && (
                  <Button
                    onClick={handleExecuteStep}
                    disabled={isAnimating}
                    style={{ width: '100%' }}
                  >
                    {isAnimating ? getAnimatingLabel(currentStep.action) : getActionLabel(currentStep.action)}
                  </Button>
                )}

                {/* Reflux step — timer-driven with fast-forward */}
                {currentStep.action === 'reflux' && !pendingAdvance && (
                  <div>
                    {!refluxing && !refluxDone && (
                      <Button
                        onClick={handleExecuteStep}
                        style={{ width: '100%' }}
                      >
                        {getActionLabel(currentStep.action)}
                      </Button>
                    )}

                    {refluxing && (
                      <div>
                        {/* Timer display */}
                        <div style={{
                          padding: '16px',
                          background: refluxDone ? '#F0FDF4' : '#FFF7ED',
                          borderRadius: 'var(--radius-md)',
                          border: `1px solid ${refluxDone ? '#BBF7D0' : '#FED7AA'}`,
                          marginBottom: '12px',
                          textAlign: 'center',
                        }}>
                          <div style={{
                            fontSize: '0.75rem',
                            color: refluxDone ? '#166534' : '#9A3412',
                            marginBottom: '6px',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                          }}>
                            {refluxDone ? 'Saponificación completa' : 'Reflujo en curso'}
                          </div>
                          <div style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '2rem',
                            fontWeight: 700,
                            color: refluxDone ? '#16A34A' : '#EA580C',
                            lineHeight: 1,
                          }}>
                            {refluxDone
                              ? '00:00'
                              : `${String(refluxMinLeft).padStart(2, '0')}:${String(refluxSecLeft).padStart(2, '0')}`
                            }
                          </div>
                          {/* Progress bar */}
                          <div style={{
                            marginTop: '10px',
                            height: '6px',
                            background: '#E5E7EB',
                            borderRadius: '3px',
                            overflow: 'hidden',
                          }}>
                            <div style={{
                              height: '100%',
                              width: `${refluxProgress * 100}%`,
                              background: refluxDone
                                ? 'linear-gradient(90deg, #16A34A, #22C55E)'
                                : 'linear-gradient(90deg, #EA580C, #F97316)',
                              borderRadius: '3px',
                              transition: 'width 0.3s ease',
                            }} />
                          </div>
                        </div>

                        {!refluxDone && (
                          <button
                            onClick={handleFastForward}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              background: 'none',
                              border: '1px solid #CBD5E1',
                              borderRadius: 'var(--radius-md)',
                              fontSize: '0.85rem',
                              color: 'var(--color-text-secondary)',
                              cursor: 'pointer',
                              marginBottom: '8px',
                            }}
                          >
                            Avanzar tiempo (30 min)
                          </button>
                        )}

                        {refluxDone && (
                          <Button
                            onClick={handleRefluxComplete}
                            variant="success"
                            style={{ width: '100%' }}
                          >
                            Continuar — retirar del calor
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Drop-based steps (add_indicator) — click or auto-drop */}
                {currentStep.action === 'add_indicator' && !pendingAdvance && (
                  <div>
                    <div className="drop-counter" style={{ marginBottom: '8px' }}>
                      <span>Gotas:</span>
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '1.2rem',
                        fontWeight: 700,
                        color: 'var(--color-primary)',
                      }}>
                        {dropCount}
                        {autoDropping && (
                          <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#6B7280', marginLeft: 6 }}>
                            / {autoDropTargetRef.current}
                          </span>
                        )}
                      </span>
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
                      Haz clic sobre el frasco de indicador en el canvas o usa el gotero automático
                    </div>

                    {/* Auto-drop input */}
                    <div style={{
                      display: 'flex', gap: '8px', alignItems: 'center',
                      marginBottom: '12px',
                      padding: '10px 12px',
                      background: '#FFFBEB',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid #FDE68A',
                    }}>
                      <label style={{ fontSize: '0.85rem', color: '#92400E', whiteSpace: 'nowrap' }}>
                        Gotero automático:
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={autoDropTarget}
                        onChange={(e) => setAutoDropTarget(e.target.value)}
                        disabled={autoDropping || isDropping}
                        placeholder="N°"
                        style={{
                          width: '60px', padding: '4px 8px',
                          border: '1px solid #D1D5DB', borderRadius: '6px',
                          fontFamily: 'var(--font-mono)', fontSize: '0.9rem',
                          textAlign: 'center',
                        }}
                      />
                      <Button
                        onClick={startAutoDrop}
                        disabled={autoDropping || isDropping || !autoDropTarget || parseInt(autoDropTarget, 10) < 1}
                        variant="primary"
                        style={{ fontSize: '0.8rem', padding: '4px 12px' }}
                      >
                        Agregar
                      </Button>
                    </div>

                    <Button
                      onClick={finishDrops}
                      disabled={dropCount < 1 || isDropping || autoDropping}
                      variant="success"
                      style={{ width: '100%' }}
                    >
                      Listo — {dropCount} {dropCount === 1 ? 'gota' : 'gotas'}
                    </Button>
                  </div>
                )}

                {/* Bottle measurement step — canvas-driven interactions */}
                {currentStep.action === 'measure_with_bottle' && !drainStarted && !pendingAdvance && (
                  <div>
                    {/* Volume readout */}
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '2rem',
                      fontWeight: 700,
                      color: 'var(--color-primary)',
                      textAlign: 'center',
                      marginBottom: '8px',
                    }}>
                      {bottleCapacity <= 10 ? bottleVolume.toFixed(2) : bottleVolume.toFixed(1)} mL
                    </div>

                    <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                      {bottleCapacity <= 10 ? (
                        <>
                          <Button onClick={() => adjustBottle(-0.2)} variant="outline" style={{ flex: 1 }} disabled={bottleFilling || bottleVolume < 0.2}>-0.2</Button>
                          <Button onClick={() => adjustBottle(-0.1)} variant="outline" style={{ flex: 1 }} disabled={bottleFilling || bottleVolume < 0.1}>-0.1</Button>
                          <Button onClick={() => adjustBottle(0.1)} variant="outline" style={{ flex: 1 }} disabled={bottleFilling || bottleVolume >= bottleCapacity}>+0.1</Button>
                          <Button onClick={() => adjustBottle(0.2)} variant="outline" style={{ flex: 1 }} disabled={bottleFilling || bottleVolume > bottleCapacity - 0.2}>+0.2</Button>
                        </>
                      ) : bottleCapacity >= 100 ? (
                        <>
                          <Button onClick={() => adjustBottle(-5)} variant="outline" style={{ flex: 1 }} disabled={bottleFilling || bottleVolume < 5}>-5</Button>
                          <Button onClick={() => adjustBottle(-1)} variant="outline" style={{ flex: 1 }} disabled={bottleFilling || bottleVolume < 1}>-1</Button>
                          <Button onClick={() => adjustBottle(1)} variant="outline" style={{ flex: 1 }} disabled={bottleFilling || bottleVolume >= bottleCapacity}>+1</Button>
                          <Button onClick={() => adjustBottle(5)} variant="outline" style={{ flex: 1 }} disabled={bottleFilling || bottleVolume > bottleCapacity - 5}>+5</Button>
                        </>
                      ) : (
                        <>
                          <Button onClick={() => adjustBottle(-1)} variant="outline" style={{ flex: 1 }} disabled={bottleFilling || bottleVolume < 1}>-1</Button>
                          <Button onClick={() => adjustBottle(-0.5)} variant="outline" style={{ flex: 1 }} disabled={bottleFilling || bottleVolume < 0.5}>-0.5</Button>
                          <Button onClick={() => adjustBottle(0.5)} variant="outline" style={{ flex: 1 }} disabled={bottleFilling || bottleVolume >= bottleCapacity}>+0.5</Button>
                          <Button onClick={() => adjustBottle(1)} variant="outline" style={{ flex: 1 }} disabled={bottleFilling || bottleVolume > bottleCapacity - 1}>+1</Button>
                        </>
                      )}
                    </div>

                    <Button onClick={resetBottle} variant="outline" style={{ width: '100%', marginBottom: '8px' }} disabled={bottleFilling || bottleVolume < 0.1}>
                      Vaciar probeta
                    </Button>

                    <div style={{
                      padding: '8px 12px',
                      background: '#EFF6FF',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.85rem',
                      color: '#1D4ED8',
                      border: '1px solid #BFDBFE',
                      marginBottom: '8px',
                    }}>
                      Se recomiendan {bottleTarget} mL
                    </div>

                    <div style={{
                      padding: '10px 14px',
                      background: '#EFF6FF',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid #BFDBFE',
                      fontSize: '0.85rem',
                      color: '#1D4ED8',
                    }}>
                      {bottleVolume < minDrainThreshold
                        ? `Mantén presionado el frasco en el canvas para llenar la probeta →`
                        : 'Mantén presionada la probeta en el canvas para verter al matraz →'
                      }
                    </div>
                  </div>
                )}

                {/* Draining cylinder to flask */}
                {currentStep.action === 'measure_with_bottle' && drainStarted && !pendingAdvance && (
                  <div>
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '1.8rem',
                      fontWeight: 700,
                      color: 'var(--color-primary)',
                      textAlign: 'center',
                      marginBottom: '8px',
                    }}>
                      {bottleCapacity <= 10 ? bottleVolume.toFixed(2) : bottleVolume.toFixed(1)} mL
                    </div>
                    <div style={{
                      padding: '10px 14px',
                      background: '#EFF6FF',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid #BFDBFE',
                      fontSize: '0.85rem',
                      color: '#1D4ED8',
                    }}>
                      {bottleVolume > 0
                        ? 'Mantén presionada la probeta para verter al matraz →'
                        : 'Vertido completo'
                      }
                    </div>
                  </div>
                )}

                {/* Drag-based steps — hint directs to canvas */}
                {!['attach_condenser', 'cool', 'reflux', 'add_indicator', 'measure_with_bottle'].includes(currentStep.action) && !pendingAdvance && (
                  <div style={{
                    padding: '10px 14px',
                    background: '#EFF6FF',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid #BFDBFE',
                    fontSize: '0.85rem',
                    color: '#1D4ED8',
                  }}>
                    Haz clic sobre el reactivo en el canvas para verter →
                  </div>
                )}

                {/* "Continuar" button — appears after any step completes */}
                {pendingAdvance && (
                  <div style={{ marginTop: '12px' }}>
                    <div style={{
                      padding: '10px 14px',
                      background: '#F0FDF4',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid #BBF7D0',
                      fontSize: '0.85rem',
                      color: '#166534',
                      marginBottom: '10px',
                    }}>
                      ✓ Paso completado
                      {currentStepIndex + 1 < totalSteps && (
                        <div style={{ marginTop: '6px', fontSize: '0.8rem', color: '#4B5563' }}>
                          Siguiente: {steps[currentStepIndex + 1]?.description}
                        </div>
                      )}
                    </div>
                    <Button
                      onClick={confirmAdvance}
                      variant="primary"
                      style={{ width: '100%' }}
                    >
                      Continuar
                    </Button>
                  </div>
                )}
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
                    {steps.map((step, i) => (
                      <span key={i}>{step.description}</span>
                    ))}
                  </div>
                </div>

                <Button onClick={handleNext} variant="success" style={{ width: '100%' }}>
                  Continuar a la titulación
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Canvas — bottle measurement, reflux, or drag assembly */}
        <div className="titration-canvas-wrapper">
          {isBottleStep ? (
            <BottleBench
              width={600}
              height={400}
              currentVolume={bottleVolume}
              maxVolume={bottleCapacity}
              isFilling={bottleFilling}
              liquidColor={currentStep?.liquidColor || '#B8D8E8'}
              sampleName={currentStep?.bottleLabel || 'Agua\nDestilada'}
              showFlask={true}
              flaskFillLevel={computedFlaskFill}
              flaskLiquidColor={currentStep?.visualAfter?.containerColor || '#DCE8F5'}
              isDraining={cylinderDraining}
              onBottlePress={startBottleFill}
              onCylinderPress={startCylinderDrain}
              bottleStyle={currentStep?.bottleStyle || 'clear'}
              precipitate={currentStep?.visualAfter?.precipitate || null}
              precipitateProgress={drainFraction}
              existingPrecipitate={flaskState?.precipitate || null}
              foilCovered={flaskState?.foilCovered || false}
            />
          ) : assemblyMode === 'reflux' ? (
            <RefluxBench
              width={500}
              height={400}
              flaskState={flaskState}
              isAnimating={isAnimating}
              currentAction={currentStep?.action || ''}
              currentStepIndex={currentStepIndex}
              completed={completed}
              onExecuteStep={handleExecuteStep}
              isDropStep={isDropStep}
              isDropping={isDropping}
              onAddDrop={addDrop}
              dropColor="#E91E8C"
              refluxProgress={refluxProgress}
            />
          ) : (
            <SequentialAssemblyBench
              width={500}
              height={400}
              flaskState={flaskState}
              isAnimating={isAnimating}
              currentStepIndex={currentStepIndex}
              currentAction={currentStep?.action || ''}
              completed={completed}
              onExecuteStep={handleExecuteStep}
              practiceId={practiceId}
              isDropStep={isDropStep}
              isDropping={isDropping}
              onAddDrop={addDrop}
              dropColor="#C07808"
            />
          )}
        </div>
      </div>
    </div>
  );
}
