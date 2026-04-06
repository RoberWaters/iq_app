const BASE_URL = '/api';

function getAuthHeaders(extraHeaders = {}) {
  const token = localStorage.getItem('lab_simulator_token');
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extraHeaders,
  };
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Error de red' }));
    throw new Error(error.detail || `Error ${response.status}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

async function downloadFile(path, filenameFallback) {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Error de red' }));
    throw new Error(error.detail || `Error ${response.status}`);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const disposition = response.headers.get('content-disposition') || '';
  const match = disposition.match(/filename="?([^"]+)"?/i);
  const filename = match?.[1] || filenameFallback;
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export const getPractices = () => request('/practices');
export const getPractice = (id) => request(`/practices/${id}`);
export const getPracticeMaterials = (id) => request(`/practices/${id}/materials`);

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

export const getReport = (sessionId) => request(`/sessions/${sessionId}/report`);

export const getSections = () => request('/teacher/sections');
export const createSection = (data) =>
  request('/teacher/sections', { method: 'POST', body: JSON.stringify(data) });
export const getSection = (id) => request(`/teacher/sections/${id}`);
export const updateSection = (id, data) =>
  request(`/teacher/sections/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteSection = (id) =>
  request(`/teacher/sections/${id}`, { method: 'DELETE' });

export const getSectionStudents = (code) => request(`/teacher/sections/${code}/students`);
export const getStudentDetail = (code, studentId) =>
  request(`/teacher/sections/${code}/students/${studentId}`);
export const createStudent = (code, data) =>
  request(`/teacher/sections/${code}/students`, { method: 'POST', body: JSON.stringify(data) });
export const updateStudent = (id, data) =>
  request(`/teacher/students/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteStudent = (id) =>
  request(`/teacher/students/${id}`, { method: 'DELETE' });

export const getCatalogPractices = () => request('/teacher/catalog/practices');
export const getSectionPractices = (code) => request(`/teacher/sections/${code}/practices`);
export const createSectionPractice = (code, data) =>
  request(`/teacher/sections/${code}/practices`, { method: 'POST', body: JSON.stringify(data) });
export const updateSectionPractice = (id, data) =>
  request(`/teacher/practices/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteSectionPractice = (id) =>
  request(`/teacher/practices/${id}`, { method: 'DELETE' });

export const upsertGrade = (data) =>
  request('/teacher/grades', { method: 'PUT', body: JSON.stringify(data) });

export const importSectionStudents = async (code, file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch(`${BASE_URL}/teacher/sections/${code}/import-students`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Error de red' }));
    throw new Error(error.detail || `Error ${response.status}`);
  }
  return response.json();
};

export const downloadSectionImportTemplate = (code) =>
  downloadFile(`/teacher/sections/${code}/import-template`, `plantilla_${code}.csv`);

export const exportSectionResults = (code) =>
  downloadFile(`/teacher/sections/${code}/export`, `section_${code}_results.csv`);
