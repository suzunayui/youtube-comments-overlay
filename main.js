// main.js
const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const express = require("express");
const http = require("http");
const { chromium } = require("playwright");

const {
  startLiveChat,
  stopLiveChat,
  getComments,
  resolveVideoId,
} = require("./youtubeChat");

let mainWindow = null;
let currentColors = {
  overlay: {
    fontFamily: "Noto Sans JP",
    colorNormal: "#000000",
    alphaNormal: 100,
    colorText: "#ffffff",
    alphaText: 100,
    colorAuthor: "#ffd8f8",
    alphaAuthor: 100,
    fontSize: 22,
    avatarSize: 40,
    fontBold: true,
    shadowEnabled: true,
    colorShadow: "#000000",
    alphaShadow: 90,
    colorMembership: "#1e7d32",
    alphaMembership: 100
  },
  nico: {
    fontFamily: "Noto Sans JP",
    colorText: "#ffffff",
    alphaText: 100,
    fontSize: 64,
    fontBold: true,
    scrollDuration: 8,
    shadowEnabled: true,
    colorShadow: "#000000",
    alphaShadow: 100
  }
};
const effectTriggers = [];

// ==============================
// 同時接続数の監視（Playwright で watch ページを読む）
// ==============================
let concurrentVideoId = process.env.CONCURRENT_VIDEO_ID || null;
let currentViewers = 0;
let currentLikes = 0;
let concurrentBrowser = null;
let concurrentContext = null;
let concurrentPage = null;
let concurrentLoop = null;
let concurrentStop = false;

async function closeConcurrentBrowser() {
  if (concurrentPage) {
    try {
      await concurrentPage.close();
    } catch (_) {}
    concurrentPage = null;
  }
  if (concurrentContext) {
    try {
      await concurrentContext.close();
    } catch (_) {}
    concurrentContext = null;
  }
  if (concurrentBrowser) {
    try {
      await concurrentBrowser.close();
    } catch (_) {}
    concurrentBrowser = null;
  }
}

function parseConcurrentFromText(str) {
  if (!str) return null;
  const mJa = str.match(/([\d,\.]+)\s*人が視聴中/);
  if (mJa) return parseInt(mJa[1].replace(/[^\d]/g, ""), 10);
  const mEn = str.match(/([\d,\.]+)\s+watching/);
  if (mEn) return parseInt(mEn[1].replace(/[^\d]/g, ""), 10);
  return null;
}

function parseLikesLabel(label) {
  if (!label) return null;
  const m = label.match(/([\d,\.]+)\s*(?:人|likes?)/i);
  if (m) {
    const n = parseInt(m[1].replace(/[^\d]/g, ""), 10);
    if (!Number.isNaN(n)) return n;
  }
  return null;
}

async function readCountsFromPage(page) {
  try {
    return await page.evaluate(() => {
      function parseConcurrent(str) {
        if (!str) return null;
        const mJa = str.match(/([\d,\.]+)\s*人が視聴中/);
        if (mJa) return parseInt(mJa[1].replace(/[^\d]/g, ""), 10);
        const mEn = str.match(/([\d,\.]+)\s+watching/);
        if (mEn) return parseInt(mEn[1].replace(/[^\d]/g, ""), 10);
        return null;
      }
      function parseLikes(str) {
        if (!str) return null;
        const m = str.match(/([\d,\.]+)\s*(?:人|likes?)/i);
        if (m) {
          const n = parseInt(m[1].replace(/[^\d]/g, ""), 10);
          if (!Number.isNaN(n)) return n;
        }
        return null;
      }

      const viewEl = document.querySelector("#view-count");
      const viewStr =
        (viewEl && (viewEl.getAttribute("aria-label") || viewEl.textContent)) ||
        "";
      const viewers = parseConcurrent(viewStr);

      const likeBtn = document.querySelector("like-button-view-model button");
      const likeStr =
        (likeBtn &&
          (likeBtn.getAttribute("aria-label") || likeBtn.textContent)) ||
        "";
      const likes = parseLikes(likeStr);

      return { viewers, likes };
    });
  } catch (_) {
    return { viewers: null, likes: null };
  }
}

async function runConcurrentWatcher(videoId) {
  currentViewers = 0;
  concurrentStop = false;

  try {
    concurrentBrowser = await chromium.launch({
      headless: true,
      args: ["--lang=ja-JP"],
    });
    concurrentContext = await concurrentBrowser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      locale: "ja-JP",
    });
    concurrentPage = await concurrentContext.newPage();

    await concurrentPage.goto(`https://www.youtube.com/watch?v=${videoId}`, {
      waitUntil: "domcontentloaded",
    });

    // 連続で取れなかった場合は一度だけリロードして再試行
    let retries = 0;
    let last = null;
    let lastLikes = null;
    let likesStaleCount = 0;
    while (!concurrentStop && concurrentVideoId === videoId) {
      const { viewers, likes } = await readCountsFromPage(concurrentPage);

      if (typeof viewers === "number" && viewers !== last) {
        last = viewers;
        currentViewers = viewers;
        console.log("同接更新(playwright):", viewers);
        retries = 0;
      }
      if (typeof likes === "number" && likes !== lastLikes) {
        lastLikes = likes;
        currentLikes = likes;
        console.log("高評価(playwright):", likes);
        likesStaleCount = 0;
      } else if (typeof likes === "number") {
        likesStaleCount += 1;
      }

      if (
        typeof viewers !== "number" &&
        typeof likes !== "number" &&
        retries < 2
      ) {
        retries += 1;
        console.warn("視聴数/高評価が取得できず再読込します (retry:", retries, ")");
        await concurrentPage.reload({ waitUntil: "domcontentloaded" });
        await concurrentPage.waitForTimeout(1000);
      } else if (likesStaleCount >= 6) {
        // 高評価がしばらく変わっていない場合、更新が止まっている可能性があるので再読込
        likesStaleCount = 0;
        console.warn("高評価が更新されないため再読込します");
        await concurrentPage.reload({ waitUntil: "domcontentloaded" });
        await concurrentPage.waitForTimeout(1000);
      }

      await concurrentPage.waitForTimeout(10000);
    }
  } catch (e) {
    console.warn("同接ウォッチエラー:", e?.message || e);
  } finally {
    await closeConcurrentBrowser();
    concurrentLoop = null;
  }
}

function startConcurrentWatcher(videoId) {
  if (!videoId) return;

  // すでに同じ動画IDで走っているなら再起動しない
  if (concurrentLoop && concurrentVideoId === videoId) {
    return;
  }

  stopConcurrentWatcher();

  concurrentVideoId = videoId;
  console.log("同接ウォッチ開始(playwright):", videoId);
  concurrentLoop = runConcurrentWatcher(videoId);
}

function stopConcurrentWatcher() {
  concurrentStop = true;
  concurrentVideoId = null;

  if (concurrentLoop) {
    // loop の finally で browser を閉じる
    concurrentLoop.catch(() => {});
  }

  // なるべく早く止めるため即クローズを試みる
  closeConcurrentBrowser();
}

function isWindowAlive() {
  return mainWindow && !mainWindow.isDestroyed();
}

/**
 * オーバーレイ用 HTTP サーバ (http://127.0.0.1:5000/...) を起動
 */
function createOverlayServer() {
  const srv = express();

  srv.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "overlay.html"));
  });

  srv.get("/niconico", (req, res) => {
    res.sendFile(path.join(__dirname, "niconico.html"));
  });

  srv.get("/supers", (req, res) => {
    res.sendFile(path.join(__dirname, "supers.html"));
  });

  srv.get(["/concurrent", "/overlay/concurrent"], (req, res) => {
    res.sendFile(path.join(__dirname, "concurrent.html"));
  });

  srv.get("/effects", (req, res) => {
    res.sendFile(path.join(__dirname, "effects.html"));
  });

  srv.get("/comments", (req, res) => {
    res.json(getComments());
  });

  // エフェクト手動トリガー API
  const triggerRouter = express.Router();
  triggerRouter.use(express.json());
  triggerRouter.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });
  triggerRouter.post("/", (req, res) => {
    const t = (req.body && req.body.type) || "";
    const allowed = new Set(["firework", "snow", "heart", "star"]);
    if (!allowed.has(t)) {
      return res.status(400).json({ ok: false, error: "invalid type" });
    }
    effectTriggers.push({ type: t, at: Date.now() });
    res.json({ ok: true });
  });
  triggerRouter.get("/pull", (req, res) => {
    const out = effectTriggers.splice(0, effectTriggers.length);
    res.json(out);
  });
  srv.use("/trigger-effect", triggerRouter);

  srv.get("/api/concurrent", (req, res) => {
    res.json({
      viewers: currentViewers,
      likes: currentLikes,
      videoId: concurrentVideoId,
    });
  });

  // オーバーレイ設定を取得するエンドポイント
  srv.get("/settings/colors", (req, res) => {
    res.json(currentColors.overlay);
  });

  // ニコニコ風設定を取得するエンドポイント
  srv.get("/settings/nico", (req, res) => {
    res.json(currentColors.nico);
  });

  const server = http.createServer(srv);
  server.listen(5000, "127.0.0.1", () => {
    console.log("Overlay server listening on http://127.0.0.1:5000/");
  });
}

/**
 * OBS にドラッグ & ドロップする用の HTML を自動生成
 * 戻り値: 作成したディレクトリのパス
 */
function createObsLauncherFiles() {
  // ユーザーデータ配下に置く: 例) C:\Users\xxx\AppData\Roaming\[app名]\obs-launchers
  const baseDir = path.join(app.getPath("userData"), "obs-launchers");
  fs.mkdirSync(baseDir, { recursive: true });

  const makeLauncher = (filename, url) => {
    const filePath = path.join(baseDir, filename);
    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>OBS Browser Launcher</title>
<style>
  html, body, iframe {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    background: transparent;
    overflow: hidden;
  }
</style>
</head>
<body>
  <!-- このHTMLファイルを OBS にドラッグ＆ドロップすると -->
  <!-- 中の iframe が ${url} を表示します -->
  <iframe src="${url}" frameborder="0"></iframe>
</body>
</html>
`;
    fs.writeFileSync(filePath, html, "utf8");
    return filePath;
  };

  makeLauncher("overlay-launcher.html", "http://127.0.0.1:5000/");
  makeLauncher("niconico-launcher.html", "http://127.0.0.1:5000/niconico");
  makeLauncher("supers-launcher.html", "http://127.0.0.1:5000/supers");
  makeLauncher("concurrent-launcher.html", "http://127.0.0.1:5000/concurrent");
  makeLauncher("effects-launcher.html", "http://127.0.0.1:5000/effects");

  console.log("📁 OBS launcher files created in:", baseDir);
  return baseDir;
}

/**
 * 設定用ウィンドウ
 */
function createMainWindow(launchersDir) {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 620,
    resizable: true,
    minWidth: 1000,
    minHeight: 540,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "settings.html"));

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // レンダラに「ランチャーフォルダのパス」を通知
  mainWindow.webContents.on("did-finish-load", () => {
    if (isWindowAlive()) {
      mainWindow.webContents.send("launchers:path", launchersDir);
    }
  });
}

// ==============================
// IPC: 開始 / 停止
// ==============================

// チャット開始
ipcMain.on("chat:start", (event, inputStr) => {
  console.log("IPC chat:start", inputStr);

  if (isWindowAlive()) {
    mainWindow.webContents.send("chat:status", "starting");
  }

  startLiveChat(inputStr).catch((e) => {
    console.error("startLiveChat error:", e);
    if (isWindowAlive()) {
      mainWindow.webContents.send(
        "chat:error",
        e?.message || String(e)
      );
      mainWindow.webContents.send("chat:status", "stopped");
    }
  });

  // 同時接続数のウォッチも並行で開始
  resolveVideoId(inputStr)
    .then((videoId) => {
      if (videoId) {
        startConcurrentWatcher(videoId);
      } else {
        console.warn("ライブ配信が見つからず、同接ウォッチを開始できません");
      }
    })
    .catch((e) => {
      console.warn("同接ウォッチ用 videoId 解決エラー:", e?.message || e);
    });
});

// チャット停止
ipcMain.on("chat:stop", () => {
  console.log("IPC chat:stop");
  stopLiveChat();
  stopConcurrentWatcher();

  if (isWindowAlive()) {
    mainWindow.webContents.send("chat:status", "stopped");
  }
});

// ランチャーフォルダを開くボタン用
ipcMain.on("launchers:open", () => {
  const dir = path.join(app.getPath("userData"), "obs-launchers");
  shell.openPath(dir);
});

// カラー設定の更新
ipcMain.on("colors:update", (_event, settings) => {
  if (settings.overlay) {
    currentColors.overlay = settings.overlay;
  }
  if (settings.nico) {
    currentColors.nico = settings.nico;
  }
  console.log("Settings updated:", currentColors);
});

// ==============================
// アプリライフサイクル
// ==============================

app.whenReady().then(() => {
  createOverlayServer();

  // 起動時にランチャーHTMLを生成
  const launchersDir = createObsLauncherFiles();

  // 設定画面を表示
  createMainWindow(launchersDir);

  // 環境変数で動画IDが指定されていれば、同接ウォッチを開始
  if (concurrentVideoId) {
    startConcurrentWatcher(concurrentVideoId);
  }
});

app.on("before-quit", () => {
  stopLiveChat();
  stopConcurrentWatcher();
});

app.on("window-all-closed", () => {
  stopLiveChat();
  stopConcurrentWatcher();
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    const launchersDir = path.join(app.getPath("userData"), "obs-launchers");
    createMainWindow(launchersDir);
  }
});
