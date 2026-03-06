import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import '../../styles/teacher.css';

const MOCK_SECTIONS = [
  {
    id: '10-B',
    students: 24,
    nextPractice: 'Titulación Ácido-Base',
    nextDate: '25/04',
    status: 'programada',
  },
  {
    id: '12-A',
    students: 18,
    nextPractice: 'Destilación Simple',
    nextDate: '26/04',
    status: 'bloqueada',
  },
  {
    id: '11-C',
    students: 22,
    nextPractice: 'Electroquímica',
    nextDate: '27/04/2024',
    status: 'habilitada',
  },
];

const STATUS_CONFIG = {
  programada: { label: 'Programada', className: 'badge--warning' },
  bloqueada:  { label: 'Bloqueada',  className: 'badge--danger' },
  habilitada: { label: 'Habilitada', className: 'badge--success' },
};

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const filtered = MOCK_SECTIONS.filter((s) =>
    s.id.toLowerCase().includes(search.toLowerCase()) ||
    s.nextPractice.toLowerCase().includes(search.toLowerCase())
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
              Simulatoral de Química
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
                const cfg = STATUS_CONFIG[section.status];
                return (
                  <tr key={section.id}>
                    <td className="t-table__bold">{section.id}</td>
                    <td>{section.students}</td>
                    <td>
                      {section.nextPractice}
                      <span className="t-table__date">{section.nextDate}</span>
                    </td>
                    <td>
                      <span className={`badge ${cfg.className}`}>{cfg.label}</span>
                    </td>
                    <td>
                      <button
                        className="btn btn--primary btn--sm"
                        onClick={() => navigate(`/teacher/section/${section.id}`)}
                      >
                        Entrar
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-secondary)' }}>
                    No se encontraron secciones
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
