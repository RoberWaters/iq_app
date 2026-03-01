import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useSimulatorStore from '../../store/useSimulatorStore';
import * as api from '../../api/client';
import useAssembly from '../../hooks/useAssembly';
import useSequentialAssembly from '../../hooks/useSequentialAssembly';
import InstructionPanel from '../ui/InstructionPanel';
import AssemblyBench from '../canvas/AssemblyBench';
import SequentialAssemblyBench from '../canvas/SequentialAssemblyBench';
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

  // Determine assembly mode: interactive (P5-style with buffer/indicator sliders)
  // vs sequential (P4-style click-to-add steps)
  const isInteractive = !!assemblyConfig?.buffer;

  // Interactive assembly hook (only used for P5-style)
  const maxCapacity = practiceConfig?.measurement?.range?.[1] || 250;
  const interactiveAssembly = useAssembly(measuredValue || 100, maxCapacity);

  // Sequential assembly hook (only used for P4-style)
  const sequentialAssembly = useSequentialAssembly(steps);

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

// ─── Sequential Assembly (P4 style) ────────────────────────────────────────

function SequentialAssemblyView({
  steps, assembly,
  practiceId, sessionId, completedSteps, completeStep,
  setAssemblyCorrect, setCurrentStage,
  navigate,
}) {
  const {
    currentStepIndex, currentStep, totalSteps,
    isAnimating, completed, flaskState,
    executeStep, cleanup, reset,
  } = assembly;

  const [showSummary, setShowSummary] = useState(false);

  const handleReset = () => {
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

  // Button label based on current step action
  const getActionLabel = () => {
    if (!currentStep) return 'Ejecutar paso';
    const action = currentStep.action;
    switch (action) {
      case 'measure_and_transfer': return 'Pipetear y transferir';
      case 'add_reagent': return `Agregar ${currentStep.reagent ? '' : 'reactivo'}`;
      case 'cover': return 'Tapar con aluminio';
      case 'add_indicator': return 'Agregar indicador';
      case 'transfer': return 'Transferir';
      default: return 'Ejecutar paso';
    }
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

                <Button
                  onClick={handleExecuteStep}
                  disabled={isAnimating}
                  style={{ width: '100%' }}
                >
                  {isAnimating ? 'Ejecutando...' : getActionLabel()}
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

        {/* Right: Sequential Canvas */}
        <div className="titration-canvas-wrapper">
          <SequentialAssemblyBench
            width={500}
            height={480}
            flaskState={flaskState}
            isAnimating={isAnimating}
            currentStepIndex={currentStepIndex}
            currentAction={currentStep?.action || ''}
          />
        </div>
      </div>
    </div>
  );
}
