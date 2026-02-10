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

export const updateMeasurement = (sessionId, value, unit) =>
  request(`/sessions/${sessionId}/measurement`, {
    method: 'PUT',
    body: JSON.stringify({ value, unit }),
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
