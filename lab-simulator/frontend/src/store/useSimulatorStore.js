import { create } from 'zustand';

const useSimulatorStore = create((set) => ({
  // Practice state
  practiceId: null,
  practiceConfig: null,
  sessionId: null,
  currentStage: 1,

  // Material selections
  selectedInstruments: [],
  selectedReagents: [],
  materialsCorrect: null,

  // Measurement
  measuredValue: null,
  measuredUnit: null,

  // Assembly
  completedSteps: [],
  assemblyCorrect: false,
  bufferVolume: null,
  indicatorDrops: null,

  // Results
  recordedVolume: null,
  studentCalculation: null,
  correctCalculation: null,
  percentError: null,
  totalScore: null,
  report: null,

  // Actions
  setPractice: (id, config) => set({
    practiceId: id,
    practiceConfig: config,
    currentStage: 1,
    selectedInstruments: [],
    selectedReagents: [],
    materialsCorrect: null,
    measuredValue: null,
    measuredUnit: null,
    completedSteps: [],
    assemblyCorrect: false,
    bufferVolume: null,
    indicatorDrops: null,
    recordedVolume: null,
    studentCalculation: null,
    correctCalculation: null,
    percentError: null,
    totalScore: null,
    report: null,
  }),

  setSessionId: (id) => set({ sessionId: id }),
  setCurrentStage: (stage) => set({ currentStage: stage }),

  // Materials
  toggleInstrument: (id) => set((state) => {
    const selected = state.selectedInstruments.includes(id)
      ? state.selectedInstruments.filter((i) => i !== id)
      : [...state.selectedInstruments, id];
    return { selectedInstruments: selected };
  }),

  toggleReagent: (id) => set((state) => {
    const selected = state.selectedReagents.includes(id)
      ? state.selectedReagents.filter((r) => r !== id)
      : [...state.selectedReagents, id];
    return { selectedReagents: selected };
  }),

  setMaterialsCorrect: (correct) => set({ materialsCorrect: correct }),

  // Measurement
  setMeasurement: (value, unit) => set({ measuredValue: value, measuredUnit: unit }),

  // Assembly
  completeStep: (stepId) => set((state) => ({
    completedSteps: [...state.completedSteps, stepId],
  })),
  setAssemblyCorrect: (correct) => set({ assemblyCorrect: correct }),
  setBufferVolume: (vol) => set({ bufferVolume: vol }),
  setIndicatorDrops: (drops) => set({ indicatorDrops: drops }),

  // Results
  setRecordedVolume: (vol) => set({ recordedVolume: vol }),
  setCalculationResults: (student, correct, error) => set({
    studentCalculation: student,
    correctCalculation: correct,
    percentError: error,
  }),
  setReport: (report) => set({ report, totalScore: report?.total_score }),

  // Reset
  reset: () => set({
    practiceId: null,
    practiceConfig: null,
    sessionId: null,
    currentStage: 1,
    selectedInstruments: [],
    selectedReagents: [],
    materialsCorrect: null,
    measuredValue: null,
    measuredUnit: null,
    completedSteps: [],
    assemblyCorrect: false,
    bufferVolume: null,
    indicatorDrops: null,
    recordedVolume: null,
    studentCalculation: null,
    correctCalculation: null,
    percentError: null,
    totalScore: null,
    report: null,
  }),
}));

export default useSimulatorStore;
