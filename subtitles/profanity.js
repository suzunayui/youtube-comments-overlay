function maskProfanity(text) {
  return String(text ?? '')
    .replace(/(?<![a-z0-9_])(?:mother)?fuck(?:ing|ed|ers?|s)?(?![a-z0-9_])/gi,
      word => word.replace(/uc/gi, '**'))
    .replace(/ファック/g, 'フ＊＊ク');
}
function displaySubtitle(subtitle, enabled = true) {
  if (!subtitle) return null;
  return {...subtitle, ja:enabled ? maskProfanity(subtitle.ja) : subtitle.ja,
    en:enabled ? maskProfanity(subtitle.en) : subtitle.en};
}
module.exports = {maskProfanity, displaySubtitle};
