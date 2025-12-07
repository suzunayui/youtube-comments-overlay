export function createTikuwaEffect(canvas) {
  const ctx = canvas.getContext("2d");
  let width = window.innerWidth;
  let height = window.innerHeight;
  let dpr = window.devicePixelRatio || 1;

  const items = [];
  const SPAWN_INTERVAL = 260;
  let lastSpawn = 0;
  let lastTime = performance.now();
  let activeUntil = 0;
  let loopRunning = false;

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  resize();

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function spawnItem() {
    const type = Math.random() < 0.5 ? "iron" : "chikuwa";
    const size = rand(28, 52) * 2;
    const x = rand(size, width - size);
    const y = -size - rand(0, 100);
    const vy = rand(90, 200);
    const wiggleAmp = rand(10, 30);
    const wiggleSpeed = rand(0.8, 1.8);
    const phase = rand(0, Math.PI * 2);

    items.push({
      type,
      baseX: x,
      x,
      y,
      size,
      vy,
      wiggleAmp,
      wiggleSpeed,
      phase,
      age: 0,
    });
  }

  function drawIron(x, y, size) {
    const half = size / 2;
    const barW = size * 1.2;
    const barH = size * 0.35;

    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "#555";
    ctx.beginPath();
    ctx.roundRect(-barW / 2, -barH / 2, barW, barH, barH / 2);
    ctx.fill();

    ctx.fillStyle = "#777";
    ctx.beginPath();
    ctx.arc(-barW / 2, 0, half * 0.9, 0, Math.PI * 2);
    ctx.arc(barW / 2, 0, half * 0.9, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = `${half * 1.1}px "Yu Gothic", "Meiryo", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#eee";
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 4;
    ctx.fillText("\u9244", 0, 0);

    ctx.restore();
  }

  function drawChikuwa(x, y, size) {
    const rOuter = size * 0.55;
    const rInner = size * 0.25;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin((x + y) * 0.01) * 0.2);

    ctx.fillStyle = "#f4c57b";
    ctx.beginPath();
    ctx.arc(-size * 0.4, 0, rOuter, 0, Math.PI * 2);
    ctx.arc(size * 0.4, 0, rOuter, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#c06a24";
    ctx.beginPath();
    ctx.arc(-size * 0.4, 0, rOuter * 0.65, -Math.PI / 2, Math.PI / 2);
    ctx.arc(size * 0.4, 0, rOuter * 0.65, Math.PI / 2, -Math.PI / 2, true);
    ctx.fill();

    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(-size * 0.4, 0, rInner, 0, Math.PI * 2);
    ctx.arc(size * 0.4, 0, rInner, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";

    ctx.font = `${size * 0.7}px "Yu Gothic", "Meiryo", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#fff7dd";
    ctx.shadowColor = "rgba(0,0,0,0.7)";
    ctx.shadowBlur = 4;
    ctx.fillText("\u7a81", 0, 1);

    ctx.restore();
  }

  function loop(now) {
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    ctx.clearRect(0, 0, width, height);

    if (now - lastSpawn > SPAWN_INTERVAL && items.length < 80 && now < activeUntil) {
      spawnItem();
      lastSpawn = now;
    }

    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      it.age += dt;
      it.y += it.vy * dt;
      const wiggle = Math.sin(it.age * it.wiggleSpeed + it.phase) * it.wiggleAmp;
      it.x = it.baseX + wiggle;

      if (it.type === "iron") {
        drawIron(it.x, it.y, it.size);
      } else {
        drawChikuwa(it.x, it.y, it.size);
      }

      if (it.y - it.size > height + 50) {
        items.splice(i, 1);
      }
    }

    if (items.length > 0 || performance.now() < activeUntil) {
      requestAnimationFrame(loop);
    } else {
      loopRunning = false;
    }
  }

  function trigger(durationMs = 9000) {
    activeUntil = Math.max(activeUntil, performance.now() + durationMs);
    lastSpawn = performance.now();
    if (!loopRunning) {
      loopRunning = true;
      lastTime = performance.now();
      requestAnimationFrame(loop);
    }
  }

  return { trigger, resize };
}
