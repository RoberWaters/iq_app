import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import useSimulatorStore from '../../store/useSimulatorStore';
import * as api from '../../api/client';
import Button from '../common/Button';
import { CATEGORY_COLORS, DIFFICULTY_LABELS } from '../../utils/constants';
import '../../styles/stages.css';

export default function S1_PracticeSelect() {
  const [practices, setPractices] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { setPractice, setSessionId, setCurrentStage } = useSimulatorStore();

  useEffect(() => {
    api.getPractices().then((data) => {
      setPractices(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSelect = async (practice) => {
    if (!practice.implemented) return;
    try {
      const fullPractice = await api.getPractice(practice.id);
      setPractice(practice.id, fullPractice);
      const session = await api.createSession({ practice_id: practice.id });
      setSessionId(session.id);
      setCurrentStage(2);
      navigate(`/practice/${practice.id}/stage/2`);
    } catch (e) {
      console.error('Error starting practice:', e);
    }
  };

  if (loading) return <div className="stage-container"><p>Cargando prácticas...</p></div>;

  return (
    <div className="stage-container">
      <div className="stage-header">
        <h2>Laboratorio Virtual de Química Analítica</h2>
        <p>Selecciona una práctica para comenzar la simulación</p>
      </div>
      <div className="practice-grid">
        {practices.map((p) => {
          const catColor = CATEGORY_COLORS[p.category] || '#64748B';
          const diff = DIFFICULTY_LABELS[p.difficulty] || { label: p.difficulty, color: '#64748B' };

          return (
            <motion.div
              key={p.id}
              whileHover={p.implemented ? { y: -4, boxShadow: '0 8px 25px rgba(0,0,0,0.1)' } : {}}
              style={{
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius-lg)',
                padding: '24px',
                border: '1px solid var(--color-border)',
                boxShadow: 'var(--shadow-sm)',
                opacity: p.implemented ? 1 : 0.6,
                cursor: p.implemented ? 'pointer' : 'default',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                position: 'relative',
              }}
              onClick={() => handleSelect(p)}
            >
              {/* Coming soon badge */}
              {p.comingSoon && (
                <div style={{
                  position: 'absolute', top: '12px', right: '12px',
                  background: '#E2E8F0', color: '#64748B',
                  padding: '2px 10px', borderRadius: '12px',
                  fontSize: '0.75rem', fontWeight: 600,
                }}>
                  Próximamente
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '10px',
                  background: catColor + '15',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.2rem', fontWeight: 700, color: catColor,
                }}>
                  {p.number}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', margin: 0 }}>{p.name}</h3>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <span style={{
                      fontSize: '0.7rem', padding: '2px 8px',
                      borderRadius: '10px', background: catColor + '15', color: catColor,
                      fontWeight: 500,
                    }}>
                      {p.category}
                    </span>
                    <span style={{
                      fontSize: '0.7rem', padding: '2px 8px',
                      borderRadius: '10px', background: diff.color + '15', color: diff.color,
                      fontWeight: 500,
                    }}>
                      {diff.label}
                    </span>
                  </div>
                </div>
              </div>

              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: 0, flex: 1 }}>
                {p.description}
              </p>

              {p.implemented && (
                <Button size="sm" style={{ alignSelf: 'flex-start' }}>
                  Iniciar práctica
                </Button>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
