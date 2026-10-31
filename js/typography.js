// A paragraph owns spacing; script runs own their font family and weight.
export const CN_WEIGHTS = [[200, 'ExtraLight · 特细'], [300, 'Light · 细体'], [400, 'Regular · 常规'], [500, 'Medium · 中等'], [700, 'Bold · 粗体'], [900, 'Heavy · 特粗']];
export const EN_WEIGHTS = [[100, 'Ultralight · 100'], [200, 'Thin · 200'], [300, 'Light · 300'], [400, 'Regular · 400'], [500, 'Medium · 500'], [600, 'Semibold · 600'], [700, 'Bold · 700'], [800, 'Heavy · 800'], [900, 'Black · 900']];
const bounded = (value, fallback, min, max) => value === '' || value == null || !Number.isFinite(Number(value)) ? fallback : Math.max(min, Math.min(max, Number(value)));

export function typographyDefaults(fontSize = 18, fontWeight = 400, heading = false) {
  const weight = Math.round(fontWeight / 100) * 100;
  const cnWeight = CN_WEIGHTS.map(([w]) => w).reduce((a,b) => Math.abs(a-weight) <= Math.abs(b-weight) ? a : b);
  return { fontSize, cnWeight, enWeight: Math.min(900, Math.max(100, weight)), lineHeight: heading ? 115 : 150, lineHeightUnit: '%', letterSpacing: 0, letterSpacingUnit: 'px', align: 'center' };
}

export function normalizeTypography(value = {}, defaults = typographyDefaults()) {
  const lineHeightUnit = value.lineHeightUnit === 'px' ? 'px' : '%';
  const letterSpacingUnit = value.letterSpacingUnit === '%' ? '%' : 'px';
  return {
    fontSize: bounded(value.fontSize, defaults.fontSize, 12, 120),
    cnWeight: CN_WEIGHTS.map(([w]) => w).reduce((a,b) => Math.abs(a-bounded(value.cnWeight, defaults.cnWeight, 200, 900)) <= Math.abs(b-bounded(value.cnWeight, defaults.cnWeight, 200, 900)) ? a : b),
    enWeight: Math.min(900, Math.max(100, Math.round(bounded(value.enWeight, defaults.enWeight, 100, 900) / 100) * 100)),
    lineHeight: bounded(value.lineHeight, defaults.lineHeight, lineHeightUnit === '%' ? 80 : 8, lineHeightUnit === '%' ? 300 : 300),
    lineHeightUnit,
    letterSpacing: bounded(value.letterSpacing, defaults.letterSpacing, letterSpacingUnit === '%' ? -10 : -3, letterSpacingUnit === '%' ? 50 : 20),
    letterSpacingUnit,
    align: ['left', 'center', 'right'].includes(value.align) ? value.align : defaults.align
  };
}

export function splitScriptRuns(text) {
  return (String(text || '').match(/[\p{Script=Latin}\p{Mark}\u0000-\u007f\u00a0-\u00bf]+|[^\p{Script=Latin}\p{Mark}\u0000-\u007f\u00a0-\u00bf]+/gu) || [])
    .map(text => ({ text, script: /^[\p{Script=Latin}\p{Mark}\u0000-\u007f\u00a0-\u00bf]/u.test(text) ? 'latin' : 'cjk' }));
}

export function cssTypography(value) {
  const style = normalizeTypography(value);
  return { fontSize: `${style.fontSize}px`, lineHeight: style.lineHeightUnit === '%' ? String(style.lineHeight / 100) : `${style.lineHeight}px`, letterSpacing: style.letterSpacingUnit === '%' ? `${style.letterSpacing / 100}em` : `${style.letterSpacing}px`, textAlign: style.align };
}

export function renderTypography(node, text, value) {
  node.classList.add('mixed-typography');
  for (const property of ['fontSize', 'lineHeight', 'letterSpacing', 'textAlign']) node.style[property] = '';
  for (const property of ['--responsive-font-size', '--responsive-line-height', '--responsive-letter-spacing']) node.style.removeProperty(property);
  const style = value ? normalizeTypography(value) : null;
  node.classList.toggle('has-responsive-typography', Boolean(style));
  if (style) {
    Object.assign(node.style, cssTypography(style));
    // The editor stores desktop values. Narrow screens interpolate to a readable minimum.
    const minimum = style.fontSize <= 20 ? Math.max(12, style.fontSize * 8 / 9) : Math.max(20, style.fontSize * 0.75);
    const slope = (style.fontSize - minimum) / (1024 - 390);
    node.style.setProperty('--responsive-font-size', `clamp(${minimum}px, ${minimum - 390 * slope}px + ${slope * 100}vw, ${style.fontSize}px)`);
    node.style.setProperty('--responsive-line-height', String(style.lineHeightUnit === 'px' ? style.lineHeight / style.fontSize : style.lineHeight / 100));
    node.style.setProperty('--responsive-letter-spacing', `${style.letterSpacingUnit === 'px' ? style.letterSpacing / style.fontSize : style.letterSpacing / 100}em`);
  }
  const inheritedWeight = getComputedStyle(node).fontWeight;
  const fragment = document.createDocumentFragment();
  for (const run of splitScriptRuns(text)) {
    const span = document.createElement('span');
    span.className = `type-${run.script}`;
    span.lang = run.script === 'latin' ? 'en' : 'zh-CN';
    span.textContent = run.text;
    span.style.fontWeight = String(style ? (run.script === 'latin' ? style.enWeight : style.cnWeight) : inheritedWeight);
    fragment.append(span);
  }
  node.replaceChildren(fragment);
}
