import { createFireworks } from "./fireworks.js";
import { createSnowEffect } from "./snow.js";
import { createHearts } from "./hearts.js";
import { createStars } from "./stars.js";
import { containsFirework, containsSnow, containsHeart, containsStar, containsExplosion, containsTikuwa, containsSirakaba } from "./keywords.js";
import { createExplosionEffect } from "./explosion.js";
import { createTikuwaEffect } from "./tikuwa.js";
import { createSirakabaEffect } from "./sirakaba.js";

const canvas = document.getElementById("fw-canvas");
const starsCanvas = document.getElementById("stars-canvas");
const heartsLayer = document.getElementById("hearts-layer");
const explosionLayer = document.getElementById("explosion-layer");
const tikuwaCanvas = document.getElementById("tikuwa-canvas");
const sirakabaCanvas = document.getElementById("sirakaba-canvas");
const ctx = canvas.getContext("2d");

const fireworks = createFireworks({ canvas, ctx });
const snow = createSnowEffect({ canvas, ctx });
const hearts = createHearts(heartsLayer);
const stars = createStars(starsCanvas);
const explosion = createExplosionEffect(explosionLayer);
const tikuwa = createTikuwaEffect(tikuwaCanvas);
const sirakaba = createSirakabaEffect(sirakabaCanvas);

const seen = new Set();
let initialized = false;

function resize() {
  const w = window.innerWidth || 1920;
  const h = window.innerHeight || 1080;
  canvas.width = w;
  canvas.height = h;
  fireworks.resize();
  snow.resize();
  stars.resize();
  tikuwa.resize();
  sirakaba.resize();
}

function frame() {
  const now = performance.now();
  ctx.globalCompositeOperation = "source-over";
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  snow.update(now);
  fireworks.update(now);
  requestAnimationFrame(frame);
}

function handleMessage(msg) {
  if (containsFirework(msg)) {
    fireworks.trigger(4);
  }
  if (containsSnow(msg)) {
    snow.activate(9000);
  }
  if (containsStar(msg)) {
    stars.trigger();
  }
  if (containsHeart(msg)) {
    hearts.trigger();
  }
  if (containsExplosion(msg)) {
    explosion.trigger();
  }
  if (containsTikuwa(msg)) {
    tikuwa.trigger();
  }
  if (containsSirakaba(msg)) {
    sirakaba.trigger();
  }
}

async function pollManualTriggers() {
  try {
    const res = await fetch("/trigger-effect/pull");
    const events = await res.json();
    for (const ev of events) {
      switch (ev.type) {
        case "firework":
          fireworks.trigger(4);
          break;
        case "snow":
          snow.activate(9000);
          break;
        case "heart":
          hearts.trigger();
          break;
        case "star":
          stars.trigger();
          break;
        case "explosion":
          explosion.trigger();
          break;
        case "tikuwa":
          tikuwa.trigger();
          break;
        case "sirakaba":
          sirakaba.trigger();
          break;
      }
    }
  } catch (e) {
    console.warn("manual effects poll error", e);
  }
}

async function pollComments() {
  try {
    const res = await fetch("/comments");
    const data = await res.json();
    let sawAny = false;
    for (const msg of data) {
      const id = msg.id || (msg.timestamp_ms + "_" + (msg.author || "") + "_" + (msg.text || ""));
      if (seen.has(id)) continue;
      sawAny = true;
      seen.add(id);

      if (!initialized) continue;
      handleMessage(msg);
    }
    if (!initialized && sawAny) {
      initialized = true;
    }
  } catch (e) {
    console.warn("effects poll error", e);
  }
}

resize();
window.addEventListener("resize", resize);
requestAnimationFrame(frame);
setInterval(pollComments, 500);
setInterval(pollManualTriggers, 500);
