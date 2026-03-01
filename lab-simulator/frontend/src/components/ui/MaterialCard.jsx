import { motion } from 'framer-motion';

const TYPE_ICONS = {
  medicion: '\u{1F4CF}',
  contenedor: '\u{1F3FA}',
  dosificacion: '\u{1F9EA}',
  accesorio: '\u{1F527}',
  indicator: '\u{1F7E3}',
  acid: '⚠',
  base: '\u{1F7E6}',
  salt: '\u{1F7E1}',
  buffer: '\u{1F7E2}',
  chelator: '\u{1F535}',
  oxidant: '\u{1F7E0}',
  reductant: '\u{1F7E4}',
  organic: '\u{1F7E1}',
  solvent: '\u{1F4A7}',
};

export default function MaterialCard({ id, name, type, category, selected, onClick, disabled }) {
  const icon = TYPE_ICONS[type] || TYPE_ICONS[category] || '\u{1F52C}';

  return (
    <motion.div
      whileHover={disabled ? {} : { scale: 1.03 }}
      whileTap={disabled ? {} : { scale: 0.97 }}
      onClick={disabled ? undefined : () => onClick(id)}
      style={{
        padding: '10px 14px',
        borderRadius: 'var(--radius-md)',
        border: `2px solid ${selected ? 'var(--color-primary)' : 'var(--color-border)'}`,
        background: selected ? '#EFF6FF' : 'var(--color-surface)',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '0.85rem',
        transition: 'all 0.2s',
        userSelect: 'none',
      }}
    >
      <span style={{ fontSize: '1.2rem' }}>{icon}</span>
      <span style={{ fontWeight: selected ? 600 : 400, color: 'var(--color-text)' }}>
        {name}
      </span>
      {selected && (
        <span style={{ marginLeft: 'auto', color: 'var(--color-primary)', fontWeight: 700 }}>{'✓'}</span>
      )}
    </motion.div>
  );
}
