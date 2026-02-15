import { useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useSimulatorStore from '../../store/useSimulatorStore';
import { INSTRUMENTS, REAGENTS, DISTRACTORS } from '../../data/catalog';
import ToolStand from '../ui/ToolStand';
import LabBench from '../ui/LabBench';
import Button from '../common/Button';
import * as api from '../../api/client';
import '../../styles/stages.css';

// Placement grid: items get arranged in rows on the table
function nextPosition(existingItems, canvasWidth) {
  const itemW = 88;
  const itemH = 96;
  const padX = 14;
  const padY = 12;
  const startX = 30;
  const startY = 20;
  const cols = Math.max(1, Math.floor((canvasWidth - startX * 2 + padX) / (itemW + padX)));
  const n = existingItems.length;
  const col = n % cols;
  const row = Math.floor(n / cols);
  return { x: startX + col * (itemW + padX), y: startY + row * (itemH + padY) };
}

export default function S2_MaterialSetup() {
  const navigate = useNavigate();
  const {
    practiceConfig, practiceId, sessionId,
    selectedInstruments, selectedReagents,
    toggleInstrument, toggleReagent,
    setMaterialsCorrect, setCurrentStage,
  } = useSimulatorStore();

  const [errors, setErrors] = useState([]);
  const [verified, setVerified] = useState(false);
  // Track items on the bench canvas: { id, name, kind, x, y }
  const [benchItems, setBenchItems] = useState([]);
  const benchWidthRef = useRef(700);

  // Build available items (correct + distractors, shuffled once)
  const allInstruments = useMemo(() => {
    if (!practiceConfig) return [];
    const all = { ...INSTRUMENTS, ...DISTRACTORS };
    const ids = [...(practiceConfig.requiredInstruments || []), ...(practiceConfig.distractorInstruments || [])];
    return ids
      .map((id) => ({ id, ...all[id] }))
      .filter((i) => i.name)
      .sort(() => Math.random() - 0.5);
  }, [practiceConfig]);

  const allReagents = useMemo(() => {
    if (!practiceConfig) return [];
    const ids = [...(practiceConfig.requiredReagents || []), ...(practiceConfig.distractorReagents || [])];
    return ids
      .map((id) => ({ id, ...REAGENTS[id] }))
      .filter((r) => r.name)
      .sort(() => Math.random() - 0.5);
  }, [practiceConfig]);

  const totalRequired = (practiceConfig?.requiredInstruments?.length || 0) + (practiceConfig?.requiredReagents?.length || 0);
  const totalSelected = selectedInstruments.length + selectedReagents.length;

  // Resolve item info for the bench
  const getItemInfo = useCallback((id) => {
    const all = { ...INSTRUMENTS, ...DISTRACTORS, ...REAGENTS };
    const entry = all[id];
    return {
      name: entry?.name || id,
      iconKey: entry?.icon || entry?.category || null,
    };
  }, []);

  // Add item (from click or drop)
  const handleAdd = useCallback((id, kind, x, y) => {
    const alreadySelected = kind === 'instrument'
      ? selectedInstruments.includes(id)
      : selectedReagents.includes(id);
    if (alreadySelected) return;

    // Toggle in store
    if (kind === 'instrument') toggleInstrument(id);
    else toggleReagent(id);

    // Add to bench canvas
    const pos = (x != null && y != null)
      ? { x, y }
      : nextPosition(benchItems, benchWidthRef.current);
    const info = getItemInfo(id);
    setBenchItems((prev) => [...prev, { id, name: info.name, kind, iconKey: info.iconKey, ...pos }]);
    setVerified(false);
    setErrors([]);
  }, [selectedInstruments, selectedReagents, toggleInstrument, toggleReagent, benchItems, getItemInfo]);

  // Add from sidebar click
  const handleAddFromStand = useCallback((id, kind) => {
    handleAdd(id, kind);
  }, [handleAdd]);

  // Add from HTML5 drop on canvas
  const handleAddFromDrop = useCallback((id, kind, x, y) => {
    handleAdd(id, kind, x, y);
  }, [handleAdd]);

  // Remove item (double-click on canvas)
  const handleRemove = useCallback((id, kind) => {
    if (kind === 'instrument') toggleInstrument(id);
    else toggleReagent(id);
    setBenchItems((prev) => prev.filter((item) => item.id !== id));
    setVerified(false);
    setErrors([]);
  }, [toggleInstrument, toggleReagent]);

  // Move item on canvas
  const handleMoveItem = useCallback((id, x, y) => {
    setBenchItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, x, y } : item))
    );
  }, []);

  const handleVerify = async () => {
    try {
      const result = await api.updateMaterials(sessionId, selectedInstruments, selectedReagents);
      if (result.materials_correct) {
        setMaterialsCorrect(true);
        setVerified(true);
        setErrors([]);
      } else {
        setMaterialsCorrect(false);
        setVerified(false);
        setErrors(result.errors || ['La selección de materiales no es correcta']);
      }
    } catch (e) {
      setErrors([e.message]);
    }
  };

  const handleNext = () => {
    setCurrentStage(3);
    navigate(`/practice/${practiceId}/stage/3`);
  };

  if (!practiceConfig) return <div className="stage-container"><p>No hay práctica seleccionada</p></div>;

  return (
    <div className="stage-container">
      <div className="stage-header">
        <h2>Etapa 2: Preparación de Materiales</h2>
        <p>
          Arrastra los instrumentos y reactivos desde el estante hacia la mesa de trabajo.
          {' '}{totalSelected} de {totalRequired} materiales seleccionados.
        </p>
      </div>

      <div className="s2-lab-layout">
        <ToolStand
          instruments={allInstruments}
          reagents={allReagents}
          selectedInstruments={selectedInstruments}
          selectedReagents={selectedReagents}
          onAdd={handleAddFromStand}
        />

        <div className="s2-main-area">
          <LabBench
            benchItems={benchItems}
            onAddFromDrop={handleAddFromDrop}
            onRemove={handleRemove}
            onMoveItem={handleMoveItem}
          />

          {errors.length > 0 && (
            <div style={{
              padding: '12px', background: '#FEF2F2',
              borderRadius: 'var(--radius-md)', border: '1px solid #FECACA',
            }}>
              {errors.map((e, i) => (
                <p key={i} style={{ color: 'var(--color-error)', fontSize: '0.85rem', margin: '4px 0' }}>{e}</p>
              ))}
            </div>
          )}

          {verified && (
            <div style={{
              padding: '12px', background: '#F0FDF4',
              borderRadius: 'var(--radius-md)', border: '1px solid #BBF7D0',
              color: 'var(--color-success)', fontWeight: 500, fontSize: '0.9rem',
            }}>
              Selección correcta de materiales
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <Button onClick={handleVerify} variant="outline" style={{ flex: 1 }}>
              Verificar selección
            </Button>
            <Button onClick={handleNext} disabled={!verified} style={{ flex: 1 }}>
              Continuar
            </Button>
          </div>
        </div>
      </div>

      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '8px', textAlign: 'center' }}>
        Doble clic sobre un material en la mesa para retirarlo
      </p>
    </div>
  );
}
