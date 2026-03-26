const BASE_URL = '/api';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Error de red' }));
    throw new Error(error.detail || `Error ${response.status}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

// Practices
export const getPractices = () => request('/practices');
export const getPractice = (id) => request(`/practices/${id}`);
export const getPracticeMaterials = (id) => request(`/practices/${id}/materials`);

// Sessions
export const createSession = (data) =>
  request('/sessions', { method: 'POST', body: JSON.stringify(data) });

export const getSession = (id) => request(`/sessions/${id}`);

export const updateStage = (sessionId, stage, data = null) =>
  request(`/sessions/${sessionId}/stage`, {
    method: 'PUT',
    body: JSON.stringify({ stage, data }),
  });

export const updateMeasurement = (sessionId, value, unit, sampleId = null) =>
  request(`/sessions/${sessionId}/measurement`, {
    method: 'PUT',
    body: JSON.stringify({ value, unit, ...(sampleId ? { sample_id: sampleId } : {}) }),
  });

export const updateMaterials = (sessionId, instruments, reagents) =>
  request(`/sessions/${sessionId}/materials`, {
    method: 'PUT',
    body: JSON.stringify({ instruments, reagents }),
  });

export const updateTitration = (sessionId, recordedVolume) =>
  request(`/sessions/${sessionId}/titration`, {
    method: 'PUT',
    body: JSON.stringify({ recorded_volume: recordedVolume }),
  });

// Calculations
export const validateCalculation = (sessionId, studentResult, formulaUsed = null) =>
  request('/calculations/validate', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId, student_result: studentResult, formula_used: formulaUsed }),
  });

export const getExpectedVolume = (practiceId, measuredValue, sampleId = null) =>
  request('/calculations/expected-volume', {
    method: 'POST',
    body: JSON.stringify({ practice_id: practiceId, measured_value: measuredValue, sample_id: sampleId }),
  });

// Reports
export const getReport = (sessionId) => request(`/sessions/${sessionId}/report`);

// Teacher – Sections
export const getSections = () => request('/teacher/sections');

export const createSection = (data) =>
  request('/teacher/sections', { method: 'POST', body: JSON.stringify(data) });

export const getSection = (id) => request(`/teacher/sections/${id}`);

export const updateSection = (id, data) =>
  request(`/teacher/sections/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const deleteSection = (id) =>
  request(`/teacher/sections/${id}`, { method: 'DELETE' });

// Teacher – Students
export const getSectionStudents = (code) => request(`/teacher/sections/${code}/students`);

export const createStudent = (code, data) =>
  request(`/teacher/sections/${code}/students`, { method: 'POST', body: JSON.stringify(data) });

export const updateStudent = (id, data) =>
  request(`/teacher/students/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const deleteStudent = (id) =>
  request(`/teacher/students/${id}`, { method: 'DELETE' });

// Teacher – Catalog (8 practices available for assignment)
export const getCatalogPractices = () => request('/teacher/catalog/practices');

// Teacher – Section Practices
export const getSectionPractices = (code) => request(`/teacher/sections/${code}/practices`);

export const createSectionPractice = (code, data) =>
  request(`/teacher/sections/${code}/practices`, { method: 'POST', body: JSON.stringify(data) });

export const updateSectionPractice = (id, data) =>
  request(`/teacher/practices/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const deleteSectionPractice = (id) =>
  request(`/teacher/practices/${id}`, { method: 'DELETE' });

// Teacher – Grades
export const upsertGrade = (data) =>
  request('/teacher/grades', { method: 'PUT', body: JSON.stringify(data) });
