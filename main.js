// main.js
const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const express = require("express");
const http = require("http");

const {
  startLiveChat,
  stopLiveChat,
  getComments,
} = require("./youtubeChat");

let mainWindow = null;

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

  srv.get("/comments", (req, res) => {
    res.json(getComments());
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

  console.log("📁 OBS launcher files created in:", baseDir);
  return baseDir;
}

/**
 * 設定用ウィンドウ
 */
function createMainWindow(launchersDir) {
  mainWindow = new BrowserWindow({
    width: 480,
    height: 380,
    resizable: false,
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
});

// チャット停止
ipcMain.on("chat:stop", () => {
  console.log("IPC chat:stop");
  stopLiveChat();

  if (isWindowAlive()) {
    mainWindow.webContents.send("chat:status", "stopped");
  }
});

// ランチャーフォルダを開くボタン用
ipcMain.on("launchers:open", () => {
  const dir = path.join(app.getPath("userData"), "obs-launchers");
  shell.openPath(dir);
});

// ==============================
// アプリライフサイクル
// ==============================

app.whenReady().then(() => {
  createOverlayServer();

  // 起動時にランチャーHTMLを生成
  const launchersDir = createObsLauncherFiles();

  // フォルダを自動で開いて「ドラッグしてね！」状態にする
  shell.openPath(launchersDir);

  // 設定画面を表示
  createMainWindow(launchersDir);
});

app.on("before-quit", () => {
  stopLiveChat();
});

app.on("window-all-closed", () => {
  stopLiveChat();
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
