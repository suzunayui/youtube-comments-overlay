const HEART_KEYWORDS = ["\u30cf\u30fc\u30c8", "\u597d\u304d", "\u3059\u304d", "\u5927\u597d\u304d", "heart", "like", "love"];
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
  "nagareboshi",
  "shootingstar"
];
const FIRE_KEYWORDS = ["\u82b1\u706b", "\u306f\u306a\u3073", "hanabi", "firework", "fireworks"];
const SNOW_KEYWORDS = ["\u96ea", "\u3086\u304d", "snow"];

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
