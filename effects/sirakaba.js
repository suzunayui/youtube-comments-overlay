const SCALE = 0.6;
const TREES_COUNT = 8;
const MAX_PARTICLES = 800;

export function createSirakabaEffect(canvas) {
  const ctx = canvas.getContext("2d", { alpha: true });
  let width = Math.floor((window.innerWidth || 1920) * SCALE);
  let height = Math.floor((window.innerHeight || 1080) * SCALE);
  let dpr = window.devicePixelRatio || 1;

  let trees = [];
  let particles = [];
  let last = 0;
  let loopRunning = false;
  let activeUntil = 0;
  let ready = false;

  const treeImg = new Image();
  treeImg.src = "/sirakaba.png";
  treeImg.onload = () => {
    ready = true;
    initTrees();
  };

  function resize() {
    width = Math.floor((window.innerWidth || 1920) * SCALE);
    height = Math.floor((window.innerHeight || 1080) * SCALE);
    dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function initTrees() {
    trees = [];
    for (let i = 0; i < TREES_COUNT; i++) {
      trees.push(new Tree());
    }
  }

  class Tree {
    constructor() {
      this.reset(true);
    }
    reset(initial = false) {
      this.targetSize = 140 + Math.random() * 220;
      this.targetScale = this.targetSize / 1024;
      this.scale = initial ? this.targetScale * (0.5 + Math.random() * 0.3) : 0.02;
      this.growthSpeed = 0.003 + Math.random() * 0.003;
      this.x = Math.random() * width;
      this.phase = Math.random() * Math.PI * 2;
      this.age = 0;
      this.life = 0;
      this.maxLife = 360 + Math.random() * 360;
    }
    update(dt) {
      this.age += dt;
      this.life += dt;
      if (this.scale < this.targetScale) {
        this.scale += this.growthSpeed * dt;
        if (this.scale > this.targetScale) this.scale = this.targetScale;
      }
      this.rotation = Math.sin(this.age * 0.03 + this.phase) * 0.04;
      if (this.life > this.maxLife) {
        this.reset(false);
      }
      spawnFireForTree(this);
    }
    draw() {
      const w = 1024 * this.scale;
      const h = 1024 * this.scale;
      const baseY = height;
      const topY = baseY - h;
      const cx = this.x;
      const cy = (topY + baseY) / 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(this.rotation);
      ctx.drawImage(treeImg, -w / 2, -h / 2, w, h);
      ctx.restore();
    }
  }

  class Particle {
    constructor(tree) {
      const w = 1024 * tree.scale;
      const h = 1024 * tree.scale;
      const baseY = height;
      const trunkCenterX = tree.x;
      const trunkBottomY = baseY - h * 0.05;
      const trunkTopY = baseY - h * 0.7;
      this.x = trunkCenterX + (Math.random() - 0.5) * w * 0.22;
      this.y = trunkBottomY - Math.random() * (trunkBottomY - trunkTopY);
      this.vx = (Math.random() - 0.5) * 0.4;
      this.vy = -(0.9 + Math.random() * 1.7);
      this.life = 0;
      this.maxLife = 35 + Math.random() * 35;
      this.baseSize = 9 * tree.scale + Math.random() * (22 * tree.scale);
      this.size = this.baseSize;
      this.alpha = 1;
      this.phase = Math.random() * Math.PI * 2;
    }
    update(dt) {
      this.life += dt;
      const flickerX = Math.sin(this.life * 0.4 + this.phase) * (this.size * 0.3);
      this.x += (this.vx + flickerX) * dt;
      this.y += this.vy * dt;
      const t = this.life / this.maxLife;
      if (t < 0.4) {
        this.size = this.baseSize * (1 + t * 0.7);
      } else {
        this.size = this.baseSize * (1.28 - t);
      }
      this.alpha = (1 - t) * 0.9;
      return this.life >= this.maxLife || this.alpha <= 0;
    }
    draw() {
      const segments = 2;
      const segGap = this.size * 0.7;
      for (let i = 0; i < segments; i++) {
        const ratio = 1 - i / segments;
        const localSize = this.size * (0.7 + 0.4 * ratio);
        const yy = this.y - i * segGap;
        const g = ctx.createRadialGradient(this.x, yy, 0, this.x, yy, localSize);
        g.addColorStop(0.0, `rgba(255,255,255,${this.alpha})`);
        g.addColorStop(0.25, `rgba(255,240,180,${this.alpha})`);
        g.addColorStop(0.55, `rgba(255,150,40,${this.alpha})`);
        g.addColorStop(1.0, "rgba(60,0,0,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(this.x, yy, localSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function spawnFireForTree(tree) {
    if (particles.length > MAX_PARTICLES) return;
    const count = 1 + Math.random() * 2;
    for (let i = 0; i < count; i++) {
      particles.push(new Particle(tree));
    }
  }

  function loop(t) {
    const dt = (t - last) / 16.67 || 1;
    last = t;
    const active = performance.now() < activeUntil;
    if (!ready && !active) {
      loopRunning = false;
      return;
    }
    if (!active && particles.length === 0) {
      loopRunning = false;
      ctx.clearRect(0, 0, width, height);
      return;
    }

    ctx.clearRect(0, 0, width, height);

    if (active) {
      for (const tree of trees) {
        tree.update(dt);
        tree.draw();
      }
    } else {
      for (const tree of trees) {
        tree.draw();
      }
    }

    ctx.globalCompositeOperation = "lighter";
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      if (p.update(dt)) {
        particles.splice(i, 1);
      } else {
        p.draw();
      }
    }
    ctx.globalCompositeOperation = "source-over";

    if (loopRunning) requestAnimationFrame(loop);
  }

  function ensureLoop() {
    if (!loopRunning) {
      loopRunning = true;
      last = performance.now();
      requestAnimationFrame(loop);
    }
  }

  function trigger(durationMs = 9000) {
    activeUntil = Math.max(activeUntil, performance.now() + durationMs);
    if (ready && trees.length === 0) initTrees();
    ensureLoop();
  }

  resize();

  return { trigger, resize };
}
