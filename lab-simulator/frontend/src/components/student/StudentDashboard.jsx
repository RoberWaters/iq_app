import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/useAuthStore';
import useSimulatorStore from '../../store/useSimulatorStore';
import * as api from '../../api/client';
import { CATEGORY_COLORS } from '../../utils/constants';
import '../../styles/student.css';

const STUDENT_STATUS = {
  pendiente:   { label: 'Pendiente',   className: 'badge--neutral' },
  en_progreso: { label: 'En progreso', className: 'badge--warning' },
  completada:  { label: 'Completada',  className: 'badge--success' },
  calificada:  { label: 'Calificada',  className: 'badge--primary-soft' },
};

const PRACTICE_STATUS = {
  active:  { label: 'Activa',    className: 'badge--success' },
  blocked: { label: 'Bloqueada', className: 'badge--danger' },
  closed:  { label: 'Cerrada',   className: 'badge--warning' },
};

function ScoreDisplay({ label, value }) {
  return (
    <div className="sdb-score-item">
      <span className="sdb-score-item__label">{label}</span>
      <span className="sdb-score-item__value mono">
        {value != null ? value.toFixed(1) : '—'}
      </span>
    </div>
  );
}

function PracticeCard({ practice, studentId, sectionId, sectionCode, studentName, onAction }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { setPractice, setSessionId, setCurrentStage, setMeasurement, setRecordedVolume, setMaterialsCorrect, setAssemblyCorrect } = useSimulatorStore();

  const categoryColor = CATEGORY_COLORS[practice.category] || '#64748B';
  const studentStatusCfg = STUDENT_STATUS[practice.student_status] ?? STUDENT_STATUS.pendiente;
  const practiceStatusCfg = PRACTICE_STATUS[practice.practice_status] ?? PRACTICE_STATUS.blocked;
  const isBlocked = practice.practice_status !== 'active';
  const isCompleted = ['completada', 'calificada'].includes(practice.student_status);

  async function handleStart() {
    setLoading(true);
    setError('');
    try {
      const fullPractice = await api.getPractice(practice.practice_id);
      setPractice(practice.practice_id, fullPractice);
      const session = await api.createSession({
        practice_id: practice.practice_id,
        student_name: studentName,
        student_id: studentId || null,
        section_id: sectionId || null,
        section_code: sectionCode,
      });
      setSessionId(session.id);
      setCurrentStage(2);
      navigate(`/practice/${practice.practice_id}/stage/2`);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  async function handleResume() {
    setLoading(true);
    setError('');
    try {
      const [fullPractice, session] = await Promise.all([
        api.getPractice(practice.practice_id),
        api.getSession(practice.active_session_id),
      ]);
      setPractice(practice.practice_id, fullPractice);
      setSessionId(practice.active_session_id);
      setCurrentStage(session.current_stage);
      // Restore persisted state so stages render correctly
      if (session.measured_value != null) setMeasurement(session.measured_value, session.measured_unit);
      if (session.recorded_volume != null) setRecordedVolume(session.recorded_volume);
      if (session.materials_correct != null) setMaterialsCorrect(session.materials_correct);
      if (session.assembly_correct != null) setAssemblyCorrect(session.assembly_correct);
      const stage = Math.max(2, session.current_stage);
      navigate(`/practice/${practice.practice_id}/stage/${stage}`);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  function handleViewResult() {
    if (!practice.last_session_id) return;
    // Navigate to S9 with the last session loaded
    onAction(practice);
  }

  function renderAction() {
    if (loading) return <button className="btn btn--primary btn--sm" disabled>Cargando...</button>;

    if (practice.active_session_id) {
      return (
        <button className="btn btn--warning btn--sm" onClick={handleResume}>
          Reanudar (etapa {Math.max(2, practice.active_session_stage)})
        </button>
      );
    }
    if (isCompleted) {
      return (
        <button className="btn btn--outline-primary btn--sm" onClick={handleViewResult}>
          Ver resultado
        </button>
      );
    }
    if (isBlocked) {
      return (
        <button className="btn btn--sm" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
          {practiceStatusCfg.label}
        </button>
      );
    }
    return (
      <button className="btn btn--primary btn--sm" onClick={handleStart}>
        Iniciar practica
      </button>
    );
  }

  return (
    <motion.div
      className={`sdb-card ${isBlocked && !isCompleted ? 'sdb-card--muted' : ''}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="sdb-card__header">
        <div className="sdb-card__id" style={{ background: `${categoryColor}18`, color: categoryColor }}>
          {practice.practice_id}
        </div>
        <div className="sdb-card__meta">
          <h3 className="sdb-card__name">{practice.practice_name}</h3>
          <div className="sdb-card__badges">
            <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: 10, background: `${categoryColor}15`, color: categoryColor, fontWeight: 500 }}>
              {practice.category}
            </span>
            <span className={`badge badge--sm ${practiceStatusCfg.className}`}>{practiceStatusCfg.label}</span>
            <span className={`badge badge--sm ${studentStatusCfg.className}`}>{studentStatusCfg.label}</span>
          </div>
        </div>
      </div>

      <div className="sdb-card__scores">
        <ScoreDisplay label="Nota final" value={practice.final_score} />
        <ScoreDisplay label="Automatica" value={practice.auto_score} />
        <ScoreDisplay label="Manual" value={practice.manual_score} />
      </div>

      {practice.started_at && (
        <p className="sdb-card__date">
          {practice.completed_at
            ? `Completada: ${new Date(practice.completed_at).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })}`
            : `Iniciada: ${new Date(practice.started_at).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })}`}
        </p>
      )}

      {error && <p className="sdb-card__error">{error}</p>}

      <div className="sdb-card__footer">
        {renderAction()}
      </div>
    </motion.div>
  );
}

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const { setPractice, setSessionId, setCurrentStage, setReport } = useSimulatorStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getStudentDashboard()
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleViewResult(practice) {
    if (!practice.last_session_id) return;
    try {
      const [fullPractice, report] = await Promise.all([
        api.getPractice(practice.practice_id),
        api.getReport(practice.last_session_id),
      ]);
      setPractice(practice.practice_id, fullPractice);
      setSessionId(practice.last_session_id);
      setCurrentStage(9);
      setReport(report);
      navigate(`/practice/${practice.practice_id}/stage/9`);
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) {
    return (
      <div className="sdb-page">
        <div className="sdb-container">
          <p style={{ color: 'var(--color-text-secondary)', padding: '40px 0' }}>Cargando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="sdb-page">
        <div className="sdb-container">
          <p style={{ color: 'var(--color-error)' }}>{error}</p>
        </div>
      </div>
    );
  }

  const completed = data?.practices.filter((p) => ['completada', 'calificada'].includes(p.student_status)).length ?? 0;
  const total = data?.total_practices ?? 0;

  return (
    <div className="sdb-page">
      <div className="sdb-container">
        {/* Header */}
        <div className="sdb-header">
          <div>
            <h1 className="sdb-header__title">Mis Practicas</h1>
            <p className="sdb-header__sub">
              Seccion <strong>{data?.section_code ?? '—'}</strong>
              {total > 0 && (
                <> · {completed}/{total} completadas</>
              )}
              {data?.average_score != null && (
                <> · Promedio: <strong>{data.average_score.toFixed(1)}</strong> ({data.scored_count}/{total})</>
              )}
            </p>
          </div>
          <button
            className="btn btn--outline-primary btn--sm"
            onClick={() => { logout(); navigate('/login'); }}
          >
            Cerrar sesion
          </button>
        </div>

        {/* Summary strip */}
        {total > 0 && (
          <div className="sdb-summary">
            <div className="sdb-summary__item">
              <span className="sdb-summary__num">{total}</span>
              <span className="sdb-summary__label">Asignadas</span>
            </div>
            <div className="sdb-summary__item">
              <span className="sdb-summary__num">{data.practices.filter((p) => p.student_status === 'en_progreso').length}</span>
              <span className="sdb-summary__label">En progreso</span>
            </div>
            <div className="sdb-summary__item">
              <span className="sdb-summary__num">{completed}</span>
              <span className="sdb-summary__label">Completadas</span>
            </div>
            <div className="sdb-summary__item">
              <span className="sdb-summary__num" style={{ color: 'var(--color-primary)' }}>
                {data?.average_score != null ? data.average_score.toFixed(1) : '—'}
              </span>
              <span className="sdb-summary__label">Promedio</span>
            </div>
          </div>
        )}

        {/* Practice grid */}
        {total === 0 ? (
          <div className="sdb-empty">
            <p>Tu seccion no tiene practicas asignadas aun.</p>
          </div>
        ) : (
          <div className="sdb-grid">
            {data.practices.map((practice) => (
              <PracticeCard
                key={practice.section_practice_id}
                practice={practice}
                studentId={data.student_id}
                sectionId={data.section_id}
                sectionCode={data.section_code}
                studentName={data.student_name}
                onAction={handleViewResult}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
