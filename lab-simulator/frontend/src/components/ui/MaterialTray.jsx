import MaterialCard from './MaterialCard';

export default function MaterialTray({ title, items, selectedIds, onToggle, type = 'instrument' }) {
  return (
    <div className="material-panel">
      <h3>{title}</h3>
      <div className="material-items" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {items.map((item) => (
          <MaterialCard
            key={item.id}
            id={item.id}
            name={item.name}
            type={item.type}
            category={item.category}
            selected={selectedIds.includes(item.id)}
            onClick={onToggle}
          />
        ))}
      </div>
    </div>
  );
}
