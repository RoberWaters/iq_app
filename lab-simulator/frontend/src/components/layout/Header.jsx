import { useNavigate } from 'react-router-dom';
import useSimulatorStore from '../../store/useSimulatorStore';
import { useAuthStore } from '../../store/useAuthStore';

export default function Header() {
  const navigate = useNavigate();
  const { practiceConfig, reset } = useSimulatorStore();
  const { isAuthenticated, logout } = useAuthStore();

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

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {practiceConfig && (
          <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
            Práctica {practiceConfig.number}: {practiceConfig.name}
          </div>
        )}
        {isAuthenticated && (
          <button
            onClick={() => { logout(); reset(); navigate('/login'); }}
            style={{
              background: 'none',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              padding: '4px 12px',
              fontSize: '0.85rem',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
            }}
          >
            Cerrar Sesión
          </button>
        )}
      </div>
    </header>
  );
}
