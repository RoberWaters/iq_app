export const STAGES = [
  { number: 1, name: 'Selección', description: 'Selección de práctica' },
  { number: 2, name: 'Preparación', description: 'Preparación de materiales' },
  { number: 3, name: 'Medición', description: 'Medición de muestra' },
  { number: 4, name: 'Montaje', description: 'Montaje del experimento' },
  { number: 5, name: 'Ejecución', description: 'Titulación' },
  { number: 6, name: 'Registro', description: 'Registro del resultado' },
  { number: 7, name: 'Cálculo', description: 'Cálculo y análisis' },
  { number: 8, name: 'Evaluación', description: 'Evaluación y cierre' },
];

export const COLORS = {
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primaryLight: '#3B82F6',
  success: '#16A34A',
  warning: '#F59E0B',
  error: '#DC2626',
  bg: '#F8FAFC',
  surface: '#FFFFFF',
  text: '#1E293B',
  textSecondary: '#64748B',
  border: '#E2E8F0',
};

export const CATEGORY_COLORS = {
  'Complejometría': '#7C3AED',
  'Ácido-Base': '#2563EB',
  'Precipitación': '#059669',
  'Óxido-Reducción': '#DC2626',
};

export const DIFFICULTY_LABELS = {
  baja: { label: 'Baja', color: '#16A34A' },
  media: { label: 'Media', color: '#F59E0B' },
  alta: { label: 'Alta', color: '#DC2626' },
};
