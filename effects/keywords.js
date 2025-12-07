// Keyword lists (Japanese phrases are escaped as \u sequences; comments describe their meaning).
// HEART: Japanese for heart/like/love + English heart/like/love
const HEART_KEYWORDS = ["\u30cf\u30fc\u30c8", "\u597d\u304d", "\u3059\u304d", "\u5927\u597d\u304d", "heart", "like", "love"];

// STAR: Japanese for star / shooting star, star symbols, emoji, and English variants
const STAR_KEYWORDS = [
  "\u661f",
  "\u6d41\u308c\u661f",
  "\u306a\u304c\u308c\u307c\u3057",
  "\u307b\u3057",
  "\u2606",
  "\u2605",
  "\u2b50",
  "\u272d",
  "\u272f",
  "\u2729",
  "\ud83c\udf1f",
  "star",
  "stars",
  "shooting star",
  "shooting-star",
  "shooting stars",
  "shootingstars",
  "meteor",
  "meteor shower",
  "hoshi",
  "nagareboshi", // romaji
  "shootingstar"
];

// FIRE: Japanese hanabi/fireworks + English firework(s)
const FIRE_KEYWORDS = ["\u82b1\u706b", "\u306f\u306a\u3073", "hanabi", "firework", "fireworks"];

// SNOW: Japanese for snow + English snow
const SNOW_KEYWORDS = ["\u96ea", "\u3086\u304d", "snow"];

// EXPLOSION: Japanese for explosion/bomb (kanji, hiragana, katakana) + emoji + English
const EXPLOSION_KEYWORDS = [
  "\u7206\u767a", // bakuhatsu / explosion
  "\u7206\u5f3e", // bakudan / bomb
  "\u3070\u304f\u306f\u3064", // "bakuhatsu" in hiragana
  "\u3070\u304f\u3060\u3093", // "bakudan" in hiragana
  "\u30dc\u30e0", // bom (katakana)
  "\u30dc\u30f3\u30d0\u30fc", // bonba / bomber
  "\ud83d\udca3",
  "\ud83d\udca5",
  "bomb",
  "boom",
  "kaboom",
  "explosion",
  "explode",
  "detonate"
];

// TIKUWA: Japanese for chikuwa / iron dumbbell + English
const TIKUWA_KEYWORDS = [
  "\u3061\u304f\u308f", // chikuwa (hiragana)
  "\u30c1\u30af\u30ef", // chikuwa (katakana)
  "\u30c1\u30af\u30ef\u30fc", // chikuwa long
  "\u9244\u30a2\u30ec\u30a4", // tetsu arei (iron dumbbell)
  "\u9244\u963f\u30ec\u30a4", // common misspelling
  "\u9244\u963f\u30ec\u30a4\u30e4", // variation
  "chikuwa",
  "tikuw",
  "tikuwa",
  "iron dumbbell",
  "tetsu arei",
  "tetsuarei"
];

export function extractText(msg) {
  if (!msg) return "";
  if (Array.isArray(msg.parts) && msg.parts.length > 0) {
    return msg.parts.filter((p) => p.type === "text").map((p) => p.text || "").join(" ");
  }
  return msg.text || "";
}

export function containsFirework(msg) {
  const t = extractText(msg).toLowerCase();
  if (!t) return false;
  return FIRE_KEYWORDS.some((k) => t.includes(k));
}

export function containsSnow(msg) {
  const t = extractText(msg).toLowerCase();
  if (!t) return false;
  return SNOW_KEYWORDS.some((k) => t.includes(k));
}

export function containsHeart(msg) {
  const t = extractText(msg).toLowerCase();
  if (!t) return false;
  return HEART_KEYWORDS.some((k) => t.includes(k));
}

export function containsStar(msg) {
  const t = extractText(msg).toLowerCase();
  if (!t) return false;
  return STAR_KEYWORDS.some((k) => t.includes(k));
}

export function containsExplosion(msg) {
  const t = extractText(msg).toLowerCase();
  if (!t) return false;
  return EXPLOSION_KEYWORDS.some((k) => t.includes(k));
}

export function containsTikuwa(msg) {
  const t = extractText(msg).toLowerCase();
  if (!t) return false;
  return TIKUWA_KEYWORDS.some((k) => t.includes(k));
}
