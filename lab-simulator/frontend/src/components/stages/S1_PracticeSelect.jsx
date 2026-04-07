import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import useSimulatorStore from '../../store/useSimulatorStore';
import { useAuthStore } from '../../store/useAuthStore';
import * as api from '../../api/client';
import Button from '../common/Button';
import { CATEGORY_COLORS, DIFFICULTY_LABELS } from '../../utils/constants';
import '../../styles/stages.css';
import '../../styles/teacher.css';

export default function S1_PracticeSelect() {
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const [practices, setPractices] = useState([]);
  const [sections, setSections] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [identity, setIdentity] = useState({
    student_name: '',
    section_id: '',
    section_code: '',
    student_id: '',
  });
  const navigate = useNavigate();
  const { setPractice, setSessionId, setCurrentStage } = useSimulatorStore();

  useEffect(() => {
    const sectionsPromise = user?.role === 'teacher'
      ? api.getSections().catch(() => [])
      : Promise.resolve([]);

    Promise.all([api.getPractices(), sectionsPromise])
      .then(([practiceData, sectionsData]) => {
        setPractices(practiceData);
        setSections(sectionsData);
      })
      .finally(() => setLoading(false));
  }, [user?.role]);

  useEffect(() => {
    if (user?.role !== 'student' || !profile) return;

    const studentName = [
      profile.first_name,
      profile.second_name,
      profile.first_surname,
      profile.second_surname,
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

    setIdentity((current) => ({
      ...current,
      student_name: studentName || current.student_name,
      section_code: profile.section || current.section_code,
    }));
  }, [profile, user?.role]);

  useEffect(() => {
    if (!identity.section_code || user?.role !== 'teacher') {
      setStudents([]);
      setIdentity((current) => ({ ...current, student_id: '' }));
      return;
    }

    api.getSectionStudents(identity.section_code)
      .then((data) => setStudents(data))
      .catch(() => setStudents([]));
  }, [identity.section_code, user?.role]);

  const selectedStudent = useMemo(
    () => students.find((student) => student.id === identity.student_id),
    [students, identity.student_id],
  );

  const handleSelect = async (practice) => {
    if (!practice.implemented) return;
    try {
      const fullPractice = await api.getPractice(practice.id);
      setPractice(practice.id, fullPractice);
      const session = await api.createSession({
        practice_id: practice.id,
        student_name: identity.student_name || selectedStudent?.name || null,
        student_id: identity.student_id || null,
        section_id: identity.section_id || null,
        section_code: identity.section_code || null,
        student_code: selectedStudent ? String(selectedStudent.student_code) : null,
      });
      setSessionId(session.id);
      setCurrentStage(2);
      navigate(`/practice/${practice.id}/stage/2`);
    } catch (e) {
      console.error('Error starting practice:', e);
    }
  };

  if (loading) return <div className="stage-container"><p>Cargando practicas...</p></div>;

  return (
    <div className="stage-container">
      <div className="stage-header">
        <h2>Laboratorio Virtual de Quimica Analitica</h2>
        <p>Selecciona una practica para comenzar la simulacion</p>
      </div>

      {user?.role === 'teacher' && (
        <div className="identity-panel">
          <div className="identity-panel__copy">
            <h3>Identificacion del estudiante</h3>
            <p>
              Este paso es opcional, pero si eliges seccion y estudiante el panel docente podra
              rastrear avances, intentos y notas automaticamente.
            </p>
          </div>
          <div className="identity-panel__form">
            <label className="field">
              <span>Seccion</span>
              <select
                value={identity.section_id}
                onChange={(e) => {
                  const section = sections.find((item) => item.id === e.target.value);
                  setIdentity((current) => ({
                    ...current,
                    section_id: e.target.value,
                    section_code: section?.code || '',
                    student_id: '',
                  }));
                }}
              >
                <option value="">Sin seccion</option>
                {sections.map((section) => (
                  <option key={section.id} value={section.id}>{section.code}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Estudiante</span>
              <select
                value={identity.student_id}
                onChange={(e) => {
                  const nextId = e.target.value;
                  const student = students.find((item) => item.id === nextId);
                  setIdentity((current) => ({
                    ...current,
                    student_id: nextId,
                    student_name: student?.name || current.student_name,
                  }));
                }}
                disabled={!identity.section_code}
              >
                <option value="">Seleccion manual</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.student_code} - {student.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Nombre visible</span>
              <input
                value={identity.student_name}
                onChange={(e) => setIdentity((current) => ({ ...current, student_name: e.target.value }))}
                placeholder="Nombre del estudiante"
              />
            </label>
          </div>
        </div>
      )}

      <div className="practice-grid">
        {practices.map((practice) => {
          const categoryColor = CATEGORY_COLORS[practice.category] || '#64748B';
          const difficulty = DIFFICULTY_LABELS[practice.difficulty]
            || { label: practice.difficulty, color: '#64748B' };

          return (
            <motion.div
              key={practice.id}
              whileHover={practice.implemented ? { y: -4, boxShadow: '0 8px 25px rgba(0,0,0,0.1)' } : {}}
              style={{
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius-lg)',
                padding: '24px',
                border: '1px solid var(--color-border)',
                boxShadow: 'var(--shadow-sm)',
                opacity: practice.implemented ? 1 : 0.6,
                cursor: practice.implemented ? 'pointer' : 'default',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                position: 'relative',
              }}
              onClick={() => handleSelect(practice)}
            >
              {practice.comingSoon && (
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: '#E2E8F0',
                  color: '#64748B',
                  padding: '2px 10px',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}
                >
                  Proximamente
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: `${categoryColor}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem',
                  fontWeight: 700,
                  color: categoryColor,
                }}
                >
                  {practice.number}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', margin: 0 }}>{practice.name}</h3>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <span style={{
                      fontSize: '0.7rem',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      background: `${categoryColor}15`,
                      color: categoryColor,
                      fontWeight: 500,
                    }}
                    >
                      {practice.category}
                    </span>
                    <span style={{
                      fontSize: '0.7rem',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      background: `${difficulty.color}15`,
                      color: difficulty.color,
                      fontWeight: 500,
                    }}
                    >
                      {difficulty.label}
                    </span>
                  </div>
                </div>
              </div>

              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: 0, flex: 1 }}>
                {practice.description}
              </p>

              {practice.implemented && (
                <Button size="sm" style={{ alignSelf: 'flex-start' }}>
                  Iniciar practica
                </Button>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
