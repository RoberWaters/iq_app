import { create } from 'zustand';
import {
  getColorAtProgress,
  interpolateColorHSL,
  stretchTransitionsNearEndpoint,
  lightenTransitions,
  darkenTransitions,
  scaleTransitionsByDrops,
} from '../utils/colorInterpolation';

const useTitrationStore = create((set, get) => ({
  // Titration state
  volumeAdded: 0,
  expectedVolume: 0,
  maxBuretteVolume: 50,
  dropVolume: 0.05,
  streamVolume: 0.50,
  colorTransitions: [],
  currentColor: '#CD5C5C',
  isDropping: false,
  endpointReached: false,
  endpointTolerance: 0.3,

  // Magnetic stirrer state
  stirrerOn: false,
  stirrerSpeed: 3,
  stirBarInFlask: false,

  // Initialize from practice config, with optional modifiers from assembly choices
  initTitration: (titrationConfig, expectedVolume, modifiers = {}) => {
    let transitions = [...(titrationConfig.colorTransitions || [])];

    // Apply modifier effects to color transitions
    if (modifiers.bufferQuality === 'poor') {
      transitions = stretchTransitionsNearEndpoint(transitions);
    }
    if (modifiers.indicatorDrops != null) {
      transitions = scaleTransitionsByDrops(transitions, modifiers.indicatorDrops, 10);
    } else if (modifiers.indicatorIntensity === 'faint') {
      transitions = lightenTransitions(transitions);
    } else if (modifiers.indicatorIntensity === 'dark') {
      transitions = darkenTransitions(transitions);
    }

    // Compute starting color: if indicator drops are known, use the same
    // formula as useAssembly to match the color from S4 assembly
    let startColor = transitions.length > 0 ? transitions[0].color : '#F0F0F0';
    if (modifiers.indicatorDrops != null && modifiers.indicatorDrops > 0) {
      const t = Math.min(1, modifiers.indicatorDrops / 10);
      const assemblyColor = interpolateColorHSL('#D0E0EE', '#D07070', t);
      startColor = assemblyColor;
      // Also update the first transition entry to match
      if (transitions.length > 0) {
        transitions[0] = { ...transitions[0], color: assemblyColor };
      }
    }

    set({
      volumeAdded: 0,
      expectedVolume: expectedVolume || titrationConfig.expectedVolume,
      maxBuretteVolume: titrationConfig.maxBuretteVolume || 50,
      dropVolume: titrationConfig.dropVolume || 0.05,
      streamVolume: titrationConfig.streamVolume || 0.50,
      colorTransitions: transitions,
      currentColor: startColor,
      isDropping: false,
      endpointReached: false,
      endpointTolerance: titrationConfig.endpointTolerance || 0.3,
      stirrerOn: false,
      stirrerSpeed: 3,
      stirBarInFlask: false,
    });
  },

  // Add volume (drop or stream)
  addVolume: (amount) => {
    const state = get();
    const newVolume = Math.min(
      state.volumeAdded + amount,
      state.maxBuretteVolume
    );
    const progress = state.expectedVolume > 0
      ? newVolume / state.expectedVolume
      : 0;
    const newColor = getColorAtProgress(state.colorTransitions, progress);

    set({
      volumeAdded: Math.round(newVolume * 100) / 100,
      currentColor: newColor,
    });
  },

  addDrop: () => {
    const state = get();
    state.addVolume(state.dropVolume);
  },

  addStream: () => {
    const state = get();
    state.addVolume(state.streamVolume);
  },

  setIsDropping: (dropping) => set({ isDropping: dropping }),

  // Get current progress
  getProgress: () => {
    const state = get();
    return state.expectedVolume > 0
      ? state.volumeAdded / state.expectedVolume
      : 0;
  },

  // Check if near endpoint
  isNearEndpoint: () => {
    const state = get();
    if (state.expectedVolume === 0) return false;
    const diff = Math.abs(state.volumeAdded - state.expectedVolume);
    return diff <= state.endpointTolerance;
  },

  // Check if past endpoint by more than 10%
  isPastEndpoint: () => {
    const state = get();
    if (state.expectedVolume === 0) return false;
    return state.volumeAdded > state.expectedVolume * 1.10;
  },

  // Magnetic stirrer actions
  toggleStirrer: () => set((state) => {
    if (!state.stirBarInFlask && !state.stirrerOn) return {};
    return { stirrerOn: !state.stirrerOn };
  }),
  setStirrerSpeed: (speed) => set({ stirrerSpeed: Math.max(1, Math.min(5, speed)) }),
  setStirBarInFlask: (inFlask) => set((state) => ({
    stirBarInFlask: inFlask,
    stirrerOn: inFlask ? state.stirrerOn : false,
  })),

  // Reset
  resetTitration: () => set({
    volumeAdded: 0,
    currentColor: '#D07070',
    isDropping: false,
    endpointReached: false,
    stirrerOn: false,
    stirrerSpeed: 3,
    stirBarInFlask: false,
  }),
}));

export default useTitrationStore;
