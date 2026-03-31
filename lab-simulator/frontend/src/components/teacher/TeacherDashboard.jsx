import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { authAPI } from '../../api/auth';
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
  const fileInputRef = useRef(null);
  const [search, setSearch] = useState('');

  // Estados para el modal de importación
  const [showImportModal, setShowImportModal] = useState(false);
  const [file, setFile] = useState(null);
  const [section, setSection] = useState('A');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const filtered = MOCK_SECTIONS.filter((s) =>
    s.id.toLowerCase().includes(search.toLowerCase()) ||
    s.nextPractice.toLowerCase().includes(search.toLowerCase())
  );

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setResult(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Por favor selecciona un archivo CSV');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('default_section', section);

      const response = await fetch('/api/teacher/import-students', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authAPI.getToken()}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al importar estudiantes');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err.message || 'Error al importar estudiantes');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('/api/teacher/students-template', {
        headers: {
          'Authorization': `Bearer ${authAPI.getToken()}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Error al descargar la plantilla');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'students_template.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || 'Error al descargar la plantilla');
    }
  };

  const closeModal = () => {
    setShowImportModal(false);
    setFile(null);
    setSection('A');
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Calcular estadísticas de envío de correos
  const getEmailStats = () => {
    if (!result || !result.email_results) return { success: 0, failed: 0, total: 0 };
    
    const success = result.email_results.filter(r => r.success).length;
    const failed = result.email_results.filter(r => !r.success).length;
    return { success, failed, total: result.email_results.length };
  };

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
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              className="btn btn--primary btn--sm"
              onClick={() => setShowImportModal(true)}
            >
              📥 Importar Estudiantes
            </button>
            <button
              className="btn btn--outline-primary btn--sm"
              onClick={() => navigate('/')}
            >
              Cerrar Sesión
            </button>
          </div>
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

      {/* Modal de Importación */}
      <AnimatePresence>
        {showImportModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModal}
          >
            <motion.div
              className="modal-content"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>📥 Importar Estudiantes desde CSV</h2>
                <button className="modal-close" onClick={closeModal}>×</button>
              </div>

              <div className="modal-body">
                <button 
                  onClick={handleDownloadTemplate} 
                  className="btn btn--outline-primary btn--sm"
                  style={{ marginBottom: '1rem' }}
                >
                  📥 Descargar plantilla CSV
                </button>

                {!result ? (
                  <form onSubmit={handleSubmit}>
                    <div className="form-group">
                      <label>Sección por defecto:</label>
                      <select 
                        value={section} 
                        onChange={(e) => setSection(e.target.value)}
                        className="form-select"
                      >
                        <option value="A">Sección A</option>
                        <option value="B">Sección B</option>
                        <option value="C">Sección C</option>
                        <option value="D">Sección D</option>
                        <option value="E">Sección E</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Archivo CSV:</label>
                      <input 
                        ref={fileInputRef}
                        type="file" 
                        accept=".csv" 
                        onChange={handleFileChange}
                        className="form-file-input"
                      />
                      {file && (
                        <p className="file-selected">✅ Archivo seleccionado: {file.name}</p>
                      )}
                    </div>

                    <div className="info-box" style={{ 
                      backgroundColor: '#e3f2fd', 
                      padding: '12px', 
                      borderRadius: '6px',
                      marginBottom: '1rem',
                      fontSize: '14px'
                    }}>
                      <strong>💡 Nota:</strong> El CSV debe incluir la columna <strong>email</strong> para que el sistema pueda enviar las credenciales automáticamente a cada estudiante.
                    </div>

                    <button 
                      type="submit" 
                      disabled={loading || !file}
                      className={`btn btn--primary ${loading || !file ? 'btn--disabled' : ''}`}
                    >
                      {loading ? 'Importando...' : '📤 Importar Estudiantes'}
                    </button>
                  </form>
                ) : (
                  <div className="import-results">
                    <div className="result-summary">
                      <p className="success-message">✅ {result.created_count} estudiantes creados exitosamente</p>
                      
                      {/* Resultados de envío de correos */}
                      {result.email_results && result.email_results.length > 0 && (
                        <div className="email-results-section" style={{ marginTop: '1rem' }}>
                          <p><strong>📧 Envío de Credenciales:</strong></p>
                          
                          {(() => {
                            const stats = getEmailStats();
                            return (
                              <div style={{ 
                                display: 'flex', 
                                gap: '10px', 
                                marginTop: '8px',
                                marginBottom: '12px'
                              }}>
                                <span style={{ 
                                  backgroundColor: '#d4edda', 
                                  color: '#155724',
                                  padding: '4px 12px',
                                  borderRadius: '4px',
                                  fontSize: '14px'
                                }}>
                                  ✅ Enviados: {stats.success}
                                </span>
                                {stats.failed > 0 && (
                                  <span style={{ 
                                    backgroundColor: '#f8d7da', 
                                    color: '#721c24',
                                    padding: '4px 12px',
                                    borderRadius: '4px',
                                    fontSize: '14px'
                                  }}>
                                    ❌ Fallidos: {stats.failed}
                                  </span>
                                )}
                              </div>
                            );
                          })()}

                          {/* Detalles de correos fallidos */}
                          {result.email_results.some(r => !r.success) && (
                            <div className="failed-emails" style={{ 
                              backgroundColor: '#fff3cd',
                              border: '1px solid #ffc107',
                              borderRadius: '4px',
                              padding: '10px',
                              marginTop: '8px',
                              fontSize: '13px'
                            }}>
                              <strong>⚠️ Correos no enviados:</strong>
                              <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                                {result.email_results
                                  .filter(r => !r.success)
                                  .map((r, idx) => (
                                    <li key={idx}>
                                      {r.account_number}: {r.message}
                                    </li>
                                  ))}
                              </ul>
                            </div>
                          )}

                          {/* Mensaje de éxito total */}
                          {result.email_results.every(r => r.success) && (
                            <div style={{ 
                              backgroundColor: '#d4edda',
                              border: '1px solid #28a745',
                              borderRadius: '4px',
                              padding: '10px',
                              marginTop: '8px',
                              fontSize: '14px',
                              color: '#155724'
                            }}>
                              ✅ Todas las credenciales fueron enviadas exitosamente a los correos institucionales.
                            </div>
                          )}
                        </div>
                      )}
                      
                      {result.errors.length > 0 && (
                        <div className="errors-section">
                          <p className="error-message">⚠️ Errores: {result.errors.length}</p>
                          <ul className="errors-list">
                            {result.errors.map((err, idx) => (
                              <li key={idx}>Fila {err.row}: {err.error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {result.students.length > 0 && (
                      <div className="students-table-section">
                        <p><strong>Estudiantes creados:</strong></p>
                        <div className="students-table-wrapper">
                          <table className="students-table">
                            <thead>
                              <tr>
                                <th>Número de Cuenta</th>
                                <th>Usuario</th>
                                <th>Contraseña</th>
                                <th>Estado Correo</th>
                              </tr>
                            </thead>
                            <tbody>
                              {result.students.map((s, idx) => {
                                const emailResult = result.email_results?.find(
                                  r => r.account_number === s.account_number
                                );
                                return (
                                  <tr key={idx}>
                                    <td>{s.account_number}</td>
                                    <td>{s.username}</td>
                                    <td className="password-cell">{s.temp_password}</td>
                                    <td>
                                      {emailResult ? (
                                        emailResult.success ? (
                                          <span style={{ color: '#28a745' }}>✅ Enviado</span>
                                        ) : (
                                          <span style={{ color: '#dc3545' }}>❌ {emailResult.message}</span>
                                        )
                                      ) : (
                                        <span style={{ color: '#6c757d' }}>-</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    <button 
                      onClick={() => { setResult(null); setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                      className="btn btn--outline-primary"
                      style={{ marginTop: '1rem' }}
                    >
                      Importar más estudiantes
                    </button>
                  </div>
                )}

                {error && (
                  <div className="error-alert">
                    ⚠️ {error}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
