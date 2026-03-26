import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getSectionStudents,
  getSectionPractices,
  getCatalogPractices,
  createSectionPractice,
  updateSectionPractice,
  deleteSectionPractice,
} from '../../api/client';
import '../../styles/teacher.css';

const PRACTICE_STATUS_CONFIG = {
  active:  { label: 'Activa',    className: 'badge--success',  action: 'Editar',    actionClass: 'btn--outline-primary' },
  blocked: { label: 'Bloqueada', className: 'badge--danger',   action: 'Programar', actionClass: 'btn--warning' },
  closed:  { label: 'Cerrada',   className: 'badge--warning',  action: 'Reabrir',   actionClass: 'btn--outline-primary' },
};

const PRACTICE_STATUSES = [
  { value: 'blocked', label: 'Bloqueada' },
  { value: 'active',  label: 'Activa' },
  { value: 'closed',  label: 'Cerrada' },
];

const FILTERS = ['Todos', 'Pendientes', 'Completados'];

// ── Modal for assigning / editing a practice ───────────────────────────────

function PracticeModal({ initial, catalog, onClose, onSave }) {
  const isEdit = !!initial;
  const [form, setForm] = useState(
    isEdit
      ? { practice_id: initial.practice_id, open_date: initial.open_date ?? '', close_date: initial.close_date ?? '', status: initial.status }
      : { practice_id: catalog[0]?.id ?? '', open_date: '', close_date: '', status: 'blocked' }
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
        practice_id: Number(form.practice_id),
        open_date: form.open_date || null,
        close_date: form.close_date || null,
      };
      if (isEdit) {
        await updateSectionPractice(initial.id, { open_date: payload.open_date, close_date: payload.close_date, status: payload.status });
      } else {
        await onSave(payload);
        return;
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
          {isEdit ? `Editar práctica: ${initial.name}` : 'Asignar práctica'}
        </h3>

        <form className="modal-form" onSubmit={handleSubmit}>
          {!isEdit && (
            <div className="modal-form__field">
              <label className="modal-form__label">Práctica del catálogo</label>
              <select
                className="modal-form__select"
                value={form.practice_id}
                onChange={(e) => set('practice_id', e.target.value)}
                required
              >
                {catalog.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.category})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="modal-form__field">
            <label className="modal-form__label">Fecha / hora de apertura</label>
            <input
              className="modal-form__input"
              value={form.open_date}
              onChange={(e) => set('open_date', e.target.value)}
              placeholder="Ej: 25/04 08:00"
            />
          </div>

          <div className="modal-form__field">
            <label className="modal-form__label">Fecha / hora de cierre</label>
            <input
              className="modal-form__input"
              value={form.close_date}
              onChange={(e) => set('close_date', e.target.value)}
              placeholder="Ej: 25/04 23:59"
            />
          </div>

          <div className="modal-form__field">
            <label className="modal-form__label">Estado</label>
            <select
              className="modal-form__select"
              value={form.status}
              onChange={(e) => set('status', e.target.value)}
            >
              {PRACTICE_STATUSES.map((o) => (
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
              {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Asignar'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function SectionDetail() {
  const { sectionId } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState('students');
  const [filter, setFilter] = useState('Todos');
  const [search, setSearch] = useState('');

  const [students, setStudents] = useState([]);
  const [practices, setPractices] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [practiceModal, setPracticeModal] = useState(null); // null | 'create' | practice object
  const [confirmPracticeId, setConfirmPracticeId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  function fetchData() {
    setLoading(true);
    setError(null);
    Promise.all([
      getSectionStudents(sectionId),
      getSectionPractices(sectionId),
      catalog.length ? Promise.resolve(catalog) : getCatalogPractices(),
    ])
      .then(([studentsData, practicesData, catalogData]) => {
        setStudents(studentsData);
        setPractices(practicesData);
        if (catalogData !== catalog) setCatalog(catalogData);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchData(); }, [sectionId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAssignPractice(payload) {
    await createSectionPractice(sectionId, payload);
    setPracticeModal(null);
    fetchData();
  }

  async function handleDeletePractice(id) {
    setDeleting(true);
    try {
      await deleteSectionPractice(id);
      setConfirmPracticeId(null);
      fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  const filteredStudents = students.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (filter === 'Todos') return true;
    const allDone = practices.length > 0 && practices.every((p) => s.grades[p.id] != null);
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
        <div className="teacher-card__header">
          <h2 className="teacher-card__title">Sección {sectionId}</h2>
          <button className="section-close" onClick={() => navigate('/teacher')} aria-label="Cerrar">
            &times;
          </button>
        </div>

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
            {error}
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
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="tab-content"
              >
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
                            {student.grades[p.id] != null ? student.grades[p.id].toFixed(1) : '---'}
                          </td>
                        ))}
                        <td>
                          <button className="btn btn--primary btn--sm">Ver detalle</button>
                        </td>
                      </tr>
                    ))}
                    {filteredStudents.length === 0 && (
                      <tr>
                        <td colSpan={3 + practices.length} style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-secondary)' }}>
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
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="tab-content"
              >
                <div className="toolbar">
                  <div className="toolbar__left" />
                  <button
                    className="btn btn--primary btn--sm"
                    onClick={() => setPracticeModal('create')}
                  >
                    + Asignar práctica
                  </button>
                </div>

                <table className="t-table">
                  <thead>
                    <tr>
                      <th>Práctica</th>
                      <th>Categoría</th>
                      <th>Apertura</th>
                      <th>Cierre</th>
                      <th>Estado</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {practices.map((p) => {
                      const cfg = PRACTICE_STATUS_CONFIG[p.status] ?? PRACTICE_STATUS_CONFIG.blocked;
                      const confirming = confirmPracticeId === p.id;
                      return (
                        <tr key={p.id}>
                          <td className="t-table__bold">{p.name}</td>
                          <td>{p.category}</td>
                          <td className="mono">{p.open_date ?? '—'}</td>
                          <td className="mono">{p.close_date ?? '—'}</td>
                          <td>
                            <span className={`badge ${cfg.className}`}>{cfg.label}</span>
                          </td>
                          <td>
                            {confirming ? (
                              <div className="confirm-inline">
                                <span>¿Eliminar?</span>
                                <button
                                  className="btn btn--sm"
                                  style={{ background: '#b91c1c', color: '#fff' }}
                                  onClick={() => handleDeletePractice(p.id)}
                                  disabled={deleting}
                                >
                                  {deleting ? '…' : 'Sí'}
                                </button>
                                <button
                                  className="btn btn--outline-primary btn--sm"
                                  onClick={() => setConfirmPracticeId(null)}
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <div className="t-table__actions">
                                <button
                                  className="btn btn--icon"
                                  title="Editar"
                                  onClick={() => setPracticeModal(p)}
                                >
                                  ✏️
                                </button>
                                <button
                                  className="btn btn--icon btn--icon-danger"
                                  title="Eliminar"
                                  onClick={() => setConfirmPracticeId(p.id)}
                                >
                                  🗑️
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {practices.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-secondary)' }}>
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

      <AnimatePresence>
        {practiceModal && (
          <PracticeModal
            initial={practiceModal === 'create' ? null : practiceModal}
            catalog={catalog}
            onClose={() => setPracticeModal(null)}
            onSave={practiceModal === 'create' ? handleAssignPractice : () => { setPracticeModal(null); fetchData(); }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
