const STAR_SPAWN_INTERVAL = 120;
const STAR_GLOW_COLORS = ["#ff3bff", "#ff9bff", "#ff6b6b", "#ffcc00", "#ffee00", "#99ff66", "#66ddff", "#66aaff", "#cc99ff", "#ff6699", "#ff8844", "#ffb347", "#ffffff"];
const STAR_GLYPHS = ["\u2b50", "\u{1F31F}", "\u2726", "\u2727", "\u2729", "\u272a"];

function starRand(min, max) {
  return Math.random() * (max - min) + min;
}

function starPick(arr) {
  return arr[(Math.random() * arr.length) | 0];
}

export function createStars(canvas) {
  const ctx = canvas.getContext("2d");
  let starWidth = 1920;
  let starHeight = 1080;
  let shootingStars = [];
  let starParticles = [];
  let starActiveUntil = 0;
  let starLastSpawn = 0;
  let starLastFrame = 0;
  let starLoopRunning = false;

  function resize() {
    if (!ctx) return;
    const w = window.innerWidth || 1920;
    const h = window.innerHeight || 1080;
    const dpr = window.devicePixelRatio || 1;
    starWidth = w;
    starHeight = h;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function spawnShootingStar() {
    const startX = starRand(starWidth * 0.1, starWidth + 400);
    const startY = starRand(-starHeight * 0.3, starHeight * 1);

    const angleDeg = 135 + starRand(-10, 10);
    const angle = (angleDeg * Math.PI) / 180;

    const speed = starRand(600, 1200);
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;

    const len = starRand(80, 200);
    const color = starPick(STAR_GLOW_COLORS);
    const life = starRand(1.2, 2.2);
    const size = starRand(48, 144);
    const spinSpeed = starRand(-2, 2);

    shootingStars.push({
      x: startX,
      y: startY,
      vx,
      vy,
      length: len,
      color,
      life,
      age: 0,
      glyph: starPick(STAR_GLYPHS),
      size,
      spin: 0,
      spinSpeed,
    });
  }

  function spawnStarParticles(x, y, baseColor) {
    const count = Math.floor(starRand(6, 14));
    for (let i = 0; i < count; i++) {
      const angle = starRand(0, Math.PI * 2);
      const speed = starRand(20, 160);
      starParticles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: starRand(1, 4),
        life: starRand(0.3, 0.9),
        age: 0,
        color: baseColor,
      });
    }
  }

  function drawShootingStar(s) {
    const angle = Math.atan2(s.vy, s.vx);
    const tailX = s.x - Math.cos(angle) * s.length;
    const tailY = s.y - Math.sin(angle) * s.length;

    const grad = ctx.createLinearGradient(s.x, s.y, tailX, tailY);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.2, s.color);
    grad.addColorStop(1, "rgba(255,255,255,0)");

    ctx.lineWidth = 2.8;
    ctx.strokeStyle = grad;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(tailX, tailY);
    ctx.stroke();

    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.spin);
    ctx.font = `${s.size}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = s.color;
    ctx.shadowBlur = 30;
    ctx.fillStyle = "#fff";
    ctx.fillText(s.glyph, 0, 0);
    ctx.restore();
  }

  function drawStarParticle(p) {
    const alpha = 1 - p.age / p.life;
    if (alpha <= 0) return;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function starLoop(now) {
    const dt = (now - starLastFrame) / 1000;
    starLastFrame = now;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = "lighter";

    if (now < starActiveUntil && now - starLastSpawn > STAR_SPAWN_INTERVAL) {
      spawnShootingStar();
      if (Math.random() < 0.35) spawnShootingStar();
      starLastSpawn = now;
    }

    for (let i = shootingStars.length - 1; i >= 0; i--) {
      const s = shootingStars[i];
      s.age += dt;
      if (s.age > s.life) {
        shootingStars.splice(i, 1);
        continue;
      }
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.spin += s.spinSpeed * dt;

      if (Math.random() < 0.6) {
        spawnStarParticles(s.x, s.y, s.color);
      }

      drawShootingStar(s);
    }

    for (let i = starParticles.length - 1; i >= 0; i--) {
      const p = starParticles[i];
      p.age += dt;
      if (p.age > p.life) {
        starParticles.splice(i, 1);
        continue;
      }
      p.vx *= 0.98;
      p.vy = p.vy * 0.98 + 5 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      drawStarParticle(p);
    }

    ctx.globalCompositeOperation = "source-over";

    if (now < starActiveUntil || shootingStars.length || starParticles.length) {
      requestAnimationFrame(starLoop);
    } else {
      starLoopRunning = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  function trigger() {
    if (!ctx) return;
    const now = performance.now();
    starActiveUntil = Math.max(starActiveUntil, now + 9000);
    if (!starLoopRunning) {
      starLoopRunning = true;
      starLastFrame = now;
      starLastSpawn = now;
      requestAnimationFrame(starLoop);
    }
  }

  return { trigger, resize };
}
