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
 * Calculate practice 2 result: IS in mg KOH/g fat (Saponification Index)
 * Formula: IS = [(V_KOH × M_KOH) - (V_HCl × M_HCl)] × PM_KOH × 1000 / m_grasa
 * @param {number} vHCl - HCl volume in mL (from burette)
 * @param {number} mGrasa - Fat mass in g
 */
export function calculatePractice2(vHCl, mGrasa) {
  const V_KOH = 25.0;   // mL
  const M_KOH = 0.50;   // mol/L
  const M_HCl = 0.50;   // mol/L
  const PM_KOH = 56.11; // g/mol
  return ((V_KOH / 1000 * M_KOH) - (vHCl / 1000 * M_HCl)) * PM_KOH * 1000 / mGrasa;
}

/**
 * Calculate practice 3 result: mg Cl⁻/mL (Argentometry — Mohr direct titration)
 * Formula: (V_AgNO3 × M_AgNO3 × PM_Cl) / V_muestra
 */
export function calculatePractice3(vAgNO3, vMuestra) {
  const M_AgNO3 = 0.010;
  const PM_Cl = 35.45;
  return (vAgNO3 * M_AgNO3 * PM_Cl) / vMuestra;
}

/**
 * Calculate practice 4 result: mg Cl⁻/mL (Volhard back-titration)
 * Formula: [(V_AgNO3 × M_AgNO3) - (V_KSCN × M_KSCN)] × PM_Cl / V_muestra
 */
export function calculatePractice4(vKSCN, vMuestra) {
  const V_AgNO3 = 50.0;
  const M_AgNO3 = 0.10;
  const M_KSCN = 0.08;
  const PM_Cl = 35.45;
  return ((V_AgNO3 * M_AgNO3) - (vKSCN * M_KSCN)) * PM_Cl / vMuestra;
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
