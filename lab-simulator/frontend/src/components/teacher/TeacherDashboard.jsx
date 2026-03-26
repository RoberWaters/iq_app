import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getSections, createSection, updateSection, deleteSection, getCatalogPractices } from '../../api/client';
import '../../styles/teacher.css';

const STATUS_CONFIG = {
  programada: { label: 'Programada', className: 'badge--warning' },
  bloqueada:  { label: 'Bloqueada',  className: 'badge--danger' },
  habilitada: { label: 'Habilitada', className: 'badge--success' },
};

const STATUS_OPTIONS = [
  { value: 'bloqueada',  label: 'Bloqueada' },
  { value: 'programada', label: 'Programada' },
  { value: 'habilitada', label: 'Habilitada' },
];

const EMPTY_FORM = {
  code: '',
  student_count: 0,
  next_practice: '',
  next_date: '',
  status: 'bloqueada',
};

function SectionModal({ initial, catalog, onClose, onSave }) {
  const isEdit = !!initial?.id;
  const [form, setForm] = useState(
    isEdit
      ? {
          code: initial.code,
          student_count: initial.student_count,
          next_practice: initial.next_practice ?? '',
          next_date: initial.next_date ?? '',
          status: initial.status,
        }
      : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload = {
        ...form,
        student_count: Number(form.student_count),
        next_practice: form.next_practice || null,
        next_date: form.next_date || null,
      };
      if (isEdit) {
        await updateSection(initial.id, payload);
      } else {
        await createSection(payload);
      }
      onSave();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div
        className="modal-box"
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.15 }}
      >
        <h3 className="modal-box__title">
          {isEdit ? `Editar sección ${initial.code}` : 'Nueva sección'}
        </h3>

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="modal-form__field">
            <label className="modal-form__label">Código</label>
            <input
              className="modal-form__input"
              value={form.code}
              onChange={(e) => set('code', e.target.value)}
              placeholder="Ej: 10-B"
              required
              autoFocus
            />
          </div>

          <div className="modal-form__field">
            <label className="modal-form__label"># Estudiantes</label>
            <input
              className="modal-form__input"
              type="number"
              min={0}
              value={form.student_count}
              onChange={(e) => set('student_count', e.target.value)}
            />
          </div>

          <div className="modal-form__field">
            <label className="modal-form__label">Próxima práctica</label>
            <select
              className="modal-form__select"
              value={form.next_practice}
              onChange={(e) => set('next_practice', e.target.value)}
            >
              <option value="">— Sin asignar —</option>
              {catalog.map((p) => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="modal-form__field">
            <label className="modal-form__label">Fecha</label>
            <input
              className="modal-form__input"
              value={form.next_date}
              onChange={(e) => set('next_date', e.target.value)}
              placeholder="Ej: 25/04"
            />
          </div>

          <div className="modal-form__field">
            <label className="modal-form__label">Estado</label>
            <select
              className="modal-form__select"
              value={form.status}
              onChange={(e) => set('status', e.target.value)}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {error && <p className="modal-form__error">{error}</p>}

          <div className="modal-form__footer">
            <button type="button" className="btn btn--outline-primary btn--sm" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn--primary btn--sm" disabled={saving}>
              {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear sección'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [sections, setSections] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [modal, setModal] = useState(null);  // null | 'create' | section object (for edit)
  const [confirmId, setConfirmId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  function fetchSections() {
    setLoading(true);
    getSections()
      .then(setSections)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchSections();
    getCatalogPractices().then(setCatalog).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDelete(id) {
    setDeleting(true);
    try {
      await deleteSection(id);
      setConfirmId(null);
      fetchSections();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  }

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
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
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
              <button
                className="btn btn--primary btn--sm"
                onClick={() => setModal('create')}
              >
                + Nueva Sección
              </button>
            </div>
          </div>

          {error && (
            <p style={{ color: 'var(--color-danger)', textAlign: 'center', padding: '12px' }}>
              {error}
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
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((section) => {
                  const cfg = STATUS_CONFIG[section.status] ?? STATUS_CONFIG.bloqueada;
                  const confirming = confirmId === section.id;
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
                      <td>
                        {confirming ? (
                          <div className="confirm-inline">
                            <span>¿Eliminar?</span>
                            <button
                              className="btn btn--sm"
                              style={{ background: '#b91c1c', color: '#fff' }}
                              onClick={() => handleDelete(section.id)}
                              disabled={deleting}
                            >
                              {deleting ? '…' : 'Sí'}
                            </button>
                            <button
                              className="btn btn--outline-primary btn--sm"
                              onClick={() => setConfirmId(null)}
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <div className="t-table__actions">
                            <button
                              className="btn btn--icon"
                              title="Editar"
                              onClick={() => setModal(section)}
                            >
                              ✏️
                            </button>
                            <button
                              className="btn btn--icon btn--icon-danger"
                              title="Eliminar"
                              onClick={() => setConfirmId(section.id)}
                            >
                              🗑️
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-secondary)' }}>
                      No se encontraron secciones
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <AnimatePresence>
        {modal && (
          <SectionModal
            initial={modal === 'create' ? null : modal}
            catalog={catalog}
            onClose={() => setModal(null)}
            onSave={() => { setModal(null); fetchSections(); }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
