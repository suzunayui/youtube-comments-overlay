const HEART_COLORS = ["#ffffff", "#ffb3d9", "#ff6b9d", "#ff3b5c", "#ff9999"];
const HEART_CHARS = ["\u2764", "\u2661", "\u{1F496}", "\u{1F497}"];

export function createHearts(container) {
  let heartTimer = null;
  let heartActiveUntil = 0;

  function createHeart() {
    if (!container) return;
    const wrap = document.createElement("div");
    wrap.classList.add("heart-wrap");

    const heart = document.createElement("span");
    heart.classList.add("heart");
    heart.style.color = HEART_COLORS[(Math.random() * HEART_COLORS.length) | 0];
    heart.style.fontSize = 40 + Math.random() * 60 + "px";
    heart.textContent = HEART_CHARS[(Math.random() * HEART_CHARS.length) | 0];

    wrap.style.left = Math.random() * 100 + "vw";
    const duration = 6 + Math.random() * 4;
    wrap.style.animationDuration = duration + "s";
    wrap.style.animationDelay = -Math.random() * duration + "s";

    wrap.appendChild(heart);
    container.appendChild(wrap);

    setTimeout(() => wrap.remove(), (duration + 2) * 1000);
  }

  function triggerBurst() {
    const now = performance.now();
    heartActiveUntil = Math.max(heartActiveUntil, now + 6500);
    if (!heartTimer) {
      heartTimer = setInterval(() => {
        if (performance.now() > heartActiveUntil) {
          clearInterval(heartTimer);
          heartTimer = null;
          return;
        }
        createHeart();
      }, 160);
    }
    for (let i = 0; i < 15; i++) {
      setTimeout(createHeart, i * 120);
    }
  }

  return { trigger: triggerBurst };
}
