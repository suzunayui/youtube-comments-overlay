// chatStore.js
// Simple SQLite helper for storing live chat messages.
const path = require("path");
const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();

let db = null;
let insertStmt = null;
let dbPath = null;

const DEFAULT_LIMIT = 50;

function ensureColorsColumn(callback) {
  // 既存 DB には colors_json が無い可能性があるので PRAGMA で確認してから追加
  db.all("PRAGMA table_info(comments)", (err, rows) => {
    if (err) {
      console.warn("PRAGMA table_info error:", err.message || err);
      callback();
      return;
    }
    const hasColors = rows.some((r) => r.name === "colors_json");
    if (hasColors) {
      callback();
      return;
    }
    db.run("ALTER TABLE comments ADD COLUMN colors_json TEXT", (alterErr) => {
      if (alterErr) {
        console.warn("ALTER TABLE add colors_json error:", alterErr.message || alterErr);
      }
      callback();
    });
  });
}

function initChatStore(baseDir) {
  // Use a writable dir (e.g. Electron's userData) to avoid ASAR issues.
  const dir = baseDir || process.cwd();
  fs.mkdirSync(dir, { recursive: true });
  dbPath = path.join(dir, "comments.db");

  db = new sqlite3.Database(dbPath);
  db.serialize(() => {
    db.run(
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
    ensureColorsColumn(() => {
      insertStmt = db.prepare(
        `INSERT OR IGNORE INTO comments
         (id, video_id, timestamp_ms, timestamp, author, text, kind, amount, amount_text, icon, parts_json, colors_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
    });
  });

  return dbPath;
}

function saveComment(msg) {
  if (!insertStmt || !msg || !msg.id) return;

  const partsJson = JSON.stringify(msg.parts || []);
  const colorsJson = JSON.stringify(msg.colors || null);
  insertStmt.run(
    [
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
      colorsJson,
    ],
    (err) => {
      if (err) {
        console.warn("saveComment sqlite error:", err.message || err);
      }
    }
  );
}

function getRecentComments(limit = DEFAULT_LIMIT) {
  return new Promise((resolve) => {
    if (!db) {
      resolve([]);
      return;
    }
    const lim = Number.isFinite(limit) ? Math.max(1, Math.min(limit, 500)) : DEFAULT_LIMIT;
    const sql = `SELECT id, video_id, timestamp_ms, timestamp, author, text, kind, amount, amount_text, icon, parts_json, colors_json
                 FROM comments
                 ORDER BY timestamp_ms DESC, rowid DESC
                 LIMIT ?`;
    db.all(sql, [lim], (err, rows) => {
      if (err) {
        console.warn("getRecentComments sqlite error:", err.message || err);
        resolve([]);
        return;
      }
      // DBからは新しい順で取得しているので、描画順を自然にするために逆順に戻す
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
    });
  });
}

function closeChatStore() {
  if (insertStmt) {
    insertStmt.finalize();
    insertStmt = null;
  }
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = {
  initChatStore,
  saveComment,
  getRecentComments,
  closeChatStore,
  getDbPath: () => dbPath,
};
