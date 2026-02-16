import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useSimulatorStore from '../../store/useSimulatorStore';
import useTitrationStore from '../../store/useTitrationStore';
import * as api from '../../api/client';
import LabBench from '../canvas/LabBench';
import TitrationControls from '../ui/TitrationControls';
import BuretteReadout from '../ui/BuretteReadout';
import Button from '../common/Button';
import Modal from '../common/Modal';
import '../../styles/stages.css';

export default function S5_Execution() {
  const navigate = useNavigate();
  const {
    practiceConfig, practiceId, sessionId,
    setRecordedVolume, setCurrentStage, measuredValue,
    bufferVolume, indicatorDrops,
  } = useSimulatorStore();
  const { initTitration, volumeAdded } = useTitrationStore();
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (practiceConfig?.titration) {
      const titration = practiceConfig.titration;
      const assemblyConfig = practiceConfig.assemblyConfig;

      // Calculate expected volume based on proportionality
      const refVol = titration.expectedVolume;
      const refValue = titration.referenceValue || 100;
      const measured = measuredValue || refValue;
      let expectedVol = refVol;
      if (titration.proportionality === 'direct') {
        expectedVol = (refVol / refValue) * measured;
      } else if (titration.proportionality === 'inverse') {
        expectedVol = (refVol * refValue) / measured;
      }

      // Determine modifiers from assembly choices
      const modifiers = {};
      if (assemblyConfig?.buffer?.qualityThresholds && bufferVolume != null) {
        const thresholds = assemblyConfig.buffer.qualityThresholds;
        if (bufferVolume < thresholds.poor) modifiers.bufferQuality = 'poor';
        else if (bufferVolume > thresholds.excess) modifiers.bufferQuality = 'excess';
        else modifiers.bufferQuality = 'good';
      }
      if (indicatorDrops != null) {
        modifiers.indicatorDrops = indicatorDrops;
      }

      initTitration(titration, expectedVol, modifiers);
    }
  }, [practiceConfig, initTitration, measuredValue, bufferVolume, indicatorDrops]);

  const handleRecord = () => {
    setShowConfirm(true);
  };

  const handleConfirmRecord = async () => {
    setRecordedVolume(volumeAdded);
    try {
      await api.updateTitration(sessionId, volumeAdded);
    } catch (e) {
      console.error('Error recording titration:', e);
    }
    setShowConfirm(false);
    setCurrentStage(6);
    navigate(`/practice/${practiceId}/stage/6`);
  };

  if (!practiceConfig?.titration) {
    return <div className="stage-container"><p>Configuración de titulación no disponible</p></div>;
  }

  return (
    <div className="stage-container">
      <div className="stage-header">
        <h2>Etapa 5: Titulación</h2>
        <p>{practiceConfig.titration.endpointDescription}</p>
      </div>

      <div className="titration-layout">
        <div className="titration-canvas-wrapper">
          <LabBench width={500} height={580} />
        </div>

        <div className="titration-controls-panel">
          <BuretteReadout />
          <TitrationControls onRecord={handleRecord} />
        </div>
      </div>

      <Modal isOpen={showConfirm} onClose={() => setShowConfirm(false)} title="Confirmar lectura">
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <p style={{ marginBottom: '8px', color: 'var(--color-text-secondary)' }}>
            Vas a registrar la siguiente lectura de bureta:
          </p>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: '2rem',
            fontWeight: 700, color: 'var(--color-primary)',
          }}>
            {volumeAdded.toFixed(2)} mL
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Button onClick={() => setShowConfirm(false)} variant="outline" style={{ flex: 1 }}>
            Cancelar
          </Button>
          <Button onClick={handleConfirmRecord} style={{ flex: 1 }}>
            Confirmar
          </Button>
        </div>
      </Modal>
    </div>
  );
}
