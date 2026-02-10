/**
 * Calculate expected titrant volume based on practice config
 * @param {object} titration - Practice titration config
 * @param {number} measuredValue - Measured sample value
 * @param {string} [sampleId] - Optional sample ID for variable volumes
 * @returns {number} Expected volume in mL
 */
export function calculateExpectedVolume(titration, measuredValue, sampleId = null) {
  const prop = titration.proportionality;
  let baseVolume = titration.expectedVolume;

  if (sampleId && titration.volumesBySample) {
    baseVolume = titration.volumesBySample[sampleId] || baseVolume;
  }

  switch (prop) {
    case 'fixed':
      return baseVolume;
    case 'direct':
      return baseVolume * (measuredValue / titration.referenceValue);
    case 'inverse':
      return baseVolume * (titration.referenceValue / measuredValue);
    default:
      return baseVolume;
  }
}

/**
 * Calculate practice 5 result: Dureza ppm CaCO3
 */
export function calculatePractice5(vEdta, vMuestra) {
  const mEdta = 0.01;
  const pmCaCO3 = 100.09;
  return (vEdta * mEdta * pmCaCO3 * 1000) / vMuestra;
}

/**
 * Calculate percent error between student result and correct result
 */
export function calculatePercentError(studentResult, correctResult) {
  if (correctResult === 0) return 0;
  return Math.abs(studentResult - correctResult) / correctResult * 100;
}
