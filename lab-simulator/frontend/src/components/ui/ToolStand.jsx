import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LabIcon from './LabIcon';

function StandItem({ item, selected, onAdd }) {
  // For instruments use the `icon` field; for reagents use the `category` field
  const iconName = item.icon || item.category;

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
      <span className="stand-item-icon">
        <LabIcon name={iconName} size={22} />
      </span>
      <span className="stand-item-name">{item.name}</span>
      {selected && <span className="stand-item-check">{'✓'}</span>}
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
