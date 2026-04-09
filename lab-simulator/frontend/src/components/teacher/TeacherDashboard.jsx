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

const EMPTY_FORM = {
  code: '',
  description: '',
  academic_year: '',
  academic_period: '',
};

function buildTeacherName(profile) {
  if (!profile) return 'Docente';
  return [profile.first_name, profile.first_surname].filter(Boolean).join(' ') || 'Docente';
}

function SectionModal({ initial, onClose, onSave }) {
  const isEdit = Boolean(initial?.id);
  const [form, setForm] = useState(isEdit ? {
    code: initial.code,
    description: initial.description || '',
    academic_year: initial.academic_year || '',
    academic_period: initial.academic_period || '',
  } : EMPTY_FORM);
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
        description: form.description.trim() || null,
        academic_year: form.academic_year.trim() || null,
        academic_period: form.academic_period || null,
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
              placeholder=""
              required
              autoFocus
            />
          </div>

          <div className="modal-form__field">
            <label className="modal-form__label">Descripcion</label>
            <input
              className="modal-form__input"
              value={form.description}
              onChange={(event) => setField('description', event.target.value)}
              placeholder=""
            />
          </div>

          <div className="modal-form__row">
            <div className="modal-form__field">
              <label className="modal-form__label">Año Academico</label>
              <input
                className="modal-form__input"
                value={form.academic_year}
                onChange={(event) => setField('academic_year', event.target.value)}
                placeholder=""
              />
            </div>
            <div className="modal-form__field">
              <label className="modal-form__label">Periodo Academico</label>
              <select
                className="modal-form__input"
                value={form.academic_period}
                onChange={(event) => setField('academic_period', event.target.value)}
              >
                <option value="">-- Seleccionar --</option>
                <option value="I">I</option>
                <option value="II">II</option>
                <option value="III">III</option>
              </select>
            </div>
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
      section.code.toLowerCase().includes(search.toLowerCase())),
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
                  <th />
                  <th />
                </tr>
              </thead>
              <tbody>
                {filteredSections.map((section) => {
                  const confirming = confirmId === section.id;
                  return (
                    <tr key={section.id}>
                      <td className="t-table__bold">{section.code}</td>
                      <td>{section.student_count}</td>
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
