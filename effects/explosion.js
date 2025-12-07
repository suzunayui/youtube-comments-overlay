const STYLE_ID = "explosion-effect-style";

function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
.explosion-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 4;
}
.exp-entity {
  position: absolute;
  pointer-events: none;
  will-change: transform;
}
.exp-boom {
  position: absolute;
  pointer-events: none;
  transform: translate(-50%, -50%) scale(0);
  animation: exp-boom-anim 0.5s ease-out forwards;
}
@keyframes exp-boom-anim {
  0%   { transform: translate(-50%, -50%) scale(0.2); opacity: 1; }
  70%  { transform: translate(-50%, -50%) scale(1.6); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
}
.exp-particle {
  position: absolute;
  border-radius: 50%;
  opacity: 0.9;
  transform: translate(-50%, -50%);
  animation: exp-particle-move 0.7s ease-out forwards;
  pointer-events: none;
}
@keyframes exp-particle-move {
  from { transform: translate(-50%, -50%) translate(0, 0) scale(1); opacity: 1; }
  to   { transform: translate(-50%, -50%) translate(var(--dx), var(--dy)) scale(0.1); opacity: 0; }
}
`;
  document.head.appendChild(style);
}

export function createExplosionEffect(container) {
  if (!container) {
    return { trigger: () => {}, resize: () => {} };
  }

  injectStyle();

  // Left-facing cat family (cat, black cat, tiger, leopard)
  const CAT_EMOJIS = [
    "\uD83D\uDC08", // cat
    "\uD83D\uDC08\u200D\u2B1B", // black cat
    "\uD83D\uDC05", // tiger
    "\uD83D\uDC06" // leopard
  ];
  const BOMB_EMOJI = "\uD83D\uDCA3";
  const BOOM_EMOJI = "\uD83D\uDCA5";
  const CAT_PROBABILITY = 0.2;
  const groundOffset = 100;

  let entities = [];
  let lastTime = performance.now();
  let spawnTimer = null;
  let activeUntil = 0;
  let loopRunning = false;

  function spawnEntity() {
    const el = document.createElement("div");
    el.className = "exp-entity";

    const isBomb = Math.random() > CAT_PROBABILITY;
    const w = window.innerWidth;

    const startX = Math.random() * (w * 1.2) - w * 0.1;
    const startY = -150 - Math.random() * 150;

    const vx = Math.random() * 600 - 300;
    const initialVy = 100 + Math.random() * 250;
    const gravity = 700 + Math.random() * 600;

    const sizeScale = isBomb ? 0.6 + Math.random() * 1.8 : 0.8 + Math.random() * 1.2;
    const fontBase = isBomb ? 144 : 140;
    const fontSize = fontBase * sizeScale;
    el.style.fontSize = fontSize + "px";

    const spinSpeed = isBomb ? Math.random() * 6 - 3 : 0;
    const escapeDir = Math.random() < 0.5 ? "left" : "right";

    el.textContent = isBomb ? BOMB_EMOJI : CAT_EMOJIS[(Math.random() * CAT_EMOJIS.length) | 0];

    entities.push({
      el,
      kind: isBomb ? "bomb" : "cat",
      x: startX,
      y: startY,
      vx,
      vy: initialVy,
      gravity,
      rotation: 0,
      spinSpeed,
      sizeScale,
      removed: false,
      escapeDir,
      escapeMode: false,
    });

    container.appendChild(el);
  }

  function explode(x, y, sizeScale) {
    const boom = document.createElement("div");
    boom.className = "exp-boom";
    boom.textContent = BOOM_EMOJI;

    const explosionSize = 240 * sizeScale;
    boom.style.fontSize = explosionSize + "px";
    boom.style.left = x + "px";
    boom.style.top = y + "px";
    container.appendChild(boom);

    const particleCount = Math.floor(16 * sizeScale + 12);
    for (let i = 0; i < particleCount; i++) {
      const p = document.createElement("div");
      p.className = "exp-particle";

      const angle = Math.random() * Math.PI * 2;
      const dist = (80 + Math.random() * 100) * sizeScale;

      p.style.width = 8 * sizeScale + "px";
      p.style.height = 8 * sizeScale + "px";

      const colors = ["orange", "gold", "yellow", "red", "white"];
      p.style.background = colors[(Math.random() * colors.length) | 0];

      p.style.left = x + "px";
      p.style.top = y + "px";
      p.style.setProperty("--dx", Math.cos(angle) * dist + "px");
      p.style.setProperty("--dy", Math.sin(angle) * dist + "px");

      container.appendChild(p);
      setTimeout(() => p.remove(), 800);
    }

    setTimeout(() => boom.remove(), 600);
  }

  function loop(now) {
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    const h = window.innerHeight;
    const groundY = h - groundOffset;

    for (let i = entities.length - 1; i >= 0; i--) {
      const e = entities[i];
      if (e.removed) continue;

      if (e.kind === "cat" && e.escapeMode) {
        const runSpeed = 400 * e.sizeScale;
        const dir = e.escapeDir === "right" ? 1 : -1;
        e.x += dir * runSpeed * dt;
        e.y = groundY;
        const flip = e.escapeDir === "right" ? -1 : 1;
        e.el.style.transform = `translate(-50%, -50%) scaleX(${flip})`;
        e.el.style.left = e.x + "px";
        e.el.style.top = e.y + "px";
        if (e.x < -200 || e.x > window.innerWidth + 200) {
          e.removed = true;
          e.el.remove();
          entities.splice(i, 1);
        }
        continue;
      }

      e.vy += e.gravity * dt;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.rotation += e.spinSpeed * dt;

      e.el.style.left = e.x + "px";
      e.el.style.top = e.y + "px";
      e.el.style.transform = `translate(-50%, -50%) rotate(${e.rotation}rad)`;

      if (e.kind === "bomb") {
        if (e.y >= groundY) {
          e.removed = true;
          explode(e.x, groundY, e.sizeScale);
          e.el.remove();
          entities.splice(i, 1);
        }
      } else {
        if (e.y >= groundY) {
          e.escapeMode = true;
          e.vx = 0;
          e.vy = 0;
          e.rotation = 0;
        }
        if (e.y > h + 300) {
          e.removed = true;
          e.el.remove();
          entities.splice(i, 1);
        }
      }
    }

    const stillActive = performance.now() < activeUntil;
    if (stillActive || entities.length > 0) {
      requestAnimationFrame(loop);
    } else {
      loopRunning = false;
    }
  }

  function ensureLoop() {
    if (!loopRunning) {
      loopRunning = true;
      lastTime = performance.now();
      requestAnimationFrame(loop);
    }
  }

  function ensureSpawner() {
    if (spawnTimer) return;
    spawnTimer = setInterval(() => {
      if (performance.now() > activeUntil) {
        clearInterval(spawnTimer);
        spawnTimer = null;
        return;
      }
      spawnEntity();
      if (Math.random() < 0.35) {
        setTimeout(spawnEntity, 250);
      }
    }, 1400);
  }

  function trigger(durationMs = 9000) {
    activeUntil = Math.max(activeUntil, performance.now() + durationMs);
    ensureSpawner();
    ensureLoop();
  }

  function resize() {
    // nothing to do; uses window dimensions
  }

  return { trigger, resize };
}
