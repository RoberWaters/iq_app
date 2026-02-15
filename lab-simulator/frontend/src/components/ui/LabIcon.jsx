/**
 * SVG lab equipment icons — realistic scientific illustration style.
 * ViewBox 48×48 for high detail; scales cleanly to any size.
 * Usage: <LabIcon name="erlenmeyer" size={24} />
 */

const V = 48;

function Svg({ children, size = 22, color = '#334155', ...rest }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${V} ${V}`}
      width={size}
      height={size}
      fill="none"
      stroke={color}
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      {children}
    </svg>
  );
}

const icons = {
  erlenmeyer: (p) => (
    <Svg {...p}>
      {/* Glass body */}
      <path d="M21 6 L21 16 L7 42 L41 42 L27 16 L27 6" fill="#E0F2FE" fillOpacity="0.35" />
      {/* Neck */}
      <line x1="21" y1="4" x2="21" y2="16" />
      <line x1="27" y1="4" x2="27" y2="16" />
      {/* Rim lip */}
      <path d="M19.5 4 L21 5.5" strokeWidth="1.2" />
      <path d="M28.5 4 L27 5.5" strokeWidth="1.2" />
      <line x1="19.5" y1="4" x2="28.5" y2="4" />
      {/* Body walls */}
      <line x1="21" y1="16" x2="7" y2="42" />
      <line x1="27" y1="16" x2="41" y2="42" />
      {/* Base */}
      <line x1="7" y1="42" x2="41" y2="42" strokeWidth="1.8" />
      {/* Glass reflection */}
      <line x1="22.5" y1="8" x2="22.5" y2="14" stroke="#93C5FD" strokeWidth="0.8" strokeOpacity="0.5" />
      <line x1="14" y1="30" x2="11" y2="36" stroke="#93C5FD" strokeWidth="0.8" strokeOpacity="0.4" />
      {/* Graduation marks */}
      <line x1="13" y1="36" x2="15.5" y2="36" strokeWidth="0.7" strokeOpacity="0.5" />
      <line x1="10" y1="39" x2="13" y2="39" strokeWidth="0.7" strokeOpacity="0.5" />
    </Svg>
  ),

  flask: (p) => (
    <Svg {...p}>
      {/* Glass body */}
      <path d="M21 14 C12 18, 6 26, 8 36 C9 40, 16 44, 24 44 C32 44, 39 40, 40 36 C42 26, 36 18, 27 14" fill="#E0F2FE" fillOpacity="0.3" />
      {/* Neck */}
      <line x1="21" y1="4" x2="21" y2="14" />
      <line x1="27" y1="4" x2="27" y2="14" />
      {/* Rim */}
      <line x1="19.5" y1="4" x2="28.5" y2="4" />
      <path d="M19.5 4 L21 5.5" strokeWidth="1.2" />
      <path d="M28.5 4 L27 5.5" strokeWidth="1.2" />
      {/* Round body */}
      <path d="M21 14 C12 18, 6 26, 8 36 C9 40, 16 44, 24 44 C32 44, 39 40, 40 36 C42 26, 36 18, 27 14" />
      {/* Glass reflection */}
      <path d="M14 26 C12 30, 12 34, 14 37" stroke="#93C5FD" strokeWidth="0.8" strokeOpacity="0.45" fill="none" />
      <line x1="22.5" y1="6" x2="22.5" y2="12" stroke="#93C5FD" strokeWidth="0.8" strokeOpacity="0.5" />
    </Svg>
  ),

  burette: (p) => (
    <Svg {...p}>
      {/* Glass tube fill */}
      <rect x="20" y="3" width="8" height="32" rx="1" fill="#E0F2FE" fillOpacity="0.25" />
      {/* Top funnel opening */}
      <path d="M18 3 L20 5 L28 5 L30 3" />
      <line x1="18" y1="3" x2="30" y2="3" />
      {/* Tube walls */}
      <line x1="20" y1="5" x2="20" y2="35" />
      <line x1="28" y1="5" x2="28" y2="35" />
      {/* Stopcock body */}
      <rect x="17" y="35" width="14" height="3" rx="1" fill={p.color || '#334155'} fillOpacity="0.12" />
      <rect x="17" y="35" width="14" height="3" rx="1" />
      {/* Stopcock handle */}
      <line x1="15" y1="36.5" x2="17" y2="36.5" strokeWidth="2" />
      {/* Tip */}
      <line x1="22.5" y1="38" x2="22.5" y2="44" />
      <line x1="25.5" y1="38" x2="25.5" y2="44" />
      <path d="M22.5 44 L24 46 L25.5 44" strokeWidth="1.2" />
      {/* Major graduation marks with numbers */}
      <line x1="28" y1="9" x2="31.5" y2="9" strokeWidth="0.8" />
      <line x1="28" y1="17" x2="31.5" y2="17" strokeWidth="0.8" />
      <line x1="28" y1="25" x2="31.5" y2="25" strokeWidth="0.8" />
      <line x1="28" y1="33" x2="31.5" y2="33" strokeWidth="0.8" />
      {/* Minor marks */}
      <line x1="28" y1="11" x2="30" y2="11" strokeWidth="0.5" strokeOpacity="0.5" />
      <line x1="28" y1="13" x2="31" y2="13" strokeWidth="0.6" strokeOpacity="0.6" />
      <line x1="28" y1="15" x2="30" y2="15" strokeWidth="0.5" strokeOpacity="0.5" />
      <line x1="28" y1="19" x2="30" y2="19" strokeWidth="0.5" strokeOpacity="0.5" />
      <line x1="28" y1="21" x2="31" y2="21" strokeWidth="0.6" strokeOpacity="0.6" />
      <line x1="28" y1="23" x2="30" y2="23" strokeWidth="0.5" strokeOpacity="0.5" />
      <line x1="28" y1="27" x2="30" y2="27" strokeWidth="0.5" strokeOpacity="0.5" />
      <line x1="28" y1="29" x2="31" y2="29" strokeWidth="0.6" strokeOpacity="0.6" />
      <line x1="28" y1="31" x2="30" y2="31" strokeWidth="0.5" strokeOpacity="0.5" />
      {/* Glass reflection */}
      <line x1="22" y1="7" x2="22" y2="33" stroke="#93C5FD" strokeWidth="0.7" strokeOpacity="0.4" />
    </Svg>
  ),

  'graduated-cyl': (p) => (
    <Svg {...p}>
      {/* Glass fill */}
      <rect x="14" y="6" width="20" height="32" rx="0" fill="#E0F2FE" fillOpacity="0.2" />
      {/* Top rim — 3D ellipse */}
      <ellipse cx="24" cy="6" rx="10" ry="3" fill="#F0F9FF" fillOpacity="0.3" />
      <ellipse cx="24" cy="6" rx="10" ry="3" />
      {/* Spout notch */}
      <path d="M14 5 L12 3.5" strokeWidth="1.3" />
      {/* Walls */}
      <line x1="14" y1="6" x2="14" y2="38" />
      <line x1="34" y1="6" x2="34" y2="38" />
      {/* Bottom ellipse */}
      <ellipse cx="24" cy="38" rx="10" ry="3" fill="#F0F9FF" fillOpacity="0.15" />
      <path d="M14 38 C14 41, 34 41, 34 38" />
      {/* Base / foot */}
      <rect x="11" y="42" width="26" height="2.5" rx="1" fill={p.color || '#334155'} fillOpacity="0.08" />
      <rect x="11" y="42" width="26" height="2.5" rx="1" />
      <line x1="24" y1="41" x2="24" y2="42" strokeWidth="1.2" />
      {/* Major graduation marks */}
      <line x1="34" y1="12" x2="38" y2="12" strokeWidth="0.8" />
      <line x1="34" y1="20" x2="38" y2="20" strokeWidth="0.8" />
      <line x1="34" y1="28" x2="38" y2="28" strokeWidth="0.8" />
      <line x1="34" y1="36" x2="38" y2="36" strokeWidth="0.8" />
      {/* Mid marks */}
      <line x1="34" y1="16" x2="37" y2="16" strokeWidth="0.6" strokeOpacity="0.6" />
      <line x1="34" y1="24" x2="37" y2="24" strokeWidth="0.6" strokeOpacity="0.6" />
      <line x1="34" y1="32" x2="37" y2="32" strokeWidth="0.6" strokeOpacity="0.6" />
      {/* Minor ticks */}
      <line x1="34" y1="14" x2="36" y2="14" strokeWidth="0.4" strokeOpacity="0.4" />
      <line x1="34" y1="18" x2="36" y2="18" strokeWidth="0.4" strokeOpacity="0.4" />
      <line x1="34" y1="22" x2="36" y2="22" strokeWidth="0.4" strokeOpacity="0.4" />
      <line x1="34" y1="26" x2="36" y2="26" strokeWidth="0.4" strokeOpacity="0.4" />
      <line x1="34" y1="30" x2="36" y2="30" strokeWidth="0.4" strokeOpacity="0.4" />
      <line x1="34" y1="34" x2="36" y2="34" strokeWidth="0.4" strokeOpacity="0.4" />
      {/* Glass reflection */}
      <line x1="18" y1="9" x2="18" y2="36" stroke="#93C5FD" strokeWidth="0.8" strokeOpacity="0.35" />
    </Svg>
  ),

  pipette: (p) => (
    <Svg {...p}>
      {/* Suction bulb */}
      <ellipse cx="24" cy="5" rx="5" ry="3.5" fill={p.color || '#334155'} fillOpacity="0.08" />
      <ellipse cx="24" cy="5" rx="5" ry="3.5" />
      {/* Upper narrow tube */}
      <line x1="22.5" y1="8.5" x2="22.5" y2="14" />
      <line x1="25.5" y1="8.5" x2="25.5" y2="14" />
      {/* Belly (expanded section) */}
      <path d="M22.5 14 C19 16, 18 20, 18 24 C18 28, 19 32, 22.5 34" fill="#E0F2FE" fillOpacity="0.2" />
      <path d="M25.5 14 C29 16, 30 20, 30 24 C30 28, 29 32, 25.5 34" fill="#E0F2FE" fillOpacity="0.2" />
      <path d="M22.5 14 C19 16, 18 20, 18 24 C18 28, 19 32, 22.5 34" />
      <path d="M25.5 14 C29 16, 30 20, 30 24 C30 28, 29 32, 25.5 34" />
      {/* Lower narrow tube + tip */}
      <line x1="22.5" y1="34" x2="23" y2="44" />
      <line x1="25.5" y1="34" x2="25" y2="44" />
      <line x1="23" y1="44" x2="25" y2="44" strokeWidth="1" />
      {/* Calibration mark */}
      <line x1="16" y1="14" x2="22.5" y2="14" strokeWidth="0.9" stroke="#DC2626" strokeOpacity="0.6" />
      {/* Glass reflection */}
      <line x1="20.5" y1="17" x2="20.5" y2="31" stroke="#93C5FD" strokeWidth="0.7" strokeOpacity="0.4" />
    </Svg>
  ),

  'pipette-grad': (p) => (
    <Svg {...p}>
      {/* Suction bulb */}
      <ellipse cx="24" cy="4.5" rx="4" ry="2.5" fill={p.color || '#334155'} fillOpacity="0.08" />
      <ellipse cx="24" cy="4.5" rx="4" ry="2.5" />
      {/* Glass tube fill */}
      <rect x="22" y="7" width="4" height="34" rx="0" fill="#E0F2FE" fillOpacity="0.15" />
      {/* Straight tube */}
      <line x1="22" y1="7" x2="22.5" y2="42" />
      <line x1="26" y1="7" x2="25.5" y2="42" />
      {/* Tapered tip */}
      <line x1="22.5" y1="42" x2="23.5" y2="46" />
      <line x1="25.5" y1="42" x2="24.5" y2="46" />
      {/* Graduation marks */}
      <line x1="26" y1="12" x2="28.5" y2="12" strokeWidth="0.7" />
      <line x1="26" y1="16" x2="28" y2="16" strokeWidth="0.5" strokeOpacity="0.6" />
      <line x1="26" y1="20" x2="28.5" y2="20" strokeWidth="0.7" />
      <line x1="26" y1="24" x2="28" y2="24" strokeWidth="0.5" strokeOpacity="0.6" />
      <line x1="26" y1="28" x2="28.5" y2="28" strokeWidth="0.7" />
      <line x1="26" y1="32" x2="28" y2="32" strokeWidth="0.5" strokeOpacity="0.6" />
      <line x1="26" y1="36" x2="28.5" y2="36" strokeWidth="0.7" />
      <line x1="26" y1="40" x2="28" y2="40" strokeWidth="0.5" strokeOpacity="0.6" />
      {/* Glass reflection */}
      <line x1="23" y1="9" x2="23" y2="40" stroke="#93C5FD" strokeWidth="0.6" strokeOpacity="0.35" />
    </Svg>
  ),

  beaker: (p) => (
    <Svg {...p}>
      {/* Glass fill */}
      <path d="M10 8 L10 38 C10 40, 12 42, 14 42 L34 42 C36 42, 38 40, 38 38 L38 8" fill="#E0F2FE" fillOpacity="0.2" />
      {/* Body */}
      <path d="M10 8 L10 38 C10 40, 12 42, 14 42 L34 42 C36 42, 38 40, 38 38 L38 8" />
      {/* Rim + spout */}
      <line x1="10" y1="8" x2="38" y2="8" strokeWidth="1.8" />
      <path d="M10 8 C9.5 6.5, 8 6, 7 7" strokeWidth="1.4" />
      {/* Graduation marks */}
      <line x1="10" y1="15" x2="14" y2="15" strokeWidth="0.7" />
      <line x1="10" y1="20" x2="13" y2="20" strokeWidth="0.5" strokeOpacity="0.5" />
      <line x1="10" y1="25" x2="14" y2="25" strokeWidth="0.7" />
      <line x1="10" y1="30" x2="13" y2="30" strokeWidth="0.5" strokeOpacity="0.5" />
      <line x1="10" y1="35" x2="14" y2="35" strokeWidth="0.7" />
      {/* Glass reflection */}
      <line x1="14" y1="11" x2="14" y2="39" stroke="#93C5FD" strokeWidth="0.8" strokeOpacity="0.35" />
    </Svg>
  ),

  'vol-flask': (p) => (
    <Svg {...p}>
      {/* Body fill */}
      <path d="M22 18 C12 22, 7 30, 10 38 C11.5 42, 18 44, 24 44 C30 44, 36.5 42, 38 38 C41 30, 36 22, 26 18" fill="#E0F2FE" fillOpacity="0.25" />
      {/* Neck */}
      <line x1="22" y1="4" x2="22" y2="18" />
      <line x1="26" y1="4" x2="26" y2="18" />
      {/* Stopper */}
      <path d="M20 4 L22 6" strokeWidth="1.2" />
      <path d="M28 4 L26 6" strokeWidth="1.2" />
      <line x1="20" y1="4" x2="28" y2="4" strokeWidth="1.4" />
      {/* Calibration ring mark */}
      <line x1="19" y1="12" x2="22" y2="12" stroke="#DC2626" strokeWidth="0.9" strokeOpacity="0.5" />
      <line x1="26" y1="12" x2="29" y2="12" stroke="#DC2626" strokeWidth="0.9" strokeOpacity="0.5" />
      {/* Pear body */}
      <path d="M22 18 C12 22, 7 30, 10 38 C11.5 42, 18 44, 24 44 C30 44, 36.5 42, 38 38 C41 30, 36 22, 26 18" />
      {/* Flat base */}
      <line x1="11" y1="43" x2="37" y2="43" strokeWidth="1.8" />
      {/* Glass reflection */}
      <path d="M16 28 C14 32, 14 36, 16 39" stroke="#93C5FD" strokeWidth="0.8" strokeOpacity="0.4" fill="none" />
      <line x1="23.5" y1="6" x2="23.5" y2="16" stroke="#93C5FD" strokeWidth="0.6" strokeOpacity="0.4" />
    </Svg>
  ),

  balance: (p) => (
    <Svg {...p}>
      {/* Housing body */}
      <rect x="6" y="14" width="36" height="22" rx="2" fill={p.color || '#334155'} fillOpacity="0.05" />
      <rect x="6" y="14" width="36" height="22" rx="2" />
      {/* Weighing chamber glass */}
      <rect x="8" y="4" width="32" height="12" rx="1.5" fill="#E0F2FE" fillOpacity="0.3" />
      <rect x="8" y="4" width="32" height="12" rx="1.5" strokeWidth="1.2" />
      {/* Pan inside chamber */}
      <rect x="14" y="11" width="20" height="2" rx="0.5" fill={p.color || '#334155'} fillOpacity="0.1" />
      <rect x="14" y="11" width="20" height="2" rx="0.5" strokeWidth="0.8" />
      {/* Digital display */}
      <rect x="12" y="19" width="24" height="8" rx="1" fill="#0F172A" fillOpacity="0.06" />
      <rect x="12" y="19" width="24" height="8" rx="1" strokeWidth="0.8" />
      {/* Display digits hint */}
      <text x="16" y="25.5" fontSize="5" fontFamily="monospace" fill={p.color || '#334155'} fillOpacity="0.35" stroke="none">0.0000</text>
      {/* Buttons */}
      <circle cx="15" cy="32" r="1.5" fill={p.color || '#334155'} fillOpacity="0.1" />
      <circle cx="15" cy="32" r="1.5" strokeWidth="0.7" />
      <circle cx="21" cy="32" r="1.5" fill={p.color || '#334155'} fillOpacity="0.1" />
      <circle cx="21" cy="32" r="1.5" strokeWidth="0.7" />
      {/* Feet */}
      <circle cx="10" cy="37" r="1" fill={p.color || '#334155'} fillOpacity="0.15" strokeWidth="0.6" />
      <circle cx="38" cy="37" r="1" fill={p.color || '#334155'} fillOpacity="0.15" strokeWidth="0.6" />
      {/* Level bubble */}
      <circle cx="36" cy="32" r="2" strokeWidth="0.6" />
      <circle cx="36" cy="32" r="0.7" fill={p.color || '#334155'} fillOpacity="0.2" stroke="none" />
    </Svg>
  ),

  condenser: (p) => (
    <Svg {...p}>
      {/* Outer jacket */}
      <rect x="17" y="4" width="14" height="38" rx="2" fill="#E0F2FE" fillOpacity="0.15" />
      <rect x="17" y="4" width="14" height="38" rx="2" />
      {/* Inner tube */}
      <line x1="22" y1="2" x2="22" y2="44" />
      <line x1="26" y1="2" x2="26" y2="44" />
      {/* Cooling water inlet (lower right) */}
      <line x1="31" y1="34" x2="38" y2="34" strokeWidth="1.3" />
      <line x1="38" y1="32" x2="38" y2="36" strokeWidth="1.3" />
      {/* Cooling water outlet (upper left) */}
      <line x1="17" y1="12" x2="10" y2="12" strokeWidth="1.3" />
      <line x1="10" y1="10" x2="10" y2="14" strokeWidth="1.3" />
      {/* Internal spiral / baffles */}
      <line x1="18" y1="10" x2="30" y2="10" strokeWidth="0.5" strokeOpacity="0.3" />
      <line x1="18" y1="16" x2="30" y2="16" strokeWidth="0.5" strokeOpacity="0.3" />
      <line x1="18" y1="22" x2="30" y2="22" strokeWidth="0.5" strokeOpacity="0.3" />
      <line x1="18" y1="28" x2="30" y2="28" strokeWidth="0.5" strokeOpacity="0.3" />
      <line x1="18" y1="34" x2="30" y2="34" strokeWidth="0.5" strokeOpacity="0.3" />
    </Svg>
  ),

  foil: (p) => (
    <Svg {...p}>
      {/* Roll core */}
      <ellipse cx="14" cy="24" rx="6" ry="14" fill={p.color || '#334155'} fillOpacity="0.06" />
      <ellipse cx="14" cy="24" rx="6" ry="14" />
      {/* Inner hole */}
      <ellipse cx="14" cy="24" rx="2.5" ry="6" strokeWidth="0.7" strokeOpacity="0.4" />
      {/* Unrolled sheet */}
      <path d="M20 10 L40 8 L40 40 L20 38" fill={p.color || '#334155'} fillOpacity="0.04" />
      <path d="M20 10 L40 8 L40 40 L20 38" />
      {/* Sheet texture lines */}
      <line x1="26" y1="9.5" x2="26" y2="38.5" strokeWidth="0.4" strokeOpacity="0.15" />
      <line x1="31" y1="9" x2="31" y2="39" strokeWidth="0.4" strokeOpacity="0.15" />
      <line x1="36" y1="8.5" x2="36" y2="39.5" strokeWidth="0.4" strokeOpacity="0.15" />
    </Svg>
  ),

  reagent: (p) => {
    const tint = p.color || '#334155';
    return (
      <Svg {...p}>
        {/* Bottle body */}
        <rect x="10" y="16" width="28" height="26" rx="3" fill={tint} fillOpacity="0.06" />
        <rect x="10" y="16" width="28" height="26" rx="3" />
        {/* Shoulder taper */}
        <path d="M10 18 C10 16, 18 14, 18 10" strokeWidth="1.4" />
        <path d="M38 18 C38 16, 30 14, 30 10" strokeWidth="1.4" />
        {/* Neck */}
        <rect x="18" y="6" width="12" height="5" rx="0.5" fill={tint} fillOpacity="0.04" />
        <line x1="18" y1="6" x2="18" y2="11" />
        <line x1="30" y1="6" x2="30" y2="11" />
        {/* Screw cap */}
        <rect x="16.5" y="3" width="15" height="4" rx="1.5" fill={tint} fillOpacity="0.15" />
        <rect x="16.5" y="3" width="15" height="4" rx="1.5" />
        <line x1="18" y1="4.5" x2="30" y2="4.5" strokeWidth="0.4" strokeOpacity="0.3" />
        <line x1="18" y1="5.5" x2="30" y2="5.5" strokeWidth="0.4" strokeOpacity="0.3" />
        {/* Label */}
        <rect x="14" y="24" width="20" height="10" rx="1" fill={tint} fillOpacity="0.08" />
        <rect x="14" y="24" width="20" height="10" rx="1" strokeWidth="0.7" strokeOpacity="0.5" />
        <line x1="17" y1="27" x2="31" y2="27" strokeWidth="0.4" strokeOpacity="0.25" stroke={tint} />
        <line x1="17" y1="29.5" x2="28" y2="29.5" strokeWidth="0.4" strokeOpacity="0.25" stroke={tint} />
        <line x1="17" y1="32" x2="25" y2="32" strokeWidth="0.4" strokeOpacity="0.25" stroke={tint} />
      </Svg>
    );
  },

  dropper: (p) => {
    const tint = p.color || '#334155';
    return (
      <Svg {...p}>
        {/* Rubber bulb */}
        <ellipse cx="24" cy="6" rx="6" ry="4.5" fill={tint} fillOpacity="0.12" />
        <ellipse cx="24" cy="6" rx="6" ry="4.5" />
        {/* Neck collar */}
        <rect x="20.5" y="10.5" width="7" height="3" rx="0.5" fill={tint} fillOpacity="0.08" />
        <rect x="20.5" y="10.5" width="7" height="3" rx="0.5" strokeWidth="0.8" />
        {/* Body */}
        <path d="M20.5 13.5 C16 16, 14 20, 14 25 L14 36 C14 39, 16 40, 18 40 L30 40 C32 40, 34 39, 34 36 L34 25 C34 20, 32 16, 27.5 13.5" fill={tint} fillOpacity="0.05" />
        <path d="M20.5 13.5 C16 16, 14 20, 14 25 L14 36 C14 39, 16 40, 18 40 L30 40 C32 40, 34 39, 34 36 L34 25 C34 20, 32 16, 27.5 13.5" />
        {/* Dropper tip */}
        <line x1="22" y1="40" x2="23" y2="46" strokeWidth="1.4" />
        <line x1="26" y1="40" x2="25" y2="46" strokeWidth="1.4" />
        {/* Liquid color inside */}
        <ellipse cx="24" cy="32" rx="6" ry="3" fill={tint} fillOpacity="0.15" stroke="none" />
        {/* Glass reflection */}
        <line x1="18" y1="20" x2="18" y2="35" stroke="#93C5FD" strokeWidth="0.7" strokeOpacity="0.3" />
      </Svg>
    );
  },
};

const REAGENT_STYLE = {
  indicator: { icon: 'dropper', tint: '#7C3AED' },
  acid:      { icon: 'reagent', tint: '#DC2626' },
  base:      { icon: 'reagent', tint: '#2563EB' },
  salt:      { icon: 'reagent', tint: '#D97706' },
  buffer:    { icon: 'reagent', tint: '#059669' },
  chelator:  { icon: 'reagent', tint: '#2563EB' },
  oxidant:   { icon: 'reagent', tint: '#EA580C' },
  reductant: { icon: 'reagent', tint: '#7C3AED' },
  organic:   { icon: 'reagent', tint: '#CA8A04' },
  solvent:   { icon: 'reagent', tint: '#0EA5E9' },
};

export default function LabIcon({ name, size = 22, color }) {
  if (icons[name]) return icons[name]({ size, color });
  const rs = REAGENT_STYLE[name];
  if (rs) return icons[rs.icon]({ size, color: color || rs.tint });
  return icons.reagent({ size, color: color || '#64748B' });
}
