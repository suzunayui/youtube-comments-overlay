const SNOW_COUNT = 120;
const SPARKLE_COUNT = 40;
const SNOW_EMOJIS = ["\u2744", "\u26c4", "\u{1F384}", "\u273b", "\u273c", "*"];

function createSnowParticle(x, y) {
  return {
    type: "snow",
    x,
    y,
    r: 2 + Math.random() * 3,
    vy: 0.5 + Math.random() * 1.2,
    vx: -0.4 + Math.random() * 0.8,
    alpha: 0.5 + Math.random() * 0.5,
    twinkleSpeed: 0.002 + Math.random() * 0.003,
    twinkleOffset: Math.random() * Math.PI * 2,
  };
}

function createSparkle(x, y) {
  return {
    type: "sparkle",
    x,
    y,
    r: 1.5 + Math.random() * 2,
    vy: 0.3 + Math.random() * 0.8,
    vx: -0.3 + Math.random() * 0.6,
    alpha: 0.6 + Math.random() * 0.4,
    twinkleSpeed: 0.004 + Math.random() * 0.004,
    twinkleOffset: Math.random() * Math.PI * 2,
  };
}

export function createSnowEffect({ canvas, ctx }) {
  let snowParticles = [];
  let snowInitialized = false;
  let snowActiveUntil = 0;

  function ensureSnowInit() {
    if (snowInitialized) return;
    for (let i = 0; i < SNOW_COUNT; i++) {
      snowParticles.push(createSnowParticle(Math.random() * canvas.width, Math.random() * canvas.height));
    }
    for (let i = 0; i < SPARKLE_COUNT; i++) {
      snowParticles.push(createSparkle(Math.random() * canvas.width, Math.random() * canvas.height));
    }
    snowInitialized = true;
  }

  function drawParticle(p, now) {
    p.y += p.vy;
    p.x += p.vx;
    const tw = 0.5 + 0.5 * Math.sin(now * p.twinkleSpeed + p.twinkleOffset);
    p.x += Math.sin(now * p.twinkleSpeed + p.twinkleOffset) * (p.type === "snow" ? 0.6 : 0.4);
    if (p.y > canvas.height + 20) {
      p.y = -10;
      p.x = Math.random() * canvas.width;
    }
    if (p.x < -20) p.x = canvas.width + 10;
    if (p.x > canvas.width + 20) p.x = -10;

    ctx.save();
    ctx.globalAlpha = p.alpha * tw;
    ctx.fillStyle = "#ffffff";
    if (p.type === "snow") {
      if (Math.random() < 0.4) {
        const emoji = SNOW_EMOJIS[(Math.random() * SNOW_EMOJIS.length) | 0];
        ctx.font = `${p.r * 4}px "Segoe UI Emoji", "Noto Color Emoji", system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowBlur = 8;
        ctx.shadowColor = "rgba(255,255,255,0.9)";
        ctx.fillText(emoji, p.x, p.y);
      } else {
        ctx.shadowBlur = 8;
        ctx.shadowColor = "rgba(255,255,255,0.8)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.shadowBlur = 12;
      ctx.shadowColor = "rgba(255,255,255,1)";
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - p.r);
      ctx.lineTo(p.x + p.r, p.y);
      ctx.lineTo(p.x, p.y + p.r);
      ctx.lineTo(p.x - p.r, p.y);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function activate(durationMs = 9000) {
    snowActiveUntil = Math.max(snowActiveUntil, performance.now() + durationMs);
  }

  function update(now) {
    if (snowActiveUntil <= now) return;
    ensureSnowInit();
    snowParticles.forEach((p) => drawParticle(p, now));
  }

  function resize() {
    snowParticles = [];
    snowInitialized = false;
  }

  return { activate, update, resize };
}
