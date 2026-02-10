import Button from '../common/Button';
import useTitration from '../../hooks/useTitration';

export default function TitrationControls({ onRecord }) {
  const {
    volumeAdded, currentColor, maxBuretteVolume,
    handleDrop, startStream, stopStream,
    isDropping, isPastEndpoint,
  } = useTitration();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px',
        boxShadow: 'var(--shadow-sm)',
        border: '1px solid var(--color-border)',
      }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '16px' }}>Controles de Bureta</h3>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
          <Button onClick={handleDrop} variant="outline" style={{ flex: 1 }}>
            Gota (0.05 mL)
          </Button>
          <Button
            onMouseDown={startStream}
            onMouseUp={stopStream}
            onMouseLeave={stopStream}
            variant="primary"
            style={{ flex: 1 }}
          >
            {isDropping ? 'Agregando...' : 'Chorro (0.50 mL)'}
          </Button>
        </div>

        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.9rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Volumen agregado:</span>
            <span style={{ fontWeight: 600 }}>{volumeAdded.toFixed(2)} mL</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Nivel de bureta:</span>
            <span style={{ fontWeight: 600 }}>{volumeAdded.toFixed(2)} / {maxBuretteVolume} mL</span>
          </div>
        </div>
      </div>

      {/* Color indicator */}
      <div style={{
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px',
        boxShadow: 'var(--shadow-sm)',
        border: '1px solid var(--color-border)',
      }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '12px' }}>Color de la solución</h3>
        <div style={{
          width: '100%', height: '50px',
          borderRadius: 'var(--radius-md)',
          background: currentColor,
          opacity: 0.8,
          border: '1px solid var(--color-border)',
        }} />
      </div>

      {isPastEndpoint && (
        <div style={{
          padding: '12px',
          background: '#FEF3C7',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.85rem',
          color: '#92400E',
          border: '1px solid #FDE68A',
        }}>
          El color ya cambió hace un momento...
        </div>
      )}

      {/* Record button */}
      <Button onClick={onRecord} variant="success" size="lg" style={{ width: '100%' }}>
        Registrar lectura
      </Button>
    </div>
  );
}
