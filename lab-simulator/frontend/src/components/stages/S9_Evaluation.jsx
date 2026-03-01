import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useSimulatorStore from '../../store/useSimulatorStore';
import * as api from '../../api/client';
import ReportCard from '../ui/ReportCard';
import Button from '../common/Button';
import '../../styles/stages.css';

export default function S9_Evaluation() {
  const navigate = useNavigate();
  const { sessionId, report, setReport, reset } = useSimulatorStore();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (sessionId && !report) {
      setLoading(true);
      api.getReport(sessionId)
        .then((data) => {
          setReport(data);
          setLoading(false);
        })
        .catch((e) => {
          console.error('Error generating report:', e);
          setLoading(false);
        });
    }
  }, [sessionId, report, setReport]);

  const handleRetry = () => {
    reset();
    navigate('/');
  };

  const handleHome = () => {
    reset();
    navigate('/');
  };

  return (
    <div className="stage-container">
      <div className="stage-header">
        <h2>Etapa 9: Evaluación</h2>
        <p>Reporte de desempeño en la práctica</p>
      </div>

      <div className="evaluation-layout">
        {loading && <p>Generando reporte de evaluación...</p>}

        {report && <ReportCard report={report} />}

        <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'center' }}>
          <Button onClick={handleRetry} variant="outline">
            Repetir práctica
          </Button>
          <Button onClick={handleHome}>
            Volver al menú
          </Button>
        </div>
      </div>
    </div>
  );
}
