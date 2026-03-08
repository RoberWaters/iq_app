import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getSections } from '../../api/client';
import '../../styles/teacher.css';

const STATUS_CONFIG = {
  programada: { label: 'Programada', className: 'badge--warning' },
  bloqueada:  { label: 'Bloqueada',  className: 'badge--danger' },
  habilitada: { label: 'Habilitada', className: 'badge--success' },
};

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getSections()
      .then(setSections)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = sections.filter((s) =>
    s.code.toLowerCase().includes(search.toLowerCase()) ||
    (s.next_practice ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div
      className="teacher-page"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="teacher-card">
        <div className="teacher-card__header">
          <div>
            <h1 className="teacher-card__title">
              <span className="teacher-card__icon">&#9879;</span>
              Simulador de Química
            </h1>
          </div>
          <button
            className="btn btn--outline-primary btn--sm"
            onClick={() => navigate('/')}
          >
            Cerrar Sesión
          </button>
        </div>

        <div className="teacher-card__body">
          <div className="teacher-card__welcome-row">
            <h2 className="teacher-card__welcome">Bienvenido, Prof. Martínez</h2>
            <div className="search-box">
              <input
                type="text"
                placeholder="Buscar sección..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="search-box__input"
              />
              <span className="search-box__icon">&#128269;</span>
            </div>
          </div>

          {error && (
            <p style={{ color: 'var(--color-danger)', textAlign: 'center', padding: '12px' }}>
              Error al cargar secciones: {error}
            </p>
          )}

          {loading ? (
            <p style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-secondary)' }}>
              Cargando secciones…
            </p>
          ) : (
            <table className="t-table">
              <thead>
                <tr>
                  <th>Sección</th>
                  <th># Estudiantes</th>
                  <th>Próxima Práctica</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((section) => {
                  const cfg = STATUS_CONFIG[section.status] ?? STATUS_CONFIG.bloqueada;
                  return (
                    <tr key={section.id}>
                      <td className="t-table__bold">{section.code}</td>
                      <td>{section.student_count}</td>
                      <td>
                        {section.next_practice ?? '—'}
                        {section.next_date && (
                          <span className="t-table__date">{section.next_date}</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${cfg.className}`}>{cfg.label}</span>
                      </td>
                      <td>
                        <button
                          className="btn btn--primary btn--sm"
                          onClick={() => navigate(`/teacher/section/${section.code}`)}
                        >
                          Entrar
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-secondary)' }}>
                      No se encontraron secciones
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </motion.div>
  );
}
