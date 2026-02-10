import MaterialCard from './MaterialCard';

export default function WorkBench({ instruments, reagents, onRemoveInstrument, onRemoveReagent }) {
  const hasItems = instruments.length > 0 || reagents.length > 0;

  return (
    <div className="material-panel">
      <h3>Mesa de trabajo</h3>
      {!hasItems && (
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', textAlign: 'center', padding: '40px 0' }}>
          Selecciona los materiales del estante para colocarlos aquí
        </p>
      )}
      {instruments.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Instrumentos ({instruments.length})</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {instruments.map((item) => (
              <MaterialCard key={item.id} {...item} selected onClick={onRemoveInstrument} />
            ))}
          </div>
        </div>
      )}
      {reagents.length > 0 && (
        <div>
          <h4 style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Reactivos ({reagents.length})</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {reagents.map((item) => (
              <MaterialCard key={item.id} {...item} selected onClick={onRemoveReagent} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
