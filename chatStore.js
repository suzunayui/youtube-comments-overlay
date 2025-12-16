// chatStore.js
// Simple SQLite helper for storing live chat messages (better-sqlite3).
const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

let db = null;
let insertStmt = null;
let dbPath = null;

const DEFAULT_LIMIT = 50;

function ensureColorsColumn() {
  try {
    const rows = db.prepare("PRAGMA table_info(comments)").all();
    const hasColors = rows.some((r) => r.name === "colors_json");
    if (!hasColors) {
      db.prepare("ALTER TABLE comments ADD COLUMN colors_json TEXT").run();
    }
  } catch (err) {
    console.warn("ensureColorsColumn error:", err.message || err);
  }
}

function ensureIconColumn() {
  try {
    const rows = db.prepare("PRAGMA table_info(comments)").all();
    const hasIcon = rows.some((r) => r.name === "icon");
    if (!hasIcon) {
      db.prepare("ALTER TABLE comments ADD COLUMN icon TEXT").run();
    }
  } catch (err) {
    console.warn("ensureIconColumn error:", err.message || err);
  }
}

function ensureBossStateTable() {
  try {
    if (!db) return;
    db.exec(
      `CREATE TABLE IF NOT EXISTS boss_state (
        id TEXT PRIMARY KEY,
        level INTEGER,
        hp INTEGER,
        max_hp INTEGER,
        updated_ms INTEGER
      )`
    );
  } catch (err) {
    console.warn("ensureBossStateTable error:", err.message || err);
  }
}

function initChatStore(baseDir) {
  // Use a writable dir (e.g. Electron's userData) to avoid ASAR issues.
  const dir = baseDir || process.cwd();
  fs.mkdirSync(dir, { recursive: true });
  dbPath = path.join(dir, "comments.db");

  db = new Database(dbPath);
  try {
    db.pragma("journal_mode = WAL");
  } catch (_) {}

  db.exec(
    `CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      video_id TEXT,
      timestamp_ms INTEGER,
      timestamp TEXT,
      author TEXT,
      text TEXT,
      kind TEXT,
      amount INTEGER,
      amount_text TEXT,
      icon TEXT,
      parts_json TEXT,
      colors_json TEXT
    )`
  );

  ensureIconColumn();
  ensureColorsColumn();
  ensureBossStateTable();
  insertStmt = db.prepare(
    `INSERT OR IGNORE INTO comments
     (id, video_id, timestamp_ms, timestamp, author, text, kind, amount, amount_text, icon, parts_json, colors_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  return dbPath;
}

function clampInt(v, min, max, def) {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function calcBossMaxHp(base, factor, level) {
  const lv = Math.max(1, Math.trunc(Number(level) || 1));
  const pow = Math.pow(Number(factor) || 1, lv - 1);
  // Guard against floating point edge cases around integer boundaries.
  return Math.max(100, Math.floor(base * pow + 1e-9));
}

function getBossState({ baseHp = 100, scale = 1.1, id = "default" } = {}) {
  return new Promise((resolve) => {
    if (!db) {
      resolve(null);
      return;
    }
    const base = clampInt(baseHp, 100, 999999999, 100);
    const s = Number(scale);
    const factor = Number.isFinite(s) && s > 1 ? s : 1.1;
    try {
      const row = db
        .prepare("SELECT id, level, hp, max_hp, updated_ms FROM boss_state WHERE id = ?")
        .get(id);
      if (row) {
        const level = row.level || 1;
        const expectedMax = calcBossMaxHp(base, factor, level);
        const storedMax = row.max_hp ?? expectedMax;
        let hp = row.hp ?? expectedMax;
        if (storedMax !== expectedMax) {
          // If boss was "full" under previous settings, keep it full after scaling change.
          if (hp === storedMax) hp = expectedMax;
        }
        hp = Math.max(0, Math.min(expectedMax, hp));

        // Keep DB consistent with the requested baseHp/scale.
        if ((row.max_hp ?? null) !== expectedMax || (row.hp ?? null) !== hp) {
          const now = Date.now();
          db.prepare(
            `INSERT INTO boss_state (id, level, hp, max_hp, updated_ms)
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
               level=excluded.level,
               hp=excluded.hp,
               max_hp=excluded.max_hp,
               updated_ms=excluded.updated_ms`
          ).run(id, level, hp, expectedMax, now);
          resolve({ id: row.id, level, hp, maxHp: expectedMax, updatedMs: now, scale: factor });
          return;
        }

        resolve({ id: row.id, level, hp, maxHp: expectedMax, updatedMs: row.updated_ms ?? null, scale: factor });
        return;
      }
      const now = Date.now();
      db.prepare(
        "INSERT INTO boss_state (id, level, hp, max_hp, updated_ms) VALUES (?, ?, ?, ?, ?)"
      ).run(id, 1, base, base, now);
      resolve({
        id,
        level: 1,
        hp: base,
        maxHp: base,
        updatedMs: now,
        scale: factor,
      });
    } catch (err) {
      console.warn("getBossState error:", err.message || err);
      resolve(null);
    }
  });
}

function applyBossHit({ damage, baseHp = 100, scale = 1.1, id = "default" } = {}) {
  return new Promise((resolve) => {
    if (!db) {
      resolve(null);
      return;
    }
    const dmg = clampInt(damage, 0, 999999999, 0);
    const base = clampInt(baseHp, 100, 999999999, 100);
    const s = Number(scale);
    const factor = Number.isFinite(s) && s > 1 ? s : 1.1;

    try {
      const tx = db.transaction(() => {
        const row = db
          .prepare("SELECT id, level, hp, max_hp FROM boss_state WHERE id = ?")
          .get(id);
        let level = row?.level || 1;
        const expectedMax = calcBossMaxHp(base, factor, level);
        const storedMax = row?.max_hp ?? expectedMax;
        let maxHp = expectedMax;
        let hp = row?.hp ?? maxHp;
        if (storedMax !== expectedMax) {
          if (hp === storedMax) hp = expectedMax;
        }
        hp = Math.max(0, Math.min(maxHp, hp));

        hp = Math.max(0, hp - dmg);
        let killed = false;
        if (hp <= 0) {
          killed = true;
          level = level + 1;
          maxHp = calcBossMaxHp(base, factor, level);
          hp = maxHp;
        }

        const now = Date.now();
        db.prepare(
          `INSERT INTO boss_state (id, level, hp, max_hp, updated_ms)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             level=excluded.level,
             hp=excluded.hp,
             max_hp=excluded.max_hp,
             updated_ms=excluded.updated_ms`
        ).run(id, level, hp, maxHp, now);

        return { id, level, hp, maxHp, updatedMs: now, killed, scale: factor };
      });

      resolve(tx());
    } catch (err) {
      console.warn("applyBossHit error:", err.message || err);
      resolve(null);
    }
  });
}

function resetBossState({ baseHp = 100, id = "default" } = {}) {
  return new Promise((resolve) => {
    if (!db) {
      resolve(null);
      return;
    }
    const base = clampInt(baseHp, 100, 999999999, 100);
    try {
      const now = Date.now();
      db.prepare(
        `INSERT INTO boss_state (id, level, hp, max_hp, updated_ms)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           level=excluded.level,
           hp=excluded.hp,
           max_hp=excluded.max_hp,
           updated_ms=excluded.updated_ms`
      ).run(id, 1, base, base, now);
      resolve({ id, level: 1, hp: base, maxHp: base, updatedMs: now });
    } catch (err) {
      console.warn("resetBossState error:", err.message || err);
      resolve(null);
    }
  });
}

function saveComment(msg) {
  if (!insertStmt || !msg || !msg.id) return;

  const partsJson = JSON.stringify(msg.parts || []);
  const colorsJson = JSON.stringify(msg.colors || null);
  try {
    insertStmt.run(
      msg.id,
      msg.video_id || null,
      msg.timestamp_ms ?? null,
      msg.timestamp || null,
      msg.author || null,
      msg.text || null,
      msg.kind || null,
      msg.amount ?? null,
      msg.amount_text || null,
      msg.icon || null,
      partsJson,
      colorsJson
    );
  } catch (err) {
    console.warn("saveComment sqlite error:", err.message || err);
  }
}

function getRecentComments(limit = DEFAULT_LIMIT) {
  return new Promise((resolve) => {
    if (!db) {
      resolve([]);
      return;
    }
    try {
      const lim = Number.isFinite(limit) ? Math.max(1, Math.min(limit, 500)) : DEFAULT_LIMIT;
      const sql = `SELECT id, video_id, timestamp_ms, timestamp, author, text, kind, amount, amount_text, icon, parts_json, colors_json
                   FROM comments
                   ORDER BY timestamp_ms DESC, rowid DESC
                   LIMIT ?`;
      const rows = db.prepare(sql).all(lim);
      const result = rows.reverse().map((r) => {
        let parts = [];
        let colors = null;
        try {
          parts = r.parts_json ? JSON.parse(r.parts_json) : [];
        } catch (_) {
          parts = [];
        }
        try {
          colors = r.colors_json ? JSON.parse(r.colors_json) : null;
        } catch (_) {
          colors = null;
        }
        return {
          id: r.id,
          video_id: r.video_id,
          timestamp_ms: r.timestamp_ms,
          timestamp: r.timestamp,
          author: r.author,
          text: r.text,
          kind: r.kind,
          amount: r.amount,
          amount_text: r.amount_text,
          icon: r.icon,
          colors,
          parts,
        };
      });
      resolve(result);
    } catch (err) {
      console.warn("getRecentComments sqlite error:", err.message || err);
      resolve([]);
    }
  });
}

function closeChatStore() {
  if (db) {
    try {
      db.close();
    } catch (_) {}
    db = null;
  }
  insertStmt = null;
}

module.exports = {
  initChatStore,
  saveComment,
  getRecentComments,
  getBossState,
  applyBossHit,
  resetBossState,
  closeChatStore,
  getDbPath: () => dbPath,
};
