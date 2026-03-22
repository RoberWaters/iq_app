import useTitrationStore from '../../store/useTitrationStore';

export default function StirrerControls() {
  const {
    stirrerOn, stirrerSpeed, stirBarInFlask,
    toggleStirrer, setStirrerSpeed,
  } = useTitrationStore();

  const canToggle = stirBarInFlask || stirrerOn;

  return (
    <div style={{
      background: 'var(--color-surface)',
      borderRadius: 'var(--radius-lg)',
      padding: '16px 20px',
      boxShadow: 'var(--shadow-sm)',
      border: '1px solid var(--color-border)',
    }}>
      <h3 style={{ fontSize: '0.95rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        Agitador Magnético
        <span style={{
          display: 'inline-block',
          width: 8, height: 8,
          borderRadius: '50%',
          background: stirrerOn ? '#22C55E' : '#9CA3AF',
          boxShadow: stirrerOn ? '0 0 6px #22C55E' : 'none',
        }} />
      </h3>

      {/* On/Off toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Encendido</span>
        <button
          onClick={canToggle ? toggleStirrer : undefined}
          style={{
            width: 44, height: 24,
            borderRadius: 12,
            border: 'none',
            background: stirrerOn ? '#22C55E' : '#D1D5DB',
            cursor: canToggle ? 'pointer' : 'not-allowed',
            position: 'relative',
            transition: 'background 0.2s',
            opacity: canToggle ? 1 : 0.5,
          }}
        >
          <span style={{
            position: 'absolute',
            top: 3, left: stirrerOn ? 23 : 3,
            width: 18, height: 18,
            borderRadius: '50%',
            background: 'white',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            transition: 'left 0.2s',
          }} />
        </button>
      </div>

      {/* Speed slider */}
      <div style={{ marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Velocidad</span>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.85rem',
            fontWeight: 600,
            color: stirrerOn ? 'var(--color-primary)' : 'var(--color-text-secondary)',
          }}>
            {stirrerSpeed}
          </span>
        </div>
        <input
          type="range"
          min={1} max={5} step={1}
          value={stirrerSpeed}
          onChange={(e) => setStirrerSpeed(Number(e.target.value))}
          disabled={!stirrerOn}
          style={{
            width: '100%',
            accentColor: 'var(--color-primary)',
            opacity: stirrerOn ? 1 : 0.4,
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#94A3B8' }}>
          <span>Lenta</span>
          <span>Rápida</span>
        </div>
      </div>

      {/* Status text */}
      <div style={{
        fontSize: '0.8rem',
        padding: '8px 10px',
        borderRadius: 'var(--radius-md)',
        background: stirrerOn ? '#F0FDF4' : !stirBarInFlask ? '#FEF3C7' : '#F8FAFC',
        color: stirrerOn ? '#166534' : !stirBarInFlask ? '#92400E' : '#64748B',
        border: `1px solid ${stirrerOn ? '#BBF7D0' : !stirBarInFlask ? '#FDE68A' : '#E2E8F0'}`,
      }}>
        {!stirBarInFlask
          ? 'Arrastre el magneto al matraz'
          : stirrerOn
            ? `Agitando a velocidad ${stirrerSpeed}`
            : 'Magneto colocado — apagado'}
      </div>
    </div>
  );
}
