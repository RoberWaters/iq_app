import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  createSection,
  deleteSection,
  getSections,
  updateSection,
} from '../../api/client';
import { useAuthStore } from '../../store/useAuthStore';
import '../../styles/teacher.css';

const STATUS_CONFIG = {
  programada: { label: 'Programada', className: 'badge--warning' },
  bloqueada: { label: 'Bloqueada', className: 'badge--danger' },
  habilitada: { label: 'Habilitada', className: 'badge--success' },
};

const STATUS_OPTIONS = [
  { value: 'bloqueada', label: 'Bloqueada' },
  { value: 'programada', label: 'Programada' },
  { value: 'habilitada', label: 'Habilitada' },
];

const EMPTY_FORM = {
  code: '',
  next_practice: '',
  next_date: '',
  status: 'bloqueada',
};

function buildTeacherName(profile) {
  if (!profile) return 'Docente';
  return [profile.first_name, profile.first_surname].filter(Boolean).join(' ') || 'Docente';
}

function SectionModal({ initial, onClose, onSave }) {
  const isEdit = Boolean(initial?.id);
  const [form, setForm] = useState(
    isEdit
      ? {
          code: initial.code,
          next_practice: initial.next_practice ?? '',
          next_date: initial.next_date ?? '',
          status: initial.status,
        }
      : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function setField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        code: form.code.trim(),
        next_practice: form.next_practice.trim() || null,
        next_date: form.next_date.trim() || null,
        status: form.status,
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
    <div className="modal-overlay" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <motion.div
        className="modal-box"
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.15 }}
      >
        <h3 className="modal-box__title">
          {isEdit ? `Editar seccion ${initial.code}` : 'Nueva seccion'}
        </h3>

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="modal-form__field">
            <label className="modal-form__label">Codigo</label>
            <input
              className="modal-form__input"
              value={form.code}
              onChange={(event) => setField('code', event.target.value)}
              placeholder="Ej: 10-B"
              required
              autoFocus
            />
          </div>

          <div className="modal-form__field">
            <label className="modal-form__label">Proxima practica</label>
            <input
              className="modal-form__input"
              value={form.next_practice}
              onChange={(event) => setField('next_practice', event.target.value)}
              placeholder="Opcional"
            />
          </div>

          <div className="modal-form__field">
            <label className="modal-form__label">Fecha visible</label>
            <input
              className="modal-form__input"
              value={form.next_date}
              onChange={(event) => setField('next_date', event.target.value)}
              placeholder="Ej: 25/04 08:00"
            />
          </div>

          <div className="modal-form__field">
            <label className="modal-form__label">Estado</label>
            <select
              className="modal-form__select"
              value={form.status}
              onChange={(event) => setField('status', event.target.value)}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          {error && <p className="modal-form__error">{error}</p>}

          <div className="modal-form__footer">
            <button type="button" className="btn btn--outline-primary btn--sm" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn--primary btn--sm" disabled={saving}>
              {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear seccion'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const profile = useAuthStore((state) => state.profile);
  const [search, setSearch] = useState('');
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function fetchSections() {
    setLoading(true);
    setError('');
    try {
      setSections(await getSections());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSections();
  }, []);

  async function handleDelete(id) {
    setDeleting(true);
    setError('');
    try {
      await deleteSection(id);
      setConfirmId(null);
      await fetchSections();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  const filteredSections = useMemo(
    () => sections.filter((section) =>
      section.code.toLowerCase().includes(search.toLowerCase())
      || (section.next_practice ?? '').toLowerCase().includes(search.toLowerCase())),
    [search, sections],
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
              Simulador de Quimica
            </h1>
            <p className="teacher-card__subtitle">Panel docente conectado a datos reales de secciones y practicas.</p>
          </div>
          <button
            className="btn btn--outline-primary btn--sm"
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            Cerrar sesion
          </button>
        </div>

        <div className="teacher-card__body">
          <div className="teacher-card__welcome-row">
            <div>
              <h2 className="teacher-card__welcome">Bienvenido, {buildTeacherName(profile)}</h2>
              <p className="teacher-card__caption">Administra secciones, estudiantes, practicas y resultados.</p>
            </div>
            <div className="teacher-card__actions">
              <div className="search-box">
                <input
                  type="text"
                  placeholder="Buscar seccion..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="search-box__input"
                />
                <span className="search-box__icon">&#128269;</span>
              </div>
              <button className="btn btn--primary btn--sm" onClick={() => setModal('create')}>
                + Nueva seccion
              </button>
            </div>
          </div>

          {error && <p className="teacher-error-banner">{error}</p>}

          {loading ? (
            <p className="teacher-empty-state">Cargando secciones...</p>
          ) : (
            <table className="t-table">
              <thead>
                <tr>
                  <th>Seccion</th>
                  <th>Estudiantes</th>
                  <th>Proxima practica</th>
                  <th>Estado</th>
                  <th />
                  <th />
                </tr>
              </thead>
              <tbody>
                {filteredSections.map((section) => {
                  const config = STATUS_CONFIG[section.status] ?? STATUS_CONFIG.bloqueada;
                  const confirming = confirmId === section.id;
                  return (
                    <tr key={section.id}>
                      <td className="t-table__bold">{section.code}</td>
                      <td>{section.student_count}</td>
                      <td>
                        {section.next_practice ?? '-'}
                        {section.next_date && <span className="t-table__date">{section.next_date}</span>}
                      </td>
                      <td><span className={`badge ${config.className}`}>{config.label}</span></td>
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
                            <span>Eliminar?</span>
                            <button
                              className="btn btn--sm btn--danger"
                              onClick={() => handleDelete(section.id)}
                              disabled={deleting}
                            >
                              {deleting ? '...' : 'Si'}
                            </button>
                            <button className="btn btn--outline-primary btn--sm" onClick={() => setConfirmId(null)}>
                              No
                            </button>
                          </div>
                        ) : (
                          <div className="t-table__actions">
                            <button className="btn btn--icon" title="Editar" onClick={() => setModal(section)}>
                              Editar
                            </button>
                            <button
                              className="btn btn--icon btn--icon-danger"
                              title="Eliminar"
                              onClick={() => setConfirmId(section.id)}
                            >
                              Borrar
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredSections.length === 0 && (
                  <tr>
                    <td colSpan={6} className="teacher-empty-cell">
                      No se encontraron secciones.
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
            onClose={() => setModal(null)}
            onSave={() => {
              setModal(null);
              fetchSections();
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
