const DEFAULTS = {fontSize: 46, englishSize: 32, color: '#ffffff', englishColor: '#ffffff', duration: 10, maskProfanity: true};
function normalizeStyle(value = {}) {
  const number = (v, fallback, min, max) => Number.isFinite(Number(v)) ? Math.min(max, Math.max(min, Number(v))) : fallback;
  const color = (v, fallback) => /^#[0-9a-f]{6}$/i.test(v) ? v : fallback;
  return {fontSize: number(value.fontSize, 46, 16, 100), englishSize: number(value.englishSize, 32, 12, 80), duration: number(value.duration, 10, 2, 60), color: color(value.color, '#ffffff'), englishColor: color(value.englishColor, '#ffffff'), maskProfanity:value.maskProfanity !== false};
}
module.exports = {DEFAULTS, normalizeStyle};
