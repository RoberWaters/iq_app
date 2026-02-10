import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const TYPE_ICONS = {
  medicion: '\u{1F4CF}',
  contenedor: '\u{1F3FA}',
  dosificacion: '\u{1F9EA}',
  accesorio: '\u{1F527}',
  indicator: '\u{1F7E3}',
  acid: '\u26A0\uFE0F',
  base: '\u{1F7E6}',
  salt: '\u{1F7E1}',
  buffer: '\u{1F7E2}',
  chelator: '\u{1F535}',
  oxidant: '\u{1F7E0}',
  reductant: '\u{1F7E4}',
  organic: '\u{1F7E1}',
  solvent: '\u{1F4A7}',
};

function StandItem({ item, selected, onAdd }) {
  const icon = TYPE_ICONS[item.type] || TYPE_ICONS[item.category] || '\u{1F52C}';

  const handleDragStart = (e) => {
    e.dataTransfer.setData('application/x-item-id', item.id);
    e.dataTransfer.setData('application/x-item-category', item._kind);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <motion.div
      className={`stand-item${selected ? ' stand-item-selected' : ''}`}
      draggable={!selected}
      onDragStart={selected ? undefined : handleDragStart}
      onClick={selected ? undefined : () => onAdd(item.id, item._kind)}
      whileHover={selected ? {} : { scale: 1.02 }}
      whileTap={selected ? {} : { scale: 0.97 }}
      layout
    >
      <span className="stand-item-icon">{icon}</span>
      <span className="stand-item-name">{item.name}</span>
      {selected && <span className="stand-item-check">{'\u2713'}</span>}
    </motion.div>
  );
}

export default function ToolStand({
  instruments, reagents,
  selectedInstruments, selectedReagents,
  onAdd,
}) {
  const [tab, setTab] = useState('instruments');

  const currentItems = tab === 'instruments'
    ? instruments.map((i) => ({ ...i, _kind: 'instrument' }))
    : reagents.map((r) => ({ ...r, _kind: 'reagent' }));

  const selectedIds = tab === 'instruments' ? selectedInstruments : selectedReagents;

  return (
    <div className="tool-stand">
      <h3 className="tool-stand-title">Estante de materiales</h3>
      <div className="tool-stand-tabs">
        <button
          className={`tool-stand-tab${tab === 'instruments' ? ' active' : ''}`}
          onClick={() => setTab('instruments')}
        >
          Instrumentos
        </button>
        <button
          className={`tool-stand-tab${tab === 'reagents' ? ' active' : ''}`}
          onClick={() => setTab('reagents')}
        >
          Reactivos
        </button>
      </div>
      <div className="tool-stand-items">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.15 }}
          >
            {currentItems.map((item) => (
              <StandItem
                key={item.id}
                item={item}
                selected={selectedIds.includes(item.id)}
                onAdd={onAdd}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
