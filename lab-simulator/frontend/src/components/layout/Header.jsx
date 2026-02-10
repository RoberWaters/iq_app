import { useNavigate } from 'react-router-dom';
import useSimulatorStore from '../../store/useSimulatorStore';

export default function Header() {
  const navigate = useNavigate();
  const { practiceConfig, reset } = useSimulatorStore();

  return (
    <header style={{
      background: 'var(--color-surface)',
      borderBottom: '1px solid var(--color-border)',
      padding: '12px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: '56px',
    }}>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
        onClick={() => { reset(); navigate('/'); }}
      >
        <span style={{ fontSize: '1.3rem' }}>&#9879;</span>
        <span style={{ fontWeight: 600, fontSize: '1.05rem', color: 'var(--color-text)' }}>
          Laboratorio Virtual
        </span>
      </div>

      {practiceConfig && (
        <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
          Práctica {practiceConfig.number}: {practiceConfig.name}
        </div>
      )}
    </header>
  );
}
