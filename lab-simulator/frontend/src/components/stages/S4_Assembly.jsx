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
    cylinderLevel, bufferAmount, setBufferAmount,
    dropCount, completed,
    confirmStep1, pourWater, pourBuffer,
    addIndicatorDrop, finishAssembly, cleanup, reset,
  } = assembly;

  const defaultBuffer = assemblyConfig?.buffer?.defaultVolume || 10;
  const [bufferSliderVal, setBufferSliderVal] = useState(defaultBuffer);
  const [showSummary, setShowSummary] = useState(false);

  const handleReset = () => {
    reset();
    setBufferSliderVal(defaultBuffer);
    setShowSummary(false);
  };

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

  const handlePourWater = () => pourWater();
  const handlePourBuffer = () => {
    setBufferAmount(bufferSliderVal);
    pourBuffer(bufferSliderVal);
  };
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
                    : 'Arrastra la probeta hacia el Erlenmeyer en el canvas'}
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
                    : 'Arrastra la probeta de tampón al Erlenmeyer'}
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
                    : 'Haz clic sobre el frasco de indicador en el canvas'}
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
  navigate,
}) {
  const {
    currentStepIndex, currentStep, totalSteps,
    isAnimating, completed, flaskState,
    executeStep, cleanup, reset,
    isDropStep, dropCount, isDropping, addDrop, finishDrops,
    refluxing, completeReflux,
  } = assembly;

  const [showSummary, setShowSummary] = useState(false);

  // ── Bottle measurement state (for measure_with_bottle steps) ───────────
  const isBottleStep = currentStep?.action === 'measure_with_bottle';
  const [bottleVolume, setBottleVolume] = useState(0);
  const [bottleFilling, setBottleFilling] = useState(false);
  const [bottleMeasured, setBottleMeasured] = useState(false);
  const bottleInterval = useRef(null);

  const bottleCapacity = currentStep?.cylinderCapacity || 25;
  const bottleTarget = currentStep?.volume || 10;

  const startBottleFill = useCallback(() => {
    if (bottleMeasured || bottleInterval.current) return;
    setBottleFilling(true);
    bottleInterval.current = setInterval(() => {
      setBottleVolume(prev => {
        const next = prev + 0.2;
        return next > bottleCapacity ? bottleCapacity : Math.round(next * 10) / 10;
      });
    }, 100);
  }, [bottleMeasured, bottleCapacity]);

  const stopBottleFill = useCallback(() => {
    setBottleFilling(false);
    if (bottleInterval.current) {
      clearInterval(bottleInterval.current);
      bottleInterval.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isBottleStep) return;
    const handleUp = () => stopBottleFill();
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchend', handleUp);
    return () => {
      stopBottleFill();
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchend', handleUp);
    };
  }, [stopBottleFill, isBottleStep]);

  const adjustBottle = useCallback((delta) => {
    if (bottleMeasured || bottleFilling) return;
    const newVol = Math.max(0, Math.min(bottleCapacity, Math.round((bottleVolume + delta) * 10) / 10));
    if (newVol === bottleVolume) return;
    setBottleVolume(newVol);
    // Trigger bottle tilt animation briefly
    setBottleFilling(true);
    setTimeout(() => setBottleFilling(false), 600);
  }, [bottleMeasured, bottleFilling, bottleVolume, bottleCapacity]);

  const resetBottle = () => {
    if (bottleMeasured) return;
    setBottleVolume(0);
  };

  const confirmBottleMeasurement = () => {
    if (bottleVolume < 1) return;
    stopBottleFill();
    setBottleMeasured(true);
  };

  // Once bottle measurement is confirmed, trigger the pour animation to flask
  useEffect(() => {
    if (bottleMeasured && isBottleStep && !isAnimating) {
      const timer = setTimeout(() => {
        executeStep(); // triggers the pour animation in the hook
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [bottleMeasured, isBottleStep, isAnimating, executeStep]);

  // Reset bottle state when step changes
  const prevStepIdx = useRef(currentStepIndex);
  useEffect(() => {
    if (prevStepIdx.current === currentStepIndex) return;
    prevStepIdx.current = currentStepIndex;
    // Defer resets to avoid cascading render warnings
    setTimeout(() => {
      setBottleVolume(0);
      setBottleFilling(false);
      setBottleMeasured(false);
    }, 0);
  }, [currentStepIndex]);

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
    setBottleMeasured(false);
    if (bottleInterval.current) {
      clearInterval(bottleInterval.current);
      bottleInterval.current = null;
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
                ) && (
                  <Button
                    onClick={handleExecuteStep}
                    disabled={isAnimating}
                    style={{ width: '100%' }}
                  >
                    {isAnimating ? getAnimatingLabel(currentStep.action) : getActionLabel(currentStep.action)}
                  </Button>
                )}

                {/* Reflux step — timer-driven with fast-forward */}
                {currentStep.action === 'reflux' && (
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

                {/* Drop-based steps (add_indicator) — click to add drops */}
                {currentStep.action === 'add_indicator' && (
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
                      {isDropping
                        ? 'Agregando gota...'
                        : 'Haz clic sobre el frasco de indicador en el canvas'}
                    </div>

                    <Button
                      onClick={finishDrops}
                      disabled={dropCount < 1 || isDropping}
                      variant="success"
                      style={{ width: '100%' }}
                    >
                      Listo — {dropCount} {dropCount === 1 ? 'gota' : 'gotas'}
                    </Button>
                  </div>
                )}

                {/* Bottle measurement step — interactive fill controls */}
                {currentStep.action === 'measure_with_bottle' && !bottleMeasured && (
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
                      {bottleVolume.toFixed(1)} mL
                    </div>

                    <Button
                      onPointerDown={startBottleFill}
                      onPointerUp={stopBottleFill}
                      onPointerLeave={stopBottleFill}
                      onPointerCancel={stopBottleFill}
                      variant="primary"
                      style={{ width: '100%', touchAction: 'none', marginBottom: '8px' }}
                      className="fill-button"
                    >
                      Verter agua destilada (mantener)
                    </Button>

                    <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                      <Button onClick={() => adjustBottle(-1)} variant="outline" style={{ flex: 1 }} disabled={bottleFilling || bottleVolume < 1}>-1</Button>
                      <Button onClick={() => adjustBottle(-0.5)} variant="outline" style={{ flex: 1 }} disabled={bottleFilling || bottleVolume < 0.5}>-0.5</Button>
                      <Button onClick={() => adjustBottle(0.5)} variant="outline" style={{ flex: 1 }} disabled={bottleFilling || bottleVolume >= bottleCapacity}>+0.5</Button>
                      <Button onClick={() => adjustBottle(1)} variant="outline" style={{ flex: 1 }} disabled={bottleFilling || bottleVolume > bottleCapacity - 1}>+1</Button>
                    </div>

                    <Button onClick={resetBottle} variant="outline" style={{ width: '100%', marginBottom: '8px' }}>
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

                    <Button
                      onClick={confirmBottleMeasurement}
                      disabled={bottleVolume < 1}
                      style={{ width: '100%' }}
                    >
                      Confirmar y verter al matraz
                    </Button>
                  </div>
                )}

                {/* Bottle measurement confirmed — pouring to flask */}
                {currentStep.action === 'measure_with_bottle' && bottleMeasured && (
                  <div style={{
                    padding: '10px 14px',
                    background: '#EFF6FF',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid #BFDBFE',
                    fontSize: '0.85rem',
                    color: '#1D4ED8',
                  }}>
                    {isAnimating ? getAnimatingLabel(currentStep.action) : 'Vertiendo al matraz...'}
                  </div>
                )}

                {/* Drag-based steps — hint directs to canvas */}
                {!['attach_condenser', 'cool', 'reflux', 'add_indicator', 'measure_with_bottle'].includes(currentStep.action) && (
                  <div style={{
                    padding: '10px 14px',
                    background: '#EFF6FF',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid #BFDBFE',
                    fontSize: '0.85rem',
                    color: '#1D4ED8',
                  }}>
                    {isAnimating
                      ? getAnimatingLabel(currentStep.action)
                      : 'Arrastra el reactivo hacia el matraz en el canvas →'}
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
          {isBottleStep && !bottleMeasured ? (
            <BottleBench
              width={500}
              height={480}
              currentVolume={bottleVolume}
              maxVolume={bottleCapacity}
              isFilling={bottleFilling}
              liquidColor="#B8D8E8"
              sampleName={currentStep?.bottleLabel || 'Agua\nDestilada'}
            />
          ) : assemblyMode === 'reflux' ? (
            <RefluxBench
              width={500}
              height={480}
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
              height={480}
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
