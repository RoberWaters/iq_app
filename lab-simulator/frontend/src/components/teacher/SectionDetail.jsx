import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import {
  createSectionPractice,
  createStudent,
  deleteSectionPractice,
  deleteStudent,
  downloadSectionImportTemplate,
  exportSectionResults,
  getCatalogPractices,
  getSectionPractices,
  getSectionStudents,
  getStudentDetail,
  importSectionStudents,
  updateSectionPractice,
  updateStudent,
  upsertGrade,
} from '../../api/client';
import '../../styles/teacher.css';

const PRACTICE_STATUS_CONFIG = {
  active: { label: 'Activa', className: 'badge--success' },
  blocked: { label: 'Bloqueada', className: 'badge--danger' },
  closed: { label: 'Cerrada', className: 'badge--warning' },
};
const STUDENT_STATUS_CONFIG = {
  pendiente: { label: 'Pendiente', className: 'badge--danger' },
  en_progreso: { label: 'En progreso', className: 'badge--warning' },
  completada: { label: 'Completada', className: 'badge--success' },
  calificada: { label: 'Calificada', className: 'badge--primary-soft' },
};
const PRACTICE_STATUSES = [
  { value: 'blocked', label: 'Bloqueada' },
  { value: 'active', label: 'Activa' },
  { value: 'closed', label: 'Cerrada' },
];
const FILTERS = ['Todos', 'Pendientes', 'En progreso', 'Completados'];

function StudentFormModal({ initial, onClose, onSave }) {
  const isEdit = Boolean(initial?.id);
  const [form, setForm] = useState(isEdit ? { name: initial.name, student_code: initial.student_code } : { name: '', student_code: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave({ name: form.name.trim(), student_code: Number(form.student_code) });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <motion.div className="modal-box" initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }} transition={{ duration: 0.15 }}>
        <h3 className="modal-box__title">{isEdit ? 'Editar estudiante' : 'Nuevo estudiante'}</h3>
        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="modal-form__field">
            <label className="modal-form__label">Nombre</label>
            <input className="modal-form__input" value={form.name} onChange={(event) => setField('name', event.target.value)} required autoFocus />
          </div>
          <div className="modal-form__field">
            <label className="modal-form__label">Codigo</label>
            <input className="modal-form__input" type="number" value={form.student_code} onChange={(event) => setField('student_code', event.target.value)} required />
          </div>
          {error && <p className="modal-form__error">{error}</p>}
          <div className="modal-form__footer">
            <button type="button" className="btn btn--outline-primary btn--sm" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn--primary btn--sm" disabled={saving}>{saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear estudiante'}</button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function PracticeModal({ initial, catalog, onClose, onSave }) {
  const isEdit = Boolean(initial);
  const [form, setForm] = useState(isEdit ? { practice_id: initial.practice_id, open_date: initial.open_date ?? '', close_date: initial.close_date ?? '', status: initial.status } : { practice_id: catalog[0]?.id ?? '', open_date: '', close_date: '', status: 'blocked' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave({ practice_id: Number(form.practice_id), open_date: form.open_date.trim() || null, close_date: form.close_date.trim() || null, status: form.status });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <motion.div className="modal-box" initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }} transition={{ duration: 0.15 }}>
        <h3 className="modal-box__title">{isEdit ? `Editar practica: ${initial.name}` : 'Asignar practica'}</h3>
        <form className="modal-form" onSubmit={handleSubmit}>
          {!isEdit && (
            <div className="modal-form__field">
              <label className="modal-form__label">Practica del catalogo</label>
              <select className="modal-form__select" value={form.practice_id} onChange={(event) => setField('practice_id', event.target.value)} required>
                {catalog.map((practice) => <option key={practice.id} value={practice.id}>{practice.name} ({practice.category})</option>)}
              </select>
            </div>
          )}
          <div className="modal-form__field"><label className="modal-form__label">Apertura</label><input className="modal-form__input" value={form.open_date} onChange={(event) => setField('open_date', event.target.value)} placeholder="Ej: 25/04 08:00" /></div>
          <div className="modal-form__field"><label className="modal-form__label">Cierre</label><input className="modal-form__input" value={form.close_date} onChange={(event) => setField('close_date', event.target.value)} placeholder="Ej: 25/04 23:59" /></div>
          <div className="modal-form__field">
            <label className="modal-form__label">Estado</label>
            <select className="modal-form__select" value={form.status} onChange={(event) => setField('status', event.target.value)}>
              {PRACTICE_STATUSES.map((statusOption) => <option key={statusOption.value} value={statusOption.value}>{statusOption.label}</option>)}
            </select>
          </div>
          {error && <p className="modal-form__error">{error}</p>}
          <div className="modal-form__footer">
            <button type="button" className="btn btn--outline-primary btn--sm" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn--primary btn--sm" disabled={saving}>{saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Asignar'}</button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function ImportModal({ sectionCode, onClose, onImported }) {
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    if (!file) return setError('Selecciona un archivo CSV.');
    setLoading(true);
    setError('');
    try {
      const data = await importSectionStudents(sectionCode, file);
      setResult(data);
      onImported();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function downloadCredentials() {
    if (!result?.students?.length) return;
    const rows = [['Nombre', 'Numero de cuenta', 'Usuario', 'Contrasena'], ...result.students.map((student) => [student.nombre, student.numero_cuenta, student.usuario, student.contrasena])];
    const csv = rows.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `credenciales_${sectionCode}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="modal-overlay" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <motion.div className="modal-box modal-box--wide" initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }} transition={{ duration: 0.15 }}>
        <h3 className="modal-box__title">Importar estudiantes - Seccion {sectionCode}</h3>
        {!result ? (
          <form className="modal-form" onSubmit={handleSubmit}>
            <p className="teacher-inline-copy">El CSV debe tener las columnas <strong>nombre, apellido, numero_cuenta</strong>. El email es opcional.</p>
            <div className="modal-form__footer modal-form__footer--left">
              <button type="button" className="btn btn--outline-primary btn--sm" onClick={() => downloadSectionImportTemplate(sectionCode).catch((err) => setError(err.message))}>Descargar plantilla</button>
            </div>
            <div className="modal-form__field">
              <label className="modal-form__label">Archivo CSV</label>
              <input ref={fileRef} type="file" accept=".csv" className="modal-form__input" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setError(''); }} />
            </div>
            {error && <p className="modal-form__error">{error}</p>}
            <div className="modal-form__footer">
              <button type="button" className="btn btn--outline-primary btn--sm" onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn btn--primary btn--sm" disabled={loading}>{loading ? 'Importando...' : 'Importar'}</button>
            </div>
          </form>
        ) : (
          <div className="modal-form">
            <div className="teacher-result-row">
              <span className="teacher-result teacher-result--success">{result.created_count} estudiante(s) creados</span>
              {result.error_count > 0 && <span className="teacher-result teacher-result--danger">{result.error_count} error(es)</span>}
            </div>
            {result.errors.length > 0 && <div className="teacher-errors-list">{result.errors.map((item, index) => <div key={`${item.fila}-${index}`}>Fila {item.fila}: {item.error}</div>)}</div>}
            {result.students.length > 0 && (
              <table className="t-table t-table--compact">
                <thead><tr><th>Nombre</th><th>Cuenta</th><th>Usuario</th><th>Contrasena</th></tr></thead>
                <tbody>{result.students.map((student, index) => <tr key={`${student.usuario}-${index}`}><td>{student.nombre}</td><td>{student.numero_cuenta}</td><td><code>{student.usuario}</code></td><td><code>{student.contrasena}</code></td></tr>)}</tbody>
              </table>
            )}
            <div className="modal-form__footer">
              <button type="button" className="btn btn--outline-primary btn--sm" onClick={onClose}>Cerrar</button>
              {result.students.length > 0 && <button type="button" className="btn btn--primary btn--sm" onClick={downloadCredentials}>Descargar credenciales</button>}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function StudentDetailModal({ detail, onClose, onSaveGrade }) {
  const [drafts, setDrafts] = useState({});
  const [savingId, setSavingId] = useState('');
  const [error, setError] = useState('');
  const getDraft = (progress) => drafts[progress.section_practice_id] !== undefined ? drafts[progress.section_practice_id] : progress.manual_score ?? '';

  async function saveGrade(progress) {
    setSavingId(progress.section_practice_id);
    setError('');
    try {
      await onSaveGrade(progress.section_practice_id, drafts[progress.section_practice_id] ?? progress.manual_score ?? '');
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingId('');
    }
  }

  return (
    <div className="modal-overlay" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <motion.div className="modal-box modal-box--xl" initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }} transition={{ duration: 0.15 }}>
        <div className="teacher-detail-header">
          <div><h3 className="modal-box__title">{detail.name}</h3><p className="teacher-inline-copy">Codigo {detail.student_code} · Seccion {detail.section_code}</p></div>
          <button className="section-close" onClick={onClose} aria-label="Cerrar">&times;</button>
        </div>
        {error && <p className="teacher-error-banner">{error}</p>}
        <div className="teacher-detail-grid">
          <div>
            <h4 className="teacher-subtitle">Progreso por practica</h4>
            <table className="t-table t-table--compact">
              <thead><tr><th>Practica</th><th>Estado</th><th>Auto</th><th>Manual</th><th>Final</th><th>Guardar</th></tr></thead>
              <tbody>
                {detail.practices.map((progress) => {
                  const config = STUDENT_STATUS_CONFIG[progress.student_status] ?? STUDENT_STATUS_CONFIG.pendiente;
                  return (
                    <tr key={progress.section_practice_id}>
                      <td className="t-table__bold">{progress.practice_name}</td>
                      <td><span className={`badge ${config.className}`}>{config.label}</span></td>
                      <td className="mono">{progress.auto_score ?? '-'}</td>
                      <td><input className="table-input" type="number" step="0.1" value={getDraft(progress)} onChange={(event) => setDrafts((current) => ({ ...current, [progress.section_practice_id]: event.target.value }))} placeholder="-" /></td>
                      <td className="mono">{progress.final_score ?? '-'}</td>
                      <td><button className="btn btn--primary btn--sm" onClick={() => saveGrade(progress)} disabled={savingId === progress.section_practice_id}>{savingId === progress.section_practice_id ? '...' : 'Guardar'}</button></td>
                    </tr>
                  );
                })}
                {detail.practices.length === 0 && <tr><td colSpan={6} className="teacher-empty-cell">No hay practicas asignadas.</td></tr>}
              </tbody>
            </table>
          </div>
          <div>
            <h4 className="teacher-subtitle">Historial de sesiones</h4>
            <div className="teacher-session-list">
              {detail.sessions.map((session) => (
                <div key={session.id} className="teacher-session-card">
                  <div className="teacher-session-card__top"><strong>{session.practice_name}</strong><span className={`badge ${session.status === 'completed' ? 'badge--success' : 'badge--warning'}`}>{session.status}</span></div>
                  <p className="teacher-inline-copy">Etapa actual: {session.current_stage}</p>
                  <p className="teacher-inline-copy">Inicio: {new Date(session.started_at).toLocaleString()}</p>
                  {session.completed_at && <p className="teacher-inline-copy">Fin: {new Date(session.completed_at).toLocaleString()}</p>}
                  {session.total_score != null && <p className="teacher-inline-copy">Nota automatica: {session.total_score}</p>}
                  {session.feedback && <p className="teacher-inline-copy">{session.feedback}</p>}
                </div>
              ))}
              {detail.sessions.length === 0 && <p className="teacher-empty-state teacher-empty-state--compact">No hay sesiones registradas.</p>}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function getStudentCompletionState(student) {
  if (!student.practices.length) return 'Pendientes';
  if (student.practices.some((item) => item.student_status === 'en_progreso')) return 'En progreso';
  if (student.practices.every((item) => ['completada', 'calificada'].includes(item.student_status))) return 'Completados';
  return 'Pendientes';
}

function formatStudentPracticeCell(progress) {
  if (!progress) return '-';
  const config = STUDENT_STATUS_CONFIG[progress.student_status] ?? STUDENT_STATUS_CONFIG.pendiente;
  const score = progress.final_score ?? progress.auto_score;
  return <div className="teacher-grade-cell"><span className={`badge ${config.className}`}>{config.label}</span><span className="mono">{score != null ? score.toFixed(1) : '-'}</span></div>;
}

export default function SectionDetail() {
  const { sectionId: sectionCode } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState('students');
  const [filter, setFilter] = useState('Todos');
  const [search, setSearch] = useState('');
  const [students, setStudents] = useState([]);
  const [practices, setPractices] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [studentModal, setStudentModal] = useState(null);
  const [practiceModal, setPracticeModal] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  async function fetchData() {
    setLoading(true);
    setError('');
    try {
      const [studentsData, practicesData, catalogData] = await Promise.all([getSectionStudents(sectionCode), getSectionPractices(sectionCode), catalog.length ? Promise.resolve(catalog) : getCatalogPractices()]);
      setStudents(studentsData);
      setPractices(practicesData);
      setCatalog(catalogData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, [sectionCode]);

  async function openStudentDetail(studentId) {
    setError('');
    try {
      setDetail(await getStudentDetail(sectionCode, studentId));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSaveStudent(payload) {
    if (studentModal?.id) await updateStudent(studentModal.id, payload);
    else await createStudent(sectionCode, payload);
    setStudentModal(null);
    await fetchData();
  }

  async function handleDeleteStudent(studentId) {
    await deleteStudent(studentId);
    setConfirmAction(null);
    await fetchData();
  }

  async function handleSavePractice(payload) {
    if (practiceModal?.id) await updateSectionPractice(practiceModal.id, payload);
    else await createSectionPractice(sectionCode, payload);
    setPracticeModal(null);
    await fetchData();
  }

  async function handleDeletePractice(practiceId) {
    await deleteSectionPractice(practiceId);
    setConfirmAction(null);
    await fetchData();
  }

  async function handleSaveGrade(sectionPracticeId, nextValue) {
    const score = nextValue === '' ? null : Number(nextValue);
    await upsertGrade({ student_id: detail.id, section_practice_id: sectionPracticeId, score });
    const nextDetail = await getStudentDetail(sectionCode, detail.id);
    setDetail(nextDetail);
    setStudents((current) => current.map((student) => student.id === detail.id ? { ...student, grades: Object.fromEntries(nextDetail.practices.map((item) => [item.section_practice_id, item.final_score])), practices: nextDetail.practices } : student));
  }

  const filteredStudents = useMemo(() => students.filter((student) => {
    const matchesSearch = student.name.toLowerCase().includes(search.toLowerCase()) || String(student.student_code).includes(search);
    if (!matchesSearch) return false;
    if (filter === 'Todos') return true;
    return getStudentCompletionState(student) === filter;
  }), [filter, search, students]);

  return (
    <motion.div className="teacher-page" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="teacher-card teacher-card--wide">
        <div className="teacher-card__header">
          <div><h2 className="teacher-card__title">Seccion {sectionCode}</h2><p className="teacher-card__caption">Gestion de estudiantes, practicas, notas y progreso real.</p></div>
          <button className="section-close" onClick={() => navigate('/teacher')} aria-label="Cerrar">&times;</button>
        </div>
        <div className="tabs">
          <button className={`tabs__btn ${tab === 'students' ? 'tabs__btn--active' : ''}`} onClick={() => setTab('students')}>Estudiantes y notas</button>
          <button className={`tabs__btn ${tab === 'practices' ? 'tabs__btn--active' : ''}`} onClick={() => setTab('practices')}>Practicas</button>
        </div>
        {error && <p className="teacher-error-banner teacher-error-banner--body">{error}</p>}
        {loading ? <p className="teacher-empty-state">Cargando datos de la seccion...</p> : (
          <AnimatePresence mode="wait">
            {tab === 'students' ? (
              <motion.div key="students" className="tab-content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                <div className="toolbar">
                  <div className="toolbar__left">
                    <input type="text" placeholder="Buscar estudiante..." value={search} onChange={(event) => setSearch(event.target.value)} className="search-box__input search-box__input--compact" />
                    {FILTERS.map((option) => <button key={option} className={`filter-chip ${filter === option ? 'filter-chip--active' : ''}`} onClick={() => setFilter(option)}>{option}</button>)}
                  </div>
                  <div className="toolbar__right">
                    <button className="btn btn--outline-primary btn--sm" onClick={() => setImportOpen(true)}>Importar CSV</button>
                    <button className="btn btn--outline-primary btn--sm" onClick={() => exportSectionResults(sectionCode).catch((err) => setError(err.message))}>Exportar</button>
                    <button className="btn btn--primary btn--sm" onClick={() => setStudentModal('create')}>+ Estudiante</button>
                  </div>
                </div>
                <table className="t-table">
                  <thead><tr><th>Estudiante</th><th>Codigo</th>{practices.map((practice) => <th key={practice.id}>{practice.name}</th>)}<th>Acciones</th></tr></thead>
                  <tbody>
                    {filteredStudents.map((student) => (
                      <tr key={student.id}>
                        <td className="t-table__bold">{student.name}</td>
                        <td className="mono">{student.student_code}</td>
                        {practices.map((practice) => <td key={practice.id}>{formatStudentPracticeCell(student.practices.find((item) => item.section_practice_id === practice.id))}</td>)}
                        <td><div className="t-table__actions"><button className="btn btn--primary btn--sm" onClick={() => openStudentDetail(student.id)}>Ver detalle</button><button className="btn btn--icon" onClick={() => setStudentModal(student)}>Editar</button><button className="btn btn--icon btn--icon-danger" onClick={() => setConfirmAction({ type: 'student', id: student.id, label: student.name })}>Borrar</button></div></td>
                      </tr>
                    ))}
                    {filteredStudents.length === 0 && <tr><td colSpan={3 + practices.length} className="teacher-empty-cell">No se encontraron estudiantes.</td></tr>}
                  </tbody>
                </table>
              </motion.div>
            ) : (
              <motion.div key="practices" className="tab-content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                <div className="toolbar"><div className="toolbar__left" /><button className="btn btn--primary btn--sm" onClick={() => setPracticeModal('create')}>+ Asignar practica</button></div>
                <table className="t-table">
                  <thead><tr><th>Practica</th><th>Categoria</th><th>Apertura</th><th>Cierre</th><th>Estado</th><th>Acciones</th></tr></thead>
                  <tbody>
                    {practices.map((practice) => {
                      const config = PRACTICE_STATUS_CONFIG[practice.status] ?? PRACTICE_STATUS_CONFIG.blocked;
                      return <tr key={practice.id}><td className="t-table__bold">{practice.name}</td><td>{practice.category}</td><td className="mono">{practice.open_date ?? '-'}</td><td className="mono">{practice.close_date ?? '-'}</td><td><span className={`badge ${config.className}`}>{config.label}</span></td><td><div className="t-table__actions"><button className="btn btn--icon" onClick={() => setPracticeModal(practice)}>Editar</button><button className="btn btn--icon btn--icon-danger" onClick={() => setConfirmAction({ type: 'practice', id: practice.id, label: practice.name })}>Borrar</button></div></td></tr>;
                    })}
                    {practices.length === 0 && <tr><td colSpan={6} className="teacher-empty-cell">No hay practicas asignadas.</td></tr>}
                  </tbody>
                </table>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      <AnimatePresence>
        {studentModal && <StudentFormModal initial={studentModal === 'create' ? null : studentModal} onClose={() => setStudentModal(null)} onSave={handleSaveStudent} />}
        {practiceModal && <PracticeModal initial={practiceModal === 'create' ? null : practiceModal} catalog={catalog} onClose={() => setPracticeModal(null)} onSave={handleSavePractice} />}
        {importOpen && <ImportModal sectionCode={sectionCode} onClose={() => setImportOpen(false)} onImported={fetchData} />}
        {detail && <StudentDetailModal detail={detail} onClose={() => setDetail(null)} onSaveGrade={handleSaveGrade} />}
        {confirmAction && (
          <div className="modal-overlay" onClick={(event) => event.target === event.currentTarget && setConfirmAction(null)}>
            <motion.div className="modal-box" initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }} transition={{ duration: 0.15 }}>
              <h3 className="modal-box__title">Confirmar eliminacion</h3>
              <p className="teacher-inline-copy">Se eliminara {confirmAction.label}. Esta accion no se puede deshacer.</p>
              <div className="modal-form__footer">
                <button type="button" className="btn btn--outline-primary btn--sm" onClick={() => setConfirmAction(null)}>Cancelar</button>
                <button type="button" className="btn btn--danger btn--sm" onClick={() => (confirmAction.type === 'student' ? handleDeleteStudent(confirmAction.id).catch((err) => setError(err.message)) : handleDeletePractice(confirmAction.id).catch((err) => setError(err.message)))}>Eliminar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
