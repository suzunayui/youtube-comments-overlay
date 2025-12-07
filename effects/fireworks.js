const FW_COLORS = ["#ff6b6b", "#ffd93d", "#6bcbff", "#ff9ff3", "#1dd1a1", "#feca57", "#54a0ff"];
const FW_SCALE = 2;

function hexToHsl(hex) {
  const normalized = hex.replace("#", "");
  const expanded = normalized.length === 3 ? normalized.split("").map((c) => c + c).join("") : normalized;
  const r = parseInt(expanded.slice(0, 2), 16) / 255;
  const g = parseInt(expanded.slice(2, 4), 16) / 255;
  const b = parseInt(expanded.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h;
  let s;
  const l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
        break;
    }
    h *= 60;
  }
  return { h, s: s * 100, l: l * 100 };
}

class Rocket {
  constructor(canvas, ctx) {
    const w = canvas.width;
    const h = canvas.height;
    this.canvas = canvas;
    this.ctx = ctx;
    this.x = w * (0.1 + Math.random() * 0.8);
    this.y = h + 10;
    this.vx = (Math.random() - 0.5) * 1.2;
    this.vy = -(6 + Math.random() * 2.5);
    this.targetY = h * (0.18 + Math.random() * 0.25);
    this.color = FW_COLORS[(Math.random() * FW_COLORS.length) | 0];
    this.history = [];
    this.alive = true;
  }
  update(onExplode) {
    this.history.push({ x: this.x, y: this.y });
    if (this.history.length > 12) this.history.shift();
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.08;
    if (this.vy >= -0.5 || this.y <= this.targetY) {
      this.alive = false;
      onExplode(this.x, this.y, this.color);
    }
  }
  draw() {
    const ctx = this.ctx;
    ctx.lineWidth = 2 * FW_SCALE;
    for (let i = 0; i < this.history.length - 1; i++) {
      const p1 = this.history[i];
      const p2 = this.history[i + 1];
      const t = i / this.history.length;
      ctx.strokeStyle = `rgba(255,255,255,${0.2 + t * 0.6})`;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(this.x, this.y, 2.5 * FW_SCALE, 0, Math.PI * 2);
    ctx.fill();
  }
}

class Particle {
  constructor(x, y, color, size, speed, angle, life, sparkle) {
    this.x = x;
    this.y = y;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.friction = 0.985;
    this.gravity = 0.06 + Math.random() * 0.04;
    this.size = size;
    this.life = life;
    this.maxLife = life;
    this.color = color;
    this.sparkle = sparkle;
  }
  update() {
    this.vx *= this.friction;
    this.vy *= this.friction;
    this.vy += this.gravity;
    this.x += this.vx;
    this.y += this.vy;
    this.life--;
  }
  draw(ctx) {
    const t = this.life / this.maxLife;
    if (t <= 0) return;
    let alpha = t;
    if (this.sparkle && this.life % 5 < 2) alpha *= 0.35;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * (0.6 + t), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = alpha * 0.6;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * 2.5 * t, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  get alive() {
    return this.life > 0;
  }
}

export function createFireworks({ canvas, ctx }) {
  let rockets = [];
  let particles = [];

  function burst(x, y, baseColor, count, baseSpeed, scale) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = baseSpeed * (0.5 + Math.random()) * FW_SCALE;
      const size = (1.8 * scale + Math.random() * 1.5 * scale) * FW_SCALE;
      const c = hexToHsl(baseColor);
      const h = (c.h + (Math.random() * 40 - 20) + 360) % 360;
      const s = Math.min(100, c.s + (Math.random() * 20 - 10));
      const l = Math.min(70, c.l + (Math.random() * 10 - 5));
      const color = `hsl(${h},${s}%,${l}%)`;
      const life = 50 + Math.random() * 40;
      const sparkle = Math.random() < 0.7;
      particles.push(new Particle(x, y, color, size, speed, angle, life, sparkle));
    }
  }

  function multiBurst(x, y, baseColor) {
    burst(x, y, baseColor, 70, 3.5, 1.0);
    setTimeout(() => burst(x, y, baseColor, 50, 2.8, 0.7), 140);
    setTimeout(() => burst(x, y, baseColor, 40, 2.2, 0.5), 280);
  }

  function trigger(count = 3) {
    for (let i = 0; i < count; i++) {
      rockets.push(new Rocket(canvas, ctx));
      if (Math.random() < 0.35) rockets.push(new Rocket(canvas, ctx));
    }
  }

  function update() {
    ctx.globalCompositeOperation = "lighter";
    rockets.forEach((r) => r.update(multiBurst));
    rockets = rockets.filter((r) => r.alive);
    rockets.forEach((r) => r.draw());

    particles.forEach((p) => p.update());
    particles = particles.filter((p) => p.alive);
    particles.forEach((p) => p.draw(ctx));
  }

  function resize() {
    rockets = [];
    particles = [];
  }

  return { trigger, update, resize };
}
