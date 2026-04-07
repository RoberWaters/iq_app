import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [section, setSection] = useState('A');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setError(null);
    setResult(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Por favor selecciona un archivo CSV');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('default_section', section);

      const response = await fetch('/api/admin/import-students', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError('Error al importar estudiantes');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('/api/admin/students-template', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'students_template.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError('Error al descargar la plantilla');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', padding: '2rem' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1>Panel de Administración</h1>
          <button onClick={() => navigate('/teacher')} style={{ padding: '0.5rem 1rem' }}>
            ← Volver al Dashboard
          </button>
        </div>

        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', marginBottom: '1rem' }}>
          <h2>Importar Estudiantes desde CSV</h2>
          
          <button onClick={handleDownloadTemplate} style={{ marginBottom: '1rem', color: 'blue' }}>
            📥 Descargar plantilla CSV
          </button>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label>Sección por defecto:</label>
              <select value={section} onChange={(e) => setSection(e.target.value)}>
                <option value="A">Sección A</option>
                <option value="B">Sección B</option>
                <option value="C">Sección C</option>
              </select>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label>Archivo CSV:</label>
              <input type="file" accept=".csv" onChange={handleFileChange} />
            </div>

            <button 
              type="submit" 
              disabled={loading || !file}
              style={{ padding: '0.5rem 1rem', background: loading || !file ? '#ccc' : 'green', color: 'white' }}
            >
              {loading ? 'Importando...' : '📤 Importar Estudiantes'}
            </button>
          </form>

          {error && (
            <div style={{ marginTop: '1rem', padding: '1rem', background: '#fee2e2', color: '#dc2626' }}>
              {error}
            </div>
          )}

          {result && (
            <div style={{ marginTop: '1rem', padding: '1rem', background: '#f3f4f6' }}>
              <p style={{ color: 'green' }}>✅ {result.created_count} estudiantes creados</p>
              
              {result.errors.length > 0 && (
                <div>
                  <p style={{ color: 'red' }}>⚠️ Errores: {result.errors.length}</p>
                  <ul>
                    {result.errors.map((err, idx) => (
                      <li key={idx}>Fila {err.row}: {err.error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.students.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <p>Estudiantes creados:</p>
                  <table style={{ width: '100%', fontSize: '0.875rem' }}>
                    <thead>
                      <tr>
                        <th>Usuario</th>
                        <th>Contraseña</th>
                        <th>Cuenta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.students.map((s, idx) => (
                        <tr key={idx}>
                          <td>{s.username}</td>
                          <td>{s.temp_password}</td>
                          <td>{s.account_number}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;