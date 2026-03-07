import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import '../../styles/teacher.css';

const MOCK_STUDENTS = [
  { name: 'Ana López',     id: 1001, labs: [8.5, 7.0] },
  { name: 'Carlos Méndez', id: 1002, labs: [6.0, null] },
  { name: 'Laura Pérez',   id: 1003, labs: [9.0, 8.2, 7.5] },
];

const MOCK_PRACTICES = [
  {
    name: 'Titulación Ácido-Base',
    unit: 'Ácidos y bases',
    openDate: '25/04 08:00',
    closeDate: '25/04 23:59',
    status: 'active',
  },
  {
    name: 'Destilación Simple',
    unit: 'Mezclas',
    openDate: '25/04 08:00',
    closeDate: null,
    status: 'blocked',
  },
  {
    name: 'Electroquímica',
    unit: 'Redox',
    openDate: '27/04 08:00',
    closeDate: '27/04 23:59',
    status: 'closed',
  },
];

const LAB_NAMES = ['Lab 1: Titulación', 'Lab 2: Destilación', 'Lab 3: Electroquímica'];

const PRACTICE_ACTIONS = {
  active:  { label: 'Editar',    className: 'btn--outline-primary' },
  blocked: { label: 'Programar', className: 'btn--warning' },
  closed:  { label: 'Reabrir',   className: 'btn--outline-primary' },
};

const FILTERS = ['Todos', 'Pendientes', 'Completados'];

export default function SectionDetail() {
  const { sectionId } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState('students');
  const [filter, setFilter] = useState('Todos');
  const [search, setSearch] = useState('');

  const filteredStudents = MOCK_STUDENTS.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (filter === 'Todos') return true;
    const allDone = s.labs.length === LAB_NAMES.length && s.labs.every((l) => l !== null);
    return filter === 'Completados' ? allDone : !allDone;
  });

  return (
    <motion.div
      className="teacher-page"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="teacher-card teacher-card--wide">
        {/* Title bar */}
        <div className="teacher-card__header">
          <h2 className="teacher-card__title">Sección {sectionId}</h2>
          <button
            className="section-close"
            onClick={() => navigate('/teacher')}
            aria-label="Cerrar"
          >
            &times;
          </button>
        </div>

        {/* Tabs */}
        <div className="tabs">
          <button
            className={`tabs__btn ${tab === 'students' ? 'tabs__btn--active' : ''}`}
            onClick={() => setTab('students')}
          >
            Estudiantes y Notas
          </button>
          <button
            className={`tabs__btn ${tab === 'practices' ? 'tabs__btn--active' : ''}`}
            onClick={() => setTab('practices')}
          >
            Prácticas
          </button>
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          {tab === 'students' ? (
            <motion.div
              key="students"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="tab-content"
            >
              {/* Toolbar */}
              <div className="toolbar">
                <div className="toolbar__left">
                  <input
                    type="text"
                    placeholder="Buscar estudiante..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="search-box__input search-box__input--compact"
                  />
                  {FILTERS.map((f) => (
                    <button
                      key={f}
                      className={`filter-chip ${filter === f ? 'filter-chip--active' : ''}`}
                      onClick={() => setFilter(f)}
                    >
                      {f === 'Todos' && <span style={{ marginRight: 4 }}>&#128269;</span>}
                      {f === 'Pendientes' && <span className="filter-dot filter-dot--pending" />}
                      {f === 'Completados' && <span className="filter-dot filter-dot--completed" />}
                      {f}
                    </button>
                  ))}
                </div>
                <button className="btn btn--warning btn--sm">Exportar</button>
              </div>

              {/* Students table */}
              <table className="t-table">
                <thead>
                  <tr>
                    <th>Estudiante</th>
                    <th>ID</th>
                    {LAB_NAMES.map((lab) => (
                      <th key={lab}>{lab}</th>
                    ))}
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => (
                    <tr key={student.id}>
                      <td className="t-table__bold">{student.name}</td>
                      <td className="mono">{student.id}</td>
                      {LAB_NAMES.map((_, i) => (
                        <td key={i} className="mono">
                          {student.labs[i] != null ? student.labs[i].toFixed(1) : '---'}
                        </td>
                      ))}
                      <td>
                        <button className="btn btn--primary btn--sm">Ver detalle</button>
                      </td>
                    </tr>
                  ))}
                  {filteredStudents.length === 0 && (
                    <tr>
                      <td
                        colSpan={3 + LAB_NAMES.length}
                        style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-secondary)' }}
                      >
                        No se encontraron estudiantes
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </motion.div>
          ) : (
            <motion.div
              key="practices"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="tab-content"
            >
              <table className="t-table">
                <thead>
                  <tr>
                    <th>Práctica</th>
                    <th>Unidad</th>
                    <th>Apertura</th>
                    <th>Cierre</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_PRACTICES.map((p) => {
                    const action = PRACTICE_ACTIONS[p.status];
                    return (
                      <tr key={p.name}>
                        <td className="t-table__bold">{p.name}</td>
                        <td>{p.unit}</td>
                        <td className="mono">{p.openDate}</td>
                        <td className="mono">
                          {p.closeDate ?? <span className="badge badge--danger">Bloqueada</span>}
                        </td>
                        <td>
                          <button className={`btn btn--sm ${action.className}`}>
                            {action.label}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
