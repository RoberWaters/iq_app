/**
 * Lab icon SVG strings → Konva-compatible Image objects.
 * Realistic 48×48 viewBox illustrations matching LabIcon.jsx.
 */
import { useState, useEffect } from 'react';

const V = 48;

function wrap(inner, size, color) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${V} ${V}" width="${size}" height="${size}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}

const svgBuilders = {
  erlenmeyer: (s, c) => wrap(`
    <path d="M21 6 L21 16 L7 42 L41 42 L27 16 L27 6" fill="#E0F2FE" fill-opacity="0.35"/>
    <line x1="21" y1="4" x2="21" y2="16"/>
    <line x1="27" y1="4" x2="27" y2="16"/>
    <path d="M19.5 4 L21 5.5" stroke-width="1.2"/>
    <path d="M28.5 4 L27 5.5" stroke-width="1.2"/>
    <line x1="19.5" y1="4" x2="28.5" y2="4"/>
    <line x1="21" y1="16" x2="7" y2="42"/>
    <line x1="27" y1="16" x2="41" y2="42"/>
    <line x1="7" y1="42" x2="41" y2="42" stroke-width="1.8"/>
    <line x1="22.5" y1="8" x2="22.5" y2="14" stroke="#93C5FD" stroke-width="0.8" stroke-opacity="0.5"/>
    <line x1="14" y1="30" x2="11" y2="36" stroke="#93C5FD" stroke-width="0.8" stroke-opacity="0.4"/>
    <line x1="13" y1="36" x2="15.5" y2="36" stroke-width="0.7" stroke-opacity="0.5"/>
    <line x1="10" y1="39" x2="13" y2="39" stroke-width="0.7" stroke-opacity="0.5"/>`, s, c),

  flask: (s, c) => wrap(`
    <path d="M21 14 C12 18,6 26,8 36 C9 40,16 44,24 44 C32 44,39 40,40 36 C42 26,36 18,27 14" fill="#E0F2FE" fill-opacity="0.3"/>
    <line x1="21" y1="4" x2="21" y2="14"/>
    <line x1="27" y1="4" x2="27" y2="14"/>
    <line x1="19.5" y1="4" x2="28.5" y2="4"/>
    <path d="M19.5 4 L21 5.5" stroke-width="1.2"/>
    <path d="M28.5 4 L27 5.5" stroke-width="1.2"/>
    <path d="M21 14 C12 18,6 26,8 36 C9 40,16 44,24 44 C32 44,39 40,40 36 C42 26,36 18,27 14"/>
    <path d="M14 26 C12 30,12 34,14 37" stroke="#93C5FD" stroke-width="0.8" stroke-opacity="0.45" fill="none"/>
    <line x1="22.5" y1="6" x2="22.5" y2="12" stroke="#93C5FD" stroke-width="0.8" stroke-opacity="0.5"/>`, s, c),

  burette: (s, c) => wrap(`
    <rect x="20" y="3" width="8" height="32" rx="1" fill="#E0F2FE" fill-opacity="0.25"/>
    <path d="M18 3 L20 5 L28 5 L30 3"/>
    <line x1="18" y1="3" x2="30" y2="3"/>
    <line x1="20" y1="5" x2="20" y2="35"/>
    <line x1="28" y1="5" x2="28" y2="35"/>
    <rect x="17" y="35" width="14" height="3" rx="1" fill="${c}" fill-opacity="0.12"/>
    <rect x="17" y="35" width="14" height="3" rx="1"/>
    <line x1="15" y1="36.5" x2="17" y2="36.5" stroke-width="2"/>
    <line x1="22.5" y1="38" x2="22.5" y2="44"/>
    <line x1="25.5" y1="38" x2="25.5" y2="44"/>
    <path d="M22.5 44 L24 46 L25.5 44" stroke-width="1.2"/>
    <line x1="28" y1="9" x2="31.5" y2="9" stroke-width="0.8"/>
    <line x1="28" y1="17" x2="31.5" y2="17" stroke-width="0.8"/>
    <line x1="28" y1="25" x2="31.5" y2="25" stroke-width="0.8"/>
    <line x1="28" y1="33" x2="31.5" y2="33" stroke-width="0.8"/>
    <line x1="28" y1="11" x2="30" y2="11" stroke-width="0.5" stroke-opacity="0.5"/>
    <line x1="28" y1="13" x2="31" y2="13" stroke-width="0.6" stroke-opacity="0.6"/>
    <line x1="28" y1="15" x2="30" y2="15" stroke-width="0.5" stroke-opacity="0.5"/>
    <line x1="28" y1="19" x2="30" y2="19" stroke-width="0.5" stroke-opacity="0.5"/>
    <line x1="28" y1="21" x2="31" y2="21" stroke-width="0.6" stroke-opacity="0.6"/>
    <line x1="28" y1="23" x2="30" y2="23" stroke-width="0.5" stroke-opacity="0.5"/>
    <line x1="28" y1="27" x2="30" y2="27" stroke-width="0.5" stroke-opacity="0.5"/>
    <line x1="28" y1="29" x2="31" y2="29" stroke-width="0.6" stroke-opacity="0.6"/>
    <line x1="28" y1="31" x2="30" y2="31" stroke-width="0.5" stroke-opacity="0.5"/>
    <line x1="22" y1="7" x2="22" y2="33" stroke="#93C5FD" stroke-width="0.7" stroke-opacity="0.4"/>`, s, c),

  'graduated-cyl': (s, c) => wrap(`
    <rect x="14" y="6" width="20" height="32" fill="#E0F2FE" fill-opacity="0.2"/>
    <ellipse cx="24" cy="6" rx="10" ry="3" fill="#F0F9FF" fill-opacity="0.3"/>
    <ellipse cx="24" cy="6" rx="10" ry="3"/>
    <path d="M14 5 L12 3.5" stroke-width="1.3"/>
    <line x1="14" y1="6" x2="14" y2="38"/>
    <line x1="34" y1="6" x2="34" y2="38"/>
    <ellipse cx="24" cy="38" rx="10" ry="3" fill="#F0F9FF" fill-opacity="0.15"/>
    <path d="M14 38 C14 41,34 41,34 38"/>
    <rect x="11" y="42" width="26" height="2.5" rx="1" fill="${c}" fill-opacity="0.08"/>
    <rect x="11" y="42" width="26" height="2.5" rx="1"/>
    <line x1="24" y1="41" x2="24" y2="42" stroke-width="1.2"/>
    <line x1="34" y1="12" x2="38" y2="12" stroke-width="0.8"/>
    <line x1="34" y1="20" x2="38" y2="20" stroke-width="0.8"/>
    <line x1="34" y1="28" x2="38" y2="28" stroke-width="0.8"/>
    <line x1="34" y1="36" x2="38" y2="36" stroke-width="0.8"/>
    <line x1="34" y1="16" x2="37" y2="16" stroke-width="0.6" stroke-opacity="0.6"/>
    <line x1="34" y1="24" x2="37" y2="24" stroke-width="0.6" stroke-opacity="0.6"/>
    <line x1="34" y1="32" x2="37" y2="32" stroke-width="0.6" stroke-opacity="0.6"/>
    <line x1="34" y1="14" x2="36" y2="14" stroke-width="0.4" stroke-opacity="0.4"/>
    <line x1="34" y1="18" x2="36" y2="18" stroke-width="0.4" stroke-opacity="0.4"/>
    <line x1="34" y1="22" x2="36" y2="22" stroke-width="0.4" stroke-opacity="0.4"/>
    <line x1="34" y1="26" x2="36" y2="26" stroke-width="0.4" stroke-opacity="0.4"/>
    <line x1="34" y1="30" x2="36" y2="30" stroke-width="0.4" stroke-opacity="0.4"/>
    <line x1="34" y1="34" x2="36" y2="34" stroke-width="0.4" stroke-opacity="0.4"/>
    <line x1="18" y1="9" x2="18" y2="36" stroke="#93C5FD" stroke-width="0.8" stroke-opacity="0.35"/>`, s, c),

  pipette: (s, c) => wrap(`
    <ellipse cx="24" cy="5" rx="5" ry="3.5" fill="${c}" fill-opacity="0.08"/>
    <ellipse cx="24" cy="5" rx="5" ry="3.5"/>
    <line x1="22.5" y1="8.5" x2="22.5" y2="14"/>
    <line x1="25.5" y1="8.5" x2="25.5" y2="14"/>
    <path d="M22.5 14 C19 16,18 20,18 24 C18 28,19 32,22.5 34" fill="#E0F2FE" fill-opacity="0.2"/>
    <path d="M25.5 14 C29 16,30 20,30 24 C30 28,29 32,25.5 34" fill="#E0F2FE" fill-opacity="0.2"/>
    <path d="M22.5 14 C19 16,18 20,18 24 C18 28,19 32,22.5 34"/>
    <path d="M25.5 14 C29 16,30 20,30 24 C30 28,29 32,25.5 34"/>
    <line x1="22.5" y1="34" x2="23" y2="44"/>
    <line x1="25.5" y1="34" x2="25" y2="44"/>
    <line x1="23" y1="44" x2="25" y2="44" stroke-width="1"/>
    <line x1="16" y1="14" x2="22.5" y2="14" stroke-width="0.9" stroke="#DC2626" stroke-opacity="0.6"/>
    <line x1="20.5" y1="17" x2="20.5" y2="31" stroke="#93C5FD" stroke-width="0.7" stroke-opacity="0.4"/>`, s, c),

  'pipette-grad': (s, c) => wrap(`
    <ellipse cx="24" cy="4.5" rx="4" ry="2.5" fill="${c}" fill-opacity="0.08"/>
    <ellipse cx="24" cy="4.5" rx="4" ry="2.5"/>
    <rect x="22" y="7" width="4" height="34" fill="#E0F2FE" fill-opacity="0.15"/>
    <line x1="22" y1="7" x2="22.5" y2="42"/>
    <line x1="26" y1="7" x2="25.5" y2="42"/>
    <line x1="22.5" y1="42" x2="23.5" y2="46"/>
    <line x1="25.5" y1="42" x2="24.5" y2="46"/>
    <line x1="26" y1="12" x2="28.5" y2="12" stroke-width="0.7"/>
    <line x1="26" y1="16" x2="28" y2="16" stroke-width="0.5" stroke-opacity="0.6"/>
    <line x1="26" y1="20" x2="28.5" y2="20" stroke-width="0.7"/>
    <line x1="26" y1="24" x2="28" y2="24" stroke-width="0.5" stroke-opacity="0.6"/>
    <line x1="26" y1="28" x2="28.5" y2="28" stroke-width="0.7"/>
    <line x1="26" y1="32" x2="28" y2="32" stroke-width="0.5" stroke-opacity="0.6"/>
    <line x1="26" y1="36" x2="28.5" y2="36" stroke-width="0.7"/>
    <line x1="26" y1="40" x2="28" y2="40" stroke-width="0.5" stroke-opacity="0.6"/>
    <line x1="23" y1="9" x2="23" y2="40" stroke="#93C5FD" stroke-width="0.6" stroke-opacity="0.35"/>`, s, c),

  beaker: (s, c) => wrap(`
    <path d="M10 8 L10 38 C10 40,12 42,14 42 L34 42 C36 42,38 40,38 38 L38 8" fill="#E0F2FE" fill-opacity="0.2"/>
    <path d="M10 8 L10 38 C10 40,12 42,14 42 L34 42 C36 42,38 40,38 38 L38 8"/>
    <line x1="10" y1="8" x2="38" y2="8" stroke-width="1.8"/>
    <path d="M10 8 C9.5 6.5,8 6,7 7" stroke-width="1.4"/>
    <line x1="10" y1="15" x2="14" y2="15" stroke-width="0.7"/>
    <line x1="10" y1="20" x2="13" y2="20" stroke-width="0.5" stroke-opacity="0.5"/>
    <line x1="10" y1="25" x2="14" y2="25" stroke-width="0.7"/>
    <line x1="10" y1="30" x2="13" y2="30" stroke-width="0.5" stroke-opacity="0.5"/>
    <line x1="10" y1="35" x2="14" y2="35" stroke-width="0.7"/>
    <line x1="14" y1="11" x2="14" y2="39" stroke="#93C5FD" stroke-width="0.8" stroke-opacity="0.35"/>`, s, c),

  'vol-flask': (s, c) => wrap(`
    <path d="M22 18 C12 22,7 30,10 38 C11.5 42,18 44,24 44 C30 44,36.5 42,38 38 C41 30,36 22,26 18" fill="#E0F2FE" fill-opacity="0.25"/>
    <line x1="22" y1="4" x2="22" y2="18"/>
    <line x1="26" y1="4" x2="26" y2="18"/>
    <path d="M20 4 L22 6" stroke-width="1.2"/>
    <path d="M28 4 L26 6" stroke-width="1.2"/>
    <line x1="20" y1="4" x2="28" y2="4" stroke-width="1.4"/>
    <line x1="19" y1="12" x2="22" y2="12" stroke="#DC2626" stroke-width="0.9" stroke-opacity="0.5"/>
    <line x1="26" y1="12" x2="29" y2="12" stroke="#DC2626" stroke-width="0.9" stroke-opacity="0.5"/>
    <path d="M22 18 C12 22,7 30,10 38 C11.5 42,18 44,24 44 C30 44,36.5 42,38 38 C41 30,36 22,26 18"/>
    <line x1="11" y1="43" x2="37" y2="43" stroke-width="1.8"/>
    <path d="M16 28 C14 32,14 36,16 39" stroke="#93C5FD" stroke-width="0.8" stroke-opacity="0.4" fill="none"/>
    <line x1="23.5" y1="6" x2="23.5" y2="16" stroke="#93C5FD" stroke-width="0.6" stroke-opacity="0.4"/>`, s, c),

  balance: (s, c) => wrap(`
    <rect x="6" y="14" width="36" height="22" rx="2" fill="${c}" fill-opacity="0.05"/>
    <rect x="6" y="14" width="36" height="22" rx="2"/>
    <rect x="8" y="4" width="32" height="12" rx="1.5" fill="#E0F2FE" fill-opacity="0.3"/>
    <rect x="8" y="4" width="32" height="12" rx="1.5" stroke-width="1.2"/>
    <rect x="14" y="11" width="20" height="2" rx="0.5" fill="${c}" fill-opacity="0.1"/>
    <rect x="14" y="11" width="20" height="2" rx="0.5" stroke-width="0.8"/>
    <rect x="12" y="19" width="24" height="8" rx="1" fill="#0F172A" fill-opacity="0.06"/>
    <rect x="12" y="19" width="24" height="8" rx="1" stroke-width="0.8"/>
    <text x="16" y="25.5" font-size="5" font-family="monospace" fill="${c}" fill-opacity="0.35" stroke="none">0.0000</text>
    <circle cx="15" cy="32" r="1.5" fill="${c}" fill-opacity="0.1"/>
    <circle cx="15" cy="32" r="1.5" stroke-width="0.7"/>
    <circle cx="21" cy="32" r="1.5" fill="${c}" fill-opacity="0.1"/>
    <circle cx="21" cy="32" r="1.5" stroke-width="0.7"/>
    <circle cx="10" cy="37" r="1" fill="${c}" fill-opacity="0.15" stroke-width="0.6"/>
    <circle cx="38" cy="37" r="1" fill="${c}" fill-opacity="0.15" stroke-width="0.6"/>
    <circle cx="36" cy="32" r="2" stroke-width="0.6"/>
    <circle cx="36" cy="32" r="0.7" fill="${c}" fill-opacity="0.2" stroke="none"/>`, s, c),

  condenser: (s, c) => wrap(`
    <rect x="17" y="4" width="14" height="38" rx="2" fill="#E0F2FE" fill-opacity="0.15"/>
    <rect x="17" y="4" width="14" height="38" rx="2"/>
    <line x1="22" y1="2" x2="22" y2="44"/>
    <line x1="26" y1="2" x2="26" y2="44"/>
    <line x1="31" y1="34" x2="38" y2="34" stroke-width="1.3"/>
    <line x1="38" y1="32" x2="38" y2="36" stroke-width="1.3"/>
    <line x1="17" y1="12" x2="10" y2="12" stroke-width="1.3"/>
    <line x1="10" y1="10" x2="10" y2="14" stroke-width="1.3"/>
    <line x1="18" y1="10" x2="30" y2="10" stroke-width="0.5" stroke-opacity="0.3"/>
    <line x1="18" y1="16" x2="30" y2="16" stroke-width="0.5" stroke-opacity="0.3"/>
    <line x1="18" y1="22" x2="30" y2="22" stroke-width="0.5" stroke-opacity="0.3"/>
    <line x1="18" y1="28" x2="30" y2="28" stroke-width="0.5" stroke-opacity="0.3"/>
    <line x1="18" y1="34" x2="30" y2="34" stroke-width="0.5" stroke-opacity="0.3"/>`, s, c),

  foil: (s, c) => wrap(`
    <ellipse cx="14" cy="24" rx="6" ry="14" fill="${c}" fill-opacity="0.06"/>
    <ellipse cx="14" cy="24" rx="6" ry="14"/>
    <ellipse cx="14" cy="24" rx="2.5" ry="6" stroke-width="0.7" stroke-opacity="0.4"/>
    <path d="M20 10 L40 8 L40 40 L20 38" fill="${c}" fill-opacity="0.04"/>
    <path d="M20 10 L40 8 L40 40 L20 38"/>
    <line x1="26" y1="9.5" x2="26" y2="38.5" stroke-width="0.4" stroke-opacity="0.15"/>
    <line x1="31" y1="9" x2="31" y2="39" stroke-width="0.4" stroke-opacity="0.15"/>
    <line x1="36" y1="8.5" x2="36" y2="39.5" stroke-width="0.4" stroke-opacity="0.15"/>`, s, c),

  reagent: (s, c) => wrap(`
    <rect x="10" y="16" width="28" height="26" rx="3" fill="${c}" fill-opacity="0.06"/>
    <rect x="10" y="16" width="28" height="26" rx="3"/>
    <path d="M10 18 C10 16,18 14,18 10" stroke-width="1.4"/>
    <path d="M38 18 C38 16,30 14,30 10" stroke-width="1.4"/>
    <rect x="18" y="6" width="12" height="5" rx="0.5" fill="${c}" fill-opacity="0.04"/>
    <line x1="18" y1="6" x2="18" y2="11"/>
    <line x1="30" y1="6" x2="30" y2="11"/>
    <rect x="16.5" y="3" width="15" height="4" rx="1.5" fill="${c}" fill-opacity="0.15"/>
    <rect x="16.5" y="3" width="15" height="4" rx="1.5"/>
    <line x1="18" y1="4.5" x2="30" y2="4.5" stroke-width="0.4" stroke-opacity="0.3"/>
    <line x1="18" y1="5.5" x2="30" y2="5.5" stroke-width="0.4" stroke-opacity="0.3"/>
    <rect x="14" y="24" width="20" height="10" rx="1" fill="${c}" fill-opacity="0.08"/>
    <rect x="14" y="24" width="20" height="10" rx="1" stroke-width="0.7" stroke-opacity="0.5"/>
    <line x1="17" y1="27" x2="31" y2="27" stroke-width="0.4" stroke-opacity="0.25" stroke="${c}"/>
    <line x1="17" y1="29.5" x2="28" y2="29.5" stroke-width="0.4" stroke-opacity="0.25" stroke="${c}"/>
    <line x1="17" y1="32" x2="25" y2="32" stroke-width="0.4" stroke-opacity="0.25" stroke="${c}"/>`, s, c),

  dropper: (s, c) => wrap(`
    <ellipse cx="24" cy="6" rx="6" ry="4.5" fill="${c}" fill-opacity="0.12"/>
    <ellipse cx="24" cy="6" rx="6" ry="4.5"/>
    <rect x="20.5" y="10.5" width="7" height="3" rx="0.5" fill="${c}" fill-opacity="0.08"/>
    <rect x="20.5" y="10.5" width="7" height="3" rx="0.5" stroke-width="0.8"/>
    <path d="M20.5 13.5 C16 16,14 20,14 25 L14 36 C14 39,16 40,18 40 L30 40 C32 40,34 39,34 36 L34 25 C34 20,32 16,27.5 13.5" fill="${c}" fill-opacity="0.05"/>
    <path d="M20.5 13.5 C16 16,14 20,14 25 L14 36 C14 39,16 40,18 40 L30 40 C32 40,34 39,34 36 L34 25 C34 20,32 16,27.5 13.5"/>
    <line x1="22" y1="40" x2="23" y2="46" stroke-width="1.4"/>
    <line x1="26" y1="40" x2="25" y2="46" stroke-width="1.4"/>
    <ellipse cx="24" cy="32" rx="6" ry="3" fill="${c}" fill-opacity="0.15" stroke="none"/>
    <line x1="18" y1="20" x2="18" y2="35" stroke="#93C5FD" stroke-width="0.7" stroke-opacity="0.3"/>`, s, c),
};

const REAGENT_TINT = {
  indicator: '#7C3AED', acid: '#DC2626', base: '#2563EB',
  salt: '#D97706', buffer: '#059669', chelator: '#2563EB',
  oxidant: '#EA580C', reductant: '#7C3AED', organic: '#CA8A04',
  solvent: '#0EA5E9',
};

const REAGENT_ICON = { indicator: 'dropper' };

const imgCache = {};

function buildSvg(name, size, color) {
  if (svgBuilders[name]) return svgBuilders[name](size, color);
  const tint = REAGENT_TINT[name] || '#64748B';
  const key = REAGENT_ICON[name] || 'reagent';
  return svgBuilders[key](size, color || tint);
}

export function useLabIconImage(name, size = 18, color) {
  const resolvedColor = color || REAGENT_TINT[name] || '#334155';
  const [image, setImage] = useState(() => {
    const cacheKey = `${name}-${size}-${resolvedColor}`;
    const cached = imgCache[cacheKey];
    return (cached && cached.complete) ? cached : null;
  });

  useEffect(() => {
    if (!name) return;
    const cacheKey = `${name}-${size}-${resolvedColor}`;
    if (imgCache[cacheKey] && imgCache[cacheKey].complete) {
      setImage(imgCache[cacheKey]);
      return;
    }
    const svg = buildSvg(name, size, resolvedColor);
    const img = new window.Image();
    img.onload = () => {
      imgCache[cacheKey] = img;
      setImage(img);
    };
    img.src = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }, [name, size, resolvedColor]);

  return image;
}
