import { create } from 'zustand';
import {
  getColorAtProgress,
  stretchTransitionsNearEndpoint,
  lightenTransitions,
  darkenTransitions,
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

  // Initialize from practice config, with optional modifiers from assembly choices
  initTitration: (titrationConfig, expectedVolume, modifiers = {}) => {
    let transitions = [...(titrationConfig.colorTransitions || [])];

    // Apply modifier effects to color transitions
    if (modifiers.bufferQuality === 'poor') {
      transitions = stretchTransitionsNearEndpoint(transitions);
    }
    if (modifiers.indicatorIntensity === 'faint') {
      transitions = lightenTransitions(transitions);
    } else if (modifiers.indicatorIntensity === 'dark') {
      transitions = darkenTransitions(transitions);
    }

    set({
      volumeAdded: 0,
      expectedVolume: expectedVolume || titrationConfig.expectedVolume,
      maxBuretteVolume: titrationConfig.maxBuretteVolume || 50,
      dropVolume: titrationConfig.dropVolume || 0.05,
      streamVolume: titrationConfig.streamVolume || 0.50,
      colorTransitions: transitions,
      currentColor: transitions.length > 0 ? transitions[0].color : '#F0F0F0',
      isDropping: false,
      endpointReached: false,
      endpointTolerance: titrationConfig.endpointTolerance || 0.3,
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

  // Reset
  resetTitration: () => set({
    volumeAdded: 0,
    currentColor: '#CD5C5C',
    isDropping: false,
    endpointReached: false,
  }),
}));

export default useTitrationStore;
