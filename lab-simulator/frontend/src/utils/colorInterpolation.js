/**
 * Convert hex color to RGB components
 * @param {string} hex - Hex color string like "#FF0000"
 * @returns {{r: number, g: number, b: number}}
 */
export function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : { r: 0, g: 0, b: 0 };
}

/**
 * Convert RGB to hex string
 */
export function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

/**
 * Convert RGB to HSL
 */
export function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

/**
 * Convert HSL to RGB
 */
export function hslToRgb(h, s, l) {
  h /= 360; s /= 100; l /= 100;
  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

/**
 * Interpolate between two hex colors in HSL space
 * @param {string} color1 - Start hex color
 * @param {string} color2 - End hex color
 * @param {number} t - Interpolation factor 0-1
 * @returns {string} Interpolated hex color
 */
export function interpolateColorHSL(color1, color2, t) {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  const hsl1 = rgbToHsl(rgb1.r, rgb1.g, rgb1.b);
  const hsl2 = rgbToHsl(rgb2.r, rgb2.g, rgb2.b);

  // Handle hue interpolation (shortest path)
  let dh = hsl2.h - hsl1.h;
  if (dh > 180) dh -= 360;
  if (dh < -180) dh += 360;

  const h = hsl1.h + dh * t;
  const s = hsl1.s + (hsl2.s - hsl1.s) * t;
  const l = hsl1.l + (hsl2.l - hsl1.l) * t;

  const rgb = hslToRgb(((h % 360) + 360) % 360, s, l);
  return rgbToHex(rgb.r, rgb.g, rgb.b);
}

/**
 * Get color for a given progress value from a color transitions array
 * @param {Array} transitions - Array of { progress, color } sorted by progress
 * @param {number} progress - Current progress (0 to >1)
 * @returns {string} Hex color
 */
export function getColorAtProgress(transitions, progress) {
  if (!transitions || transitions.length === 0) return '#F0F0F0';
  if (progress <= transitions[0].progress) return transitions[0].color;
  if (progress >= transitions[transitions.length - 1].progress) return transitions[transitions.length - 1].color;

  for (let i = 0; i < transitions.length - 1; i++) {
    const curr = transitions[i];
    const next = transitions[i + 1];
    if (progress >= curr.progress && progress <= next.progress) {
      const t = (progress - curr.progress) / (next.progress - curr.progress);
      return interpolateColorHSL(curr.color, next.color, t);
    }
  }
  return transitions[transitions.length - 1].color;
}

/**
 * Stretch the color transitions near the endpoint to make it harder to detect.
 * Spreads the 0.85–1.0 zone to 0.70–1.15 range.
 */
export function stretchTransitionsNearEndpoint(transitions) {
  return transitions.map(t => {
    let p = t.progress;
    if (p >= 0.85 && p <= 1.0) {
      // Map 0.85–1.0 onto 0.70–1.15
      p = 0.70 + ((p - 0.85) / 0.15) * 0.45;
    }
    return { ...t, progress: Math.round(p * 1000) / 1000 };
  });
}

/**
 * Lighten all transition colors — increases HSL lightness +20, decreases saturation -15.
 * Makes indicator colors faint and hard to see.
 */
export function lightenTransitions(transitions) {
  return transitions.map(t => {
    const rgb = hexToRgb(t.color);
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    hsl.l = Math.min(100, hsl.l + 20);
    hsl.s = Math.max(0, hsl.s - 15);
    const newRgb = hslToRgb(hsl.h, hsl.s, hsl.l);
    return { ...t, color: rgbToHex(newRgb.r, newRgb.g, newRgb.b) };
  });
}

/**
 * Darken all transition colors — decreases lightness -15, decreases saturation -10.
 * Makes indicator colors murky and hard to read.
 */
export function darkenTransitions(transitions) {
  return transitions.map(t => {
    const rgb = hexToRgb(t.color);
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    hsl.l = Math.max(0, hsl.l - 15);
    hsl.s = Math.max(0, hsl.s - 10);
    const newRgb = hslToRgb(hsl.h, hsl.s, hsl.l);
    return { ...t, color: rgbToHex(newRgb.r, newRgb.g, newRgb.b) };
  });
}
