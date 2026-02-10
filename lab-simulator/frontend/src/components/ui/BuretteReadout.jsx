import useTitration from '../../hooks/useTitration';

export default function BuretteReadout() {
  const { volumeAdded, maxBuretteVolume, progress } = useTitration();

  return (
    <div style={{
      fontFamily: 'var(--font-mono)',
      background: 'var(--color-surface)',
      borderRadius: 'var(--radius-lg)',
      padding: '16px',
      boxShadow: 'var(--shadow-sm)',
      border: '1px solid var(--color-border)',
    }}>
      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
        Lectura de bureta
      </div>
      <div style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--color-primary)' }}>
        {volumeAdded.toFixed(2)} <span style={{ fontSize: '0.9rem', fontWeight: 400 }}>mL</span>
      </div>
      <div style={{
        marginTop: '8px',
        height: '4px',
        background: 'var(--color-border-light)',
        borderRadius: '2px',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${Math.min(100, (volumeAdded / maxBuretteVolume) * 100)}%`,
          background: progress >= 1 ? 'var(--color-warning)' : 'var(--color-primary)',
          transition: 'width 0.2s',
        }} />
      </div>
    </div>
  );
}
