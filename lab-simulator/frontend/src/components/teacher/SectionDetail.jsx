import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getSectionStudents, getSectionPractices } from '../../api/client';
import '../../styles/teacher.css';

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

  const [students, setStudents] = useState([]);
  const [practices, setPractices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    Promise.all([
      getSectionStudents(sectionId),
      getSectionPractices(sectionId),
    ])
      .then(([studentsData, practicesData]) => {
        setStudents(studentsData);
        setPractices(practicesData);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [sectionId]);

  const filteredStudents = students.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (filter === 'Todos') return true;
    const allDone =
      practices.length > 0 &&
      practices.every((p) => s.grades[p.id] != null);
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

        {error && (
          <p style={{ color: 'var(--color-danger)', textAlign: 'center', padding: '12px' }}>
            Error al cargar datos: {error}
          </p>
        )}

        {loading ? (
          <p style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-secondary)' }}>
            Cargando…
          </p>
        ) : (
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
                      {practices.map((p) => (
                        <th key={p.id}>{p.name}</th>
                      ))}
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student) => (
                      <tr key={student.id}>
                        <td className="t-table__bold">{student.name}</td>
                        <td className="mono">{student.student_code}</td>
                        {practices.map((p) => (
                          <td key={p.id} className="mono">
                            {student.grades[p.id] != null
                              ? student.grades[p.id].toFixed(1)
                              : '---'}
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
                          colSpan={3 + practices.length}
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
                    {practices.map((p) => {
                      const action = PRACTICE_ACTIONS[p.status] ?? PRACTICE_ACTIONS.blocked;
                      return (
                        <tr key={p.id}>
                          <td className="t-table__bold">{p.name}</td>
                          <td>{p.unit ?? '—'}</td>
                          <td className="mono">{p.open_date ?? '—'}</td>
                          <td className="mono">
                            {p.close_date ?? <span className="badge badge--danger">Bloqueada</span>}
                          </td>
                          <td>
                            <button className={`btn btn--sm ${action.className}`}>
                              {action.label}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {practices.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-secondary)' }}>
                          No hay prácticas asignadas
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}
