import { app, BrowserWindow, shell } from "electron";
const { dialog, Menu, MenuItem } = require("electron");
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import started from "electron-squirrel-startup";
const ipcMain = require("electron").ipcMain;
const childProcess = require("child_process");
const PLATFORM = process.platform;

function runGit(args, cwd) {
  const result = childProcess.spawnSync("git", args, { cwd, encoding: "utf8" });
  if (result.error) throw result.error;
  if (result.status === 1 && result.stdout.toLowerCase().indexOf("conflict" > -1)) throw new Error(result.stderr || `git merge failed: merge conflict`);
  if (result.status !== 0) throw new Error(result.stderr || `git command failed: ${args.join(" ")}`);
  return result.stdout;
}

function runGitAsync(args, cwd) {
  return new Promise((resolve, reject) => {
    const proc = childProcess.spawn("git", args, { cwd, encoding: "utf8" });
    let stdout = "", stderr = "";
    proc.stdout.on("data", d => stdout += d);
    proc.stderr.on("data", d => stderr += d);
    proc.on("close", code => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(stderr.trim() || `git command failed: ${args.join(" ")}`));
    });
    proc.on("error", reject);
  });
}

function gitPath(pathStr) {
  return pathStr.replace(/\\/g, "/");
}

function isWin() { return PLATFORM === "win32"; }
function isMac() { return PLATFORM === "darwin"; }
function isLinux() { return PLATFORM === "linux"; }

function nodeExec() {
  const exePath = process.execPath;
  if (isWin()) return `"${exePath}"`;
  return exePath;
}

function writeTempScript(name, content) {
  const scriptPath = path.join(os.tmpdir(), name);
  fs.writeFileSync(scriptPath, content, "utf8");
  if (!isWin()) fs.chmodSync(scriptPath, 0o755);
  return scriptPath;
}

let win = null;
let splash = null;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createSplash = () => {
  splash = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    resizable: false,
    show: false,
    center: true,
    backgroundColor: '#0d1117',
    webPreferences: {
      preload: SPLASH_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
  });
  splash.loadURL(SPLASH_WINDOW_WEBPACK_ENTRY);
  splash.once('ready-to-show', () => splash.show());
};

const createWindow = () => {
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, "icon.png")
    : path.join(app.getAppPath(), "src", "assets", "icon.png");
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: iconPath,
    show: false,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
    autoHideMenuBar: true,
  });

  // and load the index.html of the app.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  mainWindow.once('ready-to-show', () => {
    if (splash) {
      splash.close();
      splash = null;
    }
    mainWindow.show();
  });

  mainWindow.webContents.once("did-finish-load", () => {
    setTimeout(async () => {
      try {
        const { checkForUpdates } = require("./updater");
        const info = await checkForUpdates();
        if (info.hasUpdate) {
          mainWindow.webContents.send("update-available", info);
        }
      } catch (e) { /* ignore network/API failures on startup */ }
    }, 4000);
  });

  // Open the DevTools only in development mode.
  if (!app.isPackaged) {
    // mainWindow.webContents.openDevTools();
  }
  win = mainWindow;

  mainWindow.webContents.on("context-menu", (event, params) => {
    if (app.isPackaged) return;
    const menu = new Menu();
    menu.append(new MenuItem({
      label: "Inspect Element",
      click: () => mainWindow.webContents.inspectElement(params.x, params.y),
    }));
    menu.popup();
  });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createSplash();
  createWindow();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

ipcMain.handle("test-invoke", function (event, arg) {
  return { blink: 182 };
});

ipcMain.on("test-send", function (event, arg) {
  console.log(event, arg);
});

ipcMain.on("open-dev-tools", function (event, arg) {
  win.webContents.openDevTools();
});

// setInterval(() => {
//   if (win) {
//     win.webContents.send("test-receive", { information: "The information has been sended!" });
//   }
// }, 1000);

ipcMain.handle("select-directory", function (event, arg) {
  return dialog.showOpenDialog({ properties: ["openDirectory"] });
});

ipcMain.handle("get-repository-commits", async (event, directory, topoOrder, allCommits, limit) => {
  if (!topoOrder) topoOrder = false;
  if (!allCommits) allCommits = false;
  let extraRefs = [];
  if (allCommits) {
    try {
      const stashList = runGit(["stash", "list", "--format=%gd"], directory);
      extraRefs = stashList.trim().split("\n").filter(Boolean);
    } catch (e) { }
  }
  const args = [
    "log",
    ...(allCommits ? ["--all"] : []),
    ...extraRefs,
    ...(topoOrder ? ["--topo-order"] : []),
    ...(limit ? ["-n", String(limit)] : []),
    `--pretty=format:%h%n%p%n%an%n%ad%n%s%n%D%x00`,
  ];
  return await runGitAsync(args, directory);
});

ipcMain.handle("get-branches", (event, directory) => {
  return runGit(["branch", "--list", "--format=%(refname:short)"], directory).trim().split("\n").filter(Boolean);
});

ipcMain.handle("get-remote-branches", (event, directory) => {
  return runGit(["branch", "-r", "--list", "--format=%(refname:short)"], directory).trim().split("\n").filter(Boolean);
});

ipcMain.handle("get-tags", (event, directory) => {
  return runGit(["tag", "--list", "--format=%(refname:short)"], directory).trim().split("\n").filter(Boolean);
});

ipcMain.handle("get-stash-list", (event, directory) => {
  return runGit(["stash", "list", "--format=%gd||%gs"], directory).trim().split("\n").filter(Boolean).map(line => {
    const [id, ...msg] = line.split("||");
    return { id, message: msg.join("||") };
  });
});

ipcMain.handle("get-current-branch", (event, directory) => {
  try {
    return runGit(["rev-parse", "--abbrev-ref", "HEAD"], directory).trim();
  } catch {
    return "";
  }
});

ipcMain.handle("get-ahead-behind", (event, directory) => {
  let ahead = 0, behind = 0;
  try {
    const out = runGit(["rev-list", "--left-right", "--count", "HEAD...@{upstream}"], directory);
    const parts = out.trim().split("\t");
    ahead = parseInt(parts[0], 10) || 0;
    behind = parseInt(parts[1], 10) || 0;
  } catch (e) { /* no upstream configured */ }
  return { ahead, behind };
});

ipcMain.handle("get-branches-ahead-behind", (event, directory) => {
  try {
    const output = runGit(["for-each-ref", "--format=%(refname:short)|%(upstream:track)", "refs/heads"], directory);
    return output.trim().split("\n").filter(Boolean).map(line => {
      const [name, track] = line.split("|");
      let ahead = 0, behind = 0;
      if (track && track !== "") {
        const m = track.match(/ahead\s+(\d+)/);
        if (m) ahead = parseInt(m[1], 10);
        const m2 = track.match(/behind\s+(\d+)/);
        if (m2) behind = parseInt(m2[1], 10);
      }
      return { name, ahead, behind };
    });
  } catch {
    return [];
  }
});

ipcMain.handle("checkout-branch", async (event, directory, branch) => {
  return await runGitAsync(["checkout", branch, "--"], directory);
});

ipcMain.handle("checkout-remote-branch", (event, directory, branch) => {
  return runGit(["checkout", "--track", branch], directory);
});

ipcMain.handle("checkout-commit", (event, directory, commitHash) => {
  return runGit(["checkout", commitHash], directory);
});

ipcMain.handle("reset-commit", (event, directory, commitHash, resetMode) => {
  const mode = resetMode || "mixed";
  return runGit(["reset", `--${mode}`, commitHash], directory);
});

ipcMain.handle("cherry-pick", async (event, { directory, commitHashes }) => {
  let hashes = commitHashes;
  if (typeof hashes === "string") hashes = hashes.split(/\s+/).filter(Boolean);
  if (!Array.isArray(hashes)) hashes = [String(hashes)];
  const args = ["cherry-pick"].concat(hashes);
  return await runGitAsync(args, directory);
});

ipcMain.handle("revert-commit", async (event, directory, commitHash) => {
  return await runGitAsync(["revert", "--no-edit", commitHash], directory);
});

ipcMain.handle("is-git-repo", (event, directory) => {
  try {
    runGit(["rev-parse", "--git-dir"], directory);
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle("create-branch", (event, directory, branchName) => {
  return runGit(["checkout", "-b", branchName], directory);
});

ipcMain.handle("init-repo", (event, directory) => {
  const fs = require("fs");
  if (!fs.existsSync(directory)) fs.mkdirSync(directory, { recursive: true });
  return runGit(["init"], directory);
});

ipcMain.handle("create-tag", (event, directory, tagName) => {
  return runGit(["tag", tagName], directory);
});

ipcMain.handle("get-ref-commit", (event, directory, ref) => {
  return runGit(["rev-parse", ref], directory).trim();
});

ipcMain.handle("get-file-content", (event, directory, filePath) => {
  const path = require("path");
  const fs = require("fs");
  const fullPath = path.join(directory, filePath);
  return fs.readFileSync(fullPath, "utf8").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
});

ipcMain.handle("get-file-content-base64", (event, directory, filePath) => {
  const path = require("path");
  const fs = require("fs");
  const fullPath = path.join(directory, filePath);
  return fs.readFileSync(fullPath).toString("base64");
});

ipcMain.handle("save-file-content", (event, directory, filePath, content) => {
  const path = require("path");
  const fs = require("fs");
  const fullPath = path.join(directory, filePath);
  fs.writeFileSync(fullPath, content, "utf8");
  return "ok";
});

ipcMain.handle("add-gitignore-entry", (event, directory, entry) => {
  const gitignorePath = path.join(directory, ".gitignore");
  let content = "";
  if (fs.existsSync(gitignorePath)) content = fs.readFileSync(gitignorePath, "utf8");
  const lines = content.split("\n").map(l => l.trim());
  if (lines.includes(entry)) return { ok: true, status: "already-present" };
  content += (content.endsWith("\n") ? "" : "\n") + entry + "\n";
  fs.writeFileSync(gitignorePath, content, "utf8");
  return { ok: true, status: "added" };
});

ipcMain.handle("remove-gitignore-entry", (event, directory, entry) => {
  const gitignorePath = path.join(directory, ".gitignore");
  if (!fs.existsSync(gitignorePath)) return { ok: true, status: "not-found" };
  let content = fs.readFileSync(gitignorePath, "utf8");
  const lines = content.split("\n");
  const filtered = lines.filter(l => l.trim() !== entry);
  if (filtered.length === lines.length) return { ok: true, status: "not-found" };
  fs.writeFileSync(gitignorePath, filtered.join("\n"), "utf8");
  return { ok: true, status: "removed" };
});

ipcMain.handle("get-file-at-commit", (event, directory, commitHash, filePath) => {
  return runGit(["show", `${commitHash}:${gitPath(filePath)}`], directory).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
});

ipcMain.handle("get-file-at-commit-base64", (event, directory, commitHash, filePath) => {
  const result = childProcess.spawnSync("git", ["show", `${commitHash}:${gitPath(filePath)}`], { cwd: directory });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr?.toString() || `git command failed`);
  return result.stdout.toString("base64");
});

ipcMain.handle("get-file-at-ref-base64", (event, directory, ref, filePath) => {
  const result = childProcess.spawnSync("git", ["show", `${ref}:${gitPath(filePath)}`], { cwd: directory });
  if (result.error) throw result.error;
  if (result.status !== 0) return null;
  return result.stdout.toString("base64");
});

ipcMain.handle("get-parent-commit", (event, directory, commitHash) => {
  try {
    return runGit(["rev-parse", `${commitHash}^`], directory).trim();
  } catch {
    return null;
  }
});

ipcMain.handle("check-is-text", (event, directory, filePath, commitHash) => {
  const MAX_BYTES = 8000;
  let buffer;
  if (commitHash) {
    const result = childProcess.spawnSync("git", ["show", `${commitHash}:${gitPath(filePath)}`], { cwd: directory, maxBuffer: MAX_BYTES });
    if (result.error) return true;
    if (result.status !== 0) return true;
    buffer = result.stdout;
  } else {
    const path = require("path");
    const fs = require("fs");
    const fullPath = path.join(directory, filePath);
    try {
      const fd = fs.openSync(fullPath, "r");
      buffer = Buffer.alloc(MAX_BYTES);
      const bytesRead = fs.readSync(fd, buffer, 0, MAX_BYTES, 0);
      fs.closeSync(fd);
      buffer = buffer.subarray(0, bytesRead);
    } catch {
      return true;
    }
  }
  return !buffer.includes(0);
});

ipcMain.handle("merge", async (event, directory, branch, strategy) => {
  const args = ["merge"];
  if (strategy === "squash") args.push("--squash");
  else if (strategy === "no-ff") args.push("--no-ff");
  else if (strategy === "ff-only") args.push("--ff-only");
  args.push(branch);
  return await runGitAsync(args, directory);
});

ipcMain.handle("discard-file", (event, directory, filePath) => {
  try {
    return runGit(["checkout", "--", filePath], directory);
  } catch (e) {
    if (e.message && e.message.includes("did not match any file(s) known to git")) {
      const fullPath = path.join(directory, filePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        return "";
      }
    }
    throw e;
  }
});

ipcMain.handle("discard-all", (event, directory) => {
  runGit(["checkout", "--", "."], directory);
  return runGit(["clean", "-fd"], directory);
});

ipcMain.handle("get-discard-hunks", (event, directory, filePath) => {
  const output = runGit(["diff", "--", filePath], directory);
  const hunks = [];
  const lines = output.split("\n");
  let currentHunk = null;
  let hunkId = 0;
  for (const line of lines) {
    if (line.startsWith("@@")) {
      if (currentHunk) hunks.push(currentHunk);
      currentHunk = { id: hunkId++, header: line, lines: [line] };
    } else if (currentHunk) {
      currentHunk.lines.push(line);
    }
  }
  if (currentHunk) hunks.push(currentHunk);
  return hunks;
});

ipcMain.handle("discard-hunks", (event, directory, filePath, hunkIds) => {
  const os = require("os");
  const path = require("path");
  const fs = require("fs");
  const fullOutput = runGit(["diff", "--", filePath], directory);
  const allLines = fullOutput.split("\n");
  const selectedPatch = [];
  let currentHunkIdx = -1;
  let inHeader = true;

  for (const line of allLines) {
    if (line.startsWith("@@")) {
      currentHunkIdx++;
      if (inHeader) inHeader = false;
    }
    if (inHeader || hunkIds.includes(currentHunkIdx)) {
      selectedPatch.push(line);
    }
  }

  if (selectedPatch.length < 3) return "no changes to discard";

  const tmpFile = path.join(os.tmpdir(), `orchid-discard-${Date.now()}.patch`);
  fs.writeFileSync(tmpFile, selectedPatch.join("\n"), "utf8");
  try {
    runGit(["apply", "-R", tmpFile], directory);
  } finally {
    try { fs.unlinkSync(tmpFile); } catch (e) { }
  }
  return "ok";
});

ipcMain.handle("get-rebase-commits", (event, directory, targetBranch) => {
  const output = runGit(["log", "--reverse", "--format=%h|%s", targetBranch + "..HEAD"], directory);
  return output.trim().split("\n").filter(Boolean).map(line => {
    const [hash, ...msgParts] = line.split("|");
    return { hash, message: msgParts.join("|") };
  });
});

ipcMain.handle("get-file-history", (event, directory, filePath) => {
  const output = runGit(["log", "--oneline", "--format=%h|%s|%ar|%an", "--", filePath], directory);
  return output.trim().split("\n").filter(Boolean).map(line => {
    const [hash, ...rest] = line.split("|");
    const message = rest.slice(0, -2).join("|");
    const date = rest[rest.length - 2] || "";
    const author = rest[rest.length - 1] || "";
    return { hash, message, date, author };
  });
});

ipcMain.handle("get-repo-files", (event, directory) => {
  const output = runGit(["ls-files"], directory);
  return output.trim().split("\n").filter(Boolean).map(f => f.replace(/^"|"$/g, "")).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
});

let rebaseEditResolve = null;
ipcMain.handle("rebase-edit-response", (event, data) => {
  if (rebaseEditResolve) {
    rebaseEditResolve(data);
    rebaseEditResolve = null;
  }
});

ipcMain.handle("execute-rebase", async (event, directory, targetBranch, todoList) => {
  console.log("[rebase] Starting rebase for", directory, "target:", targetBranch);
  console.log("[rebase] Todo items:", todoList.length);

  const rebaseMergeDir = path.join(directory, ".git", "rebase-merge");
  const hasRebaseMerge = fs.existsSync(rebaseMergeDir);
  console.log("[rebase] rebase-merge dir exists:", hasRebaseMerge);
  if (hasRebaseMerge) {
    console.log("[rebase] Aborting existing rebase before starting new one");
    const abortResult = childProcess.spawnSync("git", ["rebase", "--abort"], { cwd: directory, encoding: "utf8" });
    console.log("[rebase] Abort result:", abortResult.status, abortResult.stderr);
  }

  const todoContent = todoList.map(item => `${item.action} ${item.hash} ${item.message}`).join("\n") + "\n";
  const todoFile = path.join(os.tmpdir(), `orchid-rebase-todo-${Date.now()}.txt`);
  fs.writeFileSync(todoFile, todoContent, "utf8");
  console.log("[rebase] Todo file written:", todoFile);

  const seqEditor = writeTempScript(`orchid-rebase-seq-${Date.now()}.js`,
    `const fs=require("fs");fs.copyFileSync("${gitPath(todoFile)}",process.argv[2]);process.exit(0);\n`);

  const commDir = path.join(os.tmpdir(), `orchid-rebase-comm-${Date.now()}`);
  fs.mkdirSync(commDir, { recursive: true });

  const msgEditor = writeTempScript(`orchid-rebase-msg-${Date.now()}.js`,
    `const fs=require("fs");const p=require("path");const c=fs.readFileSync(process.argv[2],"utf8");` +
    `const req=p.join("${gitPath(commDir)}","request");` +
    `const rsp=p.join("${gitPath(commDir)}","response");` +
    `fs.writeFileSync(req,c,"utf8");` +
    `while(!fs.existsSync(rsp)){Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,200)}` +
    `const rc=JSON.parse(fs.readFileSync(rsp,"utf8"));` +
    `fs.writeFileSync(process.argv[2],rc.content,"utf8");` +
    `try{fs.unlinkSync(req)}catch(e){}try{fs.unlinkSync(rsp)}catch(e){}process.exit(0);\n`);

  const orchExe = `"${gitPath(process.execPath)}"`;
  const editorCmd = `${orchExe} "${gitPath(msgEditor)}"`;
  const seqCmd = `${orchExe} "${gitPath(seqEditor)}"`;

  console.log("[rebase] GIT_SEQUENCE_EDITOR:", seqCmd);
  console.log("[rebase] GIT_EDITOR:", editorCmd);

  const result = await new Promise((resolve, reject) => {
    const proc = childProcess.spawn("git", ["rebase", "-i", targetBranch], {
      cwd: directory,
      encoding: "utf8",
      env: { ...process.env, GIT_SEQUENCE_EDITOR: seqCmd, GIT_EDITOR: editorCmd },
    });

    let stdout = "", stderr = "";
    proc.stdout.on("data", d => stdout += d);
    proc.stderr.on("data", d => stderr += d);

    let processingReq = false;
    const pollTimer = setInterval(async () => {
      if (processingReq) return;
      const reqFile = path.join(commDir, "request");
      if (!fs.existsSync(reqFile)) return;
      processingReq = true;
      const content = fs.readFileSync(reqFile, "utf8");
      try { fs.unlinkSync(reqFile); } catch (e) { }
      console.log("[rebase] Editor request received, sending to renderer");
      const response = await new Promise((res) => {
        rebaseEditResolve = res;
        event.sender.send("rebase-edit-request", { content });
      });
      console.log("[rebase] Editor response received");
      fs.writeFileSync(path.join(commDir, "response"), JSON.stringify(response), "utf8");
      processingReq = false;
    }, 300);

    proc.on("close", (code) => {
      clearInterval(pollTimer);
      console.log("[rebase] git rebase result status:", code);
      console.log("[rebase] git rebase stdout:", stdout);
      console.log("[rebase] git rebase stderr:", stderr);
      if (code !== 0) reject(new Error(stderr || "Rebase failed"));
      else resolve(stdout);
    });
    proc.on("error", (err) => { clearInterval(pollTimer); reject(err); });
  });

  try { fs.rmSync(commDir, { recursive: true, force: true }); } catch (e) { }
  try { fs.unlinkSync(seqEditor); } catch (e) { }
  try { fs.unlinkSync(msgEditor); } catch (e) { }
  try { fs.unlinkSync(todoFile); } catch (e) { }

  console.log("[rebase] Rebase completed successfully");
  return result;
});

ipcMain.handle("stash-apply", (event, directory, stashId) => {
  return runGit(["stash", "apply", stashId], directory);
});

ipcMain.handle("stash-drop", (event, directory, stashId) => {
  return runGit(["stash", "drop", stashId], directory);
});

ipcMain.handle("stash-push", (event, directory, message) => {
  return runGit(["stash", "push", "-m", message], directory);
});

ipcMain.handle("delete-branch", (event, directory, branchName) => {
  try {
    return runGit(["branch", "-d", branchName], directory);
  } catch (e) {
    return runGit(["branch", "-D", branchName], directory);
  }
});

ipcMain.handle("delete-tag", (event, directory, tagName) => {
  return runGit(["tag", "-d", tagName], directory);
});

ipcMain.handle("delete-remote-branch", async (event, directory, remoteName) => {
  const branch = remoteName.replace(/^origin\//, "");
  return await runGitAsync(["push", "origin", "--delete", branch], directory);
});

ipcMain.handle("get-origin-url", (event, directory) => {
  try { return runGit(["remote", "get-url", "origin"], directory).trim(); }
  catch (e) { return ""; }
});

ipcMain.handle("set-origin-url", (event, directory, url) => {
  try {
    runGit(["remote", "set-url", "origin", url], directory);
  } catch (e) {
    runGit(["remote", "add", "origin", url], directory);
  }
  return "ok";
});

ipcMain.handle("get-status", (event, directory) => {
  const { parseStatusOutput } = require("./git");
  const output = runGit(["status", "--porcelain", "-u"], directory);
  return parseStatusOutput(output);
});

ipcMain.handle("get-repo-metrics", async (event, directory) => {
  const output = await runGitAsync(["log", "--format=%an|%ad", "--date=short", "-n", "5000"], directory);
  return output.trim().split("\n").filter(Boolean).map(line => {
    const [author, date] = line.split("|");
    return { author: author || "Unknown", date: date || "0000-00-00" };
  });
});

ipcMain.handle("get-repo-metrics-extra", async (event, directory) => {
  let hourData = [], topFiles = [], totalAdded = 0, totalDeleted = 0;

  try {
    const hourOutput = await runGitAsync(["log", "--format=%ad", "--date=format:%H", "-n", "5000"], directory);
    const hours = hourOutput.trim().split("\n").filter(Boolean).map(Number);
    const hourCounts = {};
    hours.forEach(h => { hourCounts[h] = (hourCounts[h] || 0) + 1; });
    hourData = Object.entries(hourCounts).sort((a, b) => a[0] - b[0]).map(([h, c]) => ({ hour: `${h}:00`, count: c }));
  } catch (e) { }

  try {
    const fileOutput = await runGitAsync(["log", "--diff-filter=AMDR", "--name-only", "--oneline", "-n", "2000"], directory);
    const fileCounts = {};
    fileOutput.trim().split("\n").filter(Boolean).forEach(line => {
      if (/^[0-9a-f]{7,}\s/i.test(line)) return;
      fileCounts[line] = (fileCounts[line] || 0) + 1;
    });
    topFiles = Object.entries(fileCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([path, count]) => ({ path, count }));
  } catch (e) { }

  try {
    const numstatOutput = await runGitAsync(["log", "--numstat", "--oneline", "-n", "2000"], directory);
    numstatOutput.trim().split("\n").filter(Boolean).forEach(line => {
      const clean = line.replace(/\r$/, "");
      const parts = clean.split("\t");
      if (parts.length >= 2 && /^\d+$/.test(parts[0]) && /^\d+$/.test(parts[1])) {
        totalAdded += parseInt(parts[0], 10);
        totalDeleted += parseInt(parts[1], 10);
      }
    });
  } catch (e) { }

  return { hourData, topFiles, totalAdded, totalDeleted };
});

ipcMain.handle("get-conflict-diff", (event, directory, filePath) => {
  return runGit(["diff", "--", filePath], directory);
});

ipcMain.handle("checkout-ours", (event, directory, filePath) => {
  return runGit(["checkout", "--ours", "--", filePath], directory);
});

ipcMain.handle("checkout-theirs", (event, directory, filePath) => {
  return runGit(["checkout", "--theirs", "--", filePath], directory);
});

ipcMain.handle("resolve-file", (event, directory, filePath) => {
  return runGit(["add", "--", filePath], directory);
});

ipcMain.handle("get-conflict-blocks", (event, directory, filePath) => {
  const path = require("path");
  const fs = require("fs");
  const fullPath = path.join(directory, filePath);
  if (!fs.existsSync(fullPath)) return { blocks: [] };
  const content = fs.readFileSync(fullPath, "utf8").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const blocks = [];
  const regex = /<<<<<<< .+\n([\s\S]*?)=======\n([\s\S]*?)>>>>>>> .+\n?/g;
  let match;
  let lastIndex = 0;
  while ((match = regex.exec(content)) !== null) {
    blocks.push({
      index: blocks.length,
      ours: match[1].replace(/\n$/, ""),
      theirs: match[2].replace(/\n$/, ""),
      start: match.index,
      end: match.index + match[0].length,
    });
    lastIndex = match.index + match[0].length;
  }
  return { blocks, fullContent: content };
});

ipcMain.handle("resolve-conflict-blocks", (event, directory, filePath, resolutions, keepBothSeparator) => {
  const path = require("path");
  const fs = require("fs");
  const fullPath = path.join(directory, filePath);
  let content = fs.readFileSync(fullPath, "utf8");
  const regex = /<<<<<<< .+\n([\s\S]*?)=======\n([\s\S]*?)>>>>>>> .+\n?/g;
  const resolved = {};
  resolutions.forEach(r => { resolved[r.blockIndex] = r; });
  let blockIndex = 0;
  content = content.replace(regex, (match, ours, theirs) => {
    const r = resolved[blockIndex];
    blockIndex++;
    if (!r) return match;
    if (r.choice === "ours") return ours.replace(/\n$/, "") + "\n";
    if (r.choice === "theirs") return theirs.replace(/\n$/, "") + "\n";
    if (r.choice === "both") {
      const sep = keepBothSeparator || "\n// === kept both ===\n";
      return ours.replace(/\n$/, "") + sep + theirs.replace(/\n$/, "") + "\n";
    }
    return match;
  });
  fs.writeFileSync(fullPath, content, "utf8");
  return "ok";
});

ipcMain.handle("continue-merge", (event, directory) => {
  const mergeMsg = require("path").join(directory, ".git", "MERGE_MSG");
  const rebaseDir = require("path").join(directory, ".git", "rebase-merge");
  const isMerge = require("fs").existsSync(mergeMsg);
  const isRebase = require("fs").existsSync(rebaseDir);
  if (isMerge) return runGit(["commit", "--no-edit"], directory);
  if (isRebase) return runGit(["rebase", "--continue"], directory);
  return null;
});

ipcMain.handle("abort-merge", (event, directory) => {
  const mergeMsg = require("path").join(directory, ".git", "MERGE_MSG");
  const rebaseDir = require("path").join(directory, ".git", "rebase-merge");
  const isMerge = require("fs").existsSync(mergeMsg);
  const isRebase = require("fs").existsSync(rebaseDir);
  if (isMerge) return runGit(["merge", "--abort"], directory);
  if (isRebase) return runGit(["rebase", "--abort"], directory);
  throw new Error("No merge or rebase in progress");
});

ipcMain.handle("get-merge-message", (event, directory) => {
  const fs = require("fs");
  const path = require("path");
  const mergeMsgPath = path.join(directory, ".git", "MERGE_MSG");
  if (fs.existsSync(mergeMsgPath)) return fs.readFileSync(mergeMsgPath, "utf8").trim();
  return null;
});

ipcMain.handle("check-merge-head", (event, directory) => {
  const path = require("path");
  const fs = require("fs");
  return fs.existsSync(path.join(directory, ".git", "MERGE_HEAD"));
});

ipcMain.handle("check-revert-head", (event, directory) => {
  const path = require("path");
  const fs = require("fs");
  return fs.existsSync(path.join(directory, ".git", "REVERT_HEAD"));
});

ipcMain.handle("abort-revert", (event, directory) => {
  return runGit(["revert", "--abort"], directory);
});

ipcMain.handle("get-merge-conflicted-files", (event, directory) => {
  const fs = require("fs");
  const path = require("path");
  const mergeMsgPath = path.join(directory, ".git", "MERGE_MSG");
  if (!fs.existsSync(mergeMsgPath)) return [];
  const content = fs.readFileSync(mergeMsgPath, "utf8");
  const files = [];
  for (const line of content.split("\n")) {
    const m = line.match(/^#\t(.+)$/);
    if (m) files.push(m[1]);
  }
  return files;
});

ipcMain.handle("get-merge-diff", (event, directory, filePath) => {
  return runGit(["diff", "HEAD...MERGE_HEAD", "--", filePath], directory);
});

ipcMain.handle("get-stash-files-from-commit", (event, directory, commitHash) => {
  const stashList = runGit(["stash", "list", "--format=%gd||%gs"], directory).trim().split("\n").filter(Boolean);
  let stashId = null;
  for (const entry of stashList) {
    const [id] = entry.split("||");
    const hash = runGit(["rev-parse", id], directory).trim();
    if (hash.startsWith(commitHash)) { stashId = id; break; }
  }
  if (!stashId) return [];
  const statusOutput = runGit(["stash", "show", "--name-status", stashId], directory);
  const numstatOutput = runGit(["stash", "show", "--numstat", stashId], directory);
  const statusLines = statusOutput.trim().split("\n").filter(Boolean);
  const numstatLines = numstatOutput.trim().split("\n").filter(Boolean);
  const numstatMap = {};
  numstatLines.forEach(line => {
    const [added, deleted, ...pathParts] = line.split("\t");
    const path = pathParts.join("\t");
    numstatMap[path] = { added: parseInt(added) || 0, deleted: parseInt(deleted) || 0 };
  });
  return statusLines.map(line => {
    const [status, ...pathParts] = line.split("\t");
    const path = pathParts.join("\t");
    const counts = numstatMap[path] || { added: 0, deleted: 0 };
    return { status, path, added: counts.added, deleted: counts.deleted };
  });
});

function stashFilesFromCommit(directory, commitHash) {
  try {
    const stashList = runGit(["stash", "list", "--format=%gd||%gs"], directory).trim().split("\n").filter(Boolean);
    for (const entry of stashList) {
      const [id] = entry.split("||");
      const hash = runGit(["rev-parse", id], directory).trim();
      if (hash.startsWith(commitHash)) {
        const ss = runGit(["stash", "show", "--name-status", id], directory);
        const ns = runGit(["stash", "show", "--numstat", id], directory);
        const statusLines = ss.trim().split("\n").filter(Boolean);
        const numstatLines = ns.trim().split("\n").filter(Boolean);
        const numstatMap = {};
        numstatLines.forEach(line => {
          const [added, deleted, ...pathParts] = line.split("\t");
          const path = pathParts.join("\t");
          numstatMap[path] = { added: parseInt(added) || 0, deleted: parseInt(deleted) || 0 };
        });
        return statusLines.map(line => {
          const [status, ...pathParts] = line.split("\t");
          const path = pathParts.join("\t");
          const counts = numstatMap[path] || { added: 0, deleted: 0 };
          return { status, path, added: counts.added, deleted: counts.deleted };
        });
      }
    }
  } catch (e) { }
  return [];
}

ipcMain.handle("get-commit-files", (event, directory, commitHash) => {
  let statusOutput = runGit(["diff-tree", "--no-commit-id", "-r", "-c", "--name-status", commitHash], directory);
  let numstatOutput = runGit(["diff-tree", "--no-commit-id", "-r", "-c", "--numstat", commitHash], directory);
  let statusLines = statusOutput.trim().split("\n").filter(Boolean);
  let numstatLines = numstatOutput.trim().split("\n").filter(Boolean);
  if (statusLines.length === 0 && numstatLines.length === 0) {
    statusOutput = runGit(["diff-tree", "--no-commit-id", "-r", "--name-status", commitHash], directory);
    numstatOutput = runGit(["diff-tree", "--no-commit-id", "-r", "--numstat", commitHash], directory);
    statusLines = statusOutput.trim().split("\n").filter(Boolean);
    numstatLines = numstatOutput.trim().split("\n").filter(Boolean);
    if (statusLines.length === 0 && numstatLines.length === 0) {
      return stashFilesFromCommit(directory, commitHash);
    }
  }
  const numstatMap = {};
  numstatLines.forEach(line => {
    const [added, deleted, ...pathParts] = line.split("\t");
    const path = pathParts.join("\t");
    numstatMap[path] = { added: parseInt(added) || 0, deleted: parseInt(deleted) || 0 };
  });
  return statusLines.map(line => {
    const [status, ...pathParts] = line.split("\t");
    const path = pathParts.join("\t");
    const counts = numstatMap[path] || { added: 0, deleted: 0 };
    return { status, path, added: counts.added, deleted: counts.deleted };
  });
});

ipcMain.handle("get-stash-file-diff", (event, directory, commitHash, filePath) => {
  const stashList = runGit(["stash", "list", "--format=%gd||%gs"], directory).trim().split("\n").filter(Boolean);
  let stashId = null;
  for (const entry of stashList) {
    const [id] = entry.split("||");
    const hash = runGit(["rev-parse", id], directory).trim();
    if (hash.startsWith(commitHash)) { stashId = id; break; }
  }
  if (!stashId) return "";
  return runGit(["diff", `${stashId}^`, stashId, "--", filePath], directory);
});

ipcMain.handle("get-commit-file-diff", (event, directory, commitHash, filePath) => {
  let output = runGit(["diff-tree", "--no-commit-id", "-r", "-c", "-p", commitHash, "--", filePath], directory);
  if (!output.trim()) {
    output = runGit(["diff-tree", "--no-commit-id", "-r", "-p", commitHash, "--", filePath], directory);
  }
  if (output.trim()) return output;
  try {
    const stashList = runGit(["stash", "list", "--format=%gd||%gs"], directory).trim().split("\n").filter(Boolean);
    for (const entry of stashList) {
      const [id] = entry.split("||");
      const hash = runGit(["rev-parse", id], directory).trim();
      if (hash.startsWith(commitHash)) {
        return runGit(["diff", `${id}^`, id, "--", filePath], directory);
      }
    }
  } catch (e) { }
  return "";
});

ipcMain.handle("get-blame", async (event, directory, filePath) => {
  const output = await runGitAsync(["blame", "--line-porcelain", filePath], directory);
  const lines = [];
  const split = output.split("\n");
  let i = 0;
  while (i < split.length) {
    const first = split[i];
    if (!first || first.startsWith("\t")) { i++; continue; }
    const parts = first.split(/\s+/);
    const hash = parts[0];
    if (!/^[0-9a-f]{40}$/i.test(hash)) { i++; continue; }
    const finalLine = parseInt(parts[2], 10);
    let author = "", date = "";
    i++;
    while (i < split.length) {
      const line = split[i];
      if (line.startsWith("author ")) author = line.slice(7).replace(/\r$/, "").trim();
      if (line.startsWith("author-time ")) {
        date = new Date(parseInt(line.slice(11), 10) * 1000).toLocaleDateString();
      }
      if (line.startsWith("\t")) {
        lines.push({ hash: hash.slice(0, 8), author: author || "Unknown", date: date || "-", lineNum: finalLine, content: line.slice(1).replace(/\r$/, "") });
        i++;
        break;
      }
      i++;
    }
  }
  return lines;
});

ipcMain.handle("stage-file", (event, directory, filePath) => {
  return runGit(["add", "--", filePath], directory);
});

ipcMain.handle("unstage-file", (event, directory, filePath) => {
  try {
    return runGit(["reset", "HEAD", "--", filePath], directory);
  } catch {
    return runGit(["rm", "--cached", "--", filePath], directory);
  }
});

ipcMain.handle("stage-all", (event, directory) => {
  return runGit(["add", "-A"], directory);
});

ipcMain.handle("commit", (event, directory, message) => {
  return runGit(["commit", "-m", message], directory);
});

ipcMain.handle("get-diff", (event, directory, filePath) => {
  return runGit(["diff", "--", filePath], directory);
});

ipcMain.handle("get-diff-commit", (event, directory, commitHash, filePath) => {
  let output = runGit(["diff-tree", "--no-commit-id", "-r", "-c", "-p", commitHash, "--", filePath], directory);
  if (!output.trim()) {
    output = runGit(["diff-tree", "--no-commit-id", "-r", "-p", commitHash, "--", filePath], directory);
  }
  return output;
});

ipcMain.handle("get-diff-lines", (event, directory, filePath) => {
  try {
    const out = runGit(["diff", "-U0", "--", filePath], directory);
    const lines = [];
    for (const m of out.matchAll(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/gm)) {
      const start = parseInt(m[1], 10);
      const count = m[2] !== undefined ? parseInt(m[2], 10) : 1;
      for (let i = 0; i < count; i++) lines.push(start + i);
    }
    return lines;
  } catch (e) { return []; }
});

ipcMain.handle("get-staged-diff", (event, directory, filePath) => {
  return runGit(["diff", "--cached", "--", filePath], directory);
});

ipcMain.handle("get-user-config", (event, directory) => {
  let name = "", email = "";
  try { name = runGit(["config", "user.name"], directory).trim(); } catch { }
  try { email = runGit(["config", "user.email"], directory).trim(); } catch { }
  return { name, email };
});

ipcMain.handle("set-user-config", (event, directory, name, email) => {
  runGit(["config", "user.name", name], directory);
  runGit(["config", "user.email", email], directory);
  return "ok";
});

ipcMain.handle("push", async (event, directory) => {
  try {
    return await runGitAsync(["push"], directory);
  } catch (e) {
    const msg = e.message || "";
    if (msg.includes("has no upstream")) {
      const branch = runGit(["rev-parse", "--abbrev-ref", "HEAD"], directory).trim();
      return await runGitAsync(["push", "--set-upstream", "origin", branch], directory);
    }
    throw e;
  }
});

ipcMain.handle("push-force", async (event, directory) => {
  return await runGitAsync(["push", "--force-with-lease"], directory);
});

ipcMain.handle("pull", async (event, directory) => {
  return await runGitAsync(["pull"], directory);
});

ipcMain.handle("fetch", async (event, directory) => {
  return await runGitAsync(["fetch", "--all"], directory);
});

ipcMain.handle("clone", async (event, url, destPath) => {
  if (typeof url !== "string" || url.startsWith("-")) throw new Error("Invalid repository URL");
  try {
    new URL(url);
  } catch {
    throw new Error("Invalid repository URL");
  }
  return await runGitAsync(["clone", url, destPath]);
});

ipcMain.handle("write-last-directory", (event, dirPath) => {
  if (app.isPackaged) return;
  const target = path.join(app.getPath("userData"), "lastDirectory.txt");
  try { fs.writeFileSync(target, dirPath, "utf8"); } catch { }
});

ipcMain.handle("save-repo-log", (event, content) => {
  const target = path.join(app.getAppPath(), "repo-log.txt");
  try { fs.writeFileSync(target, content, "utf8"); } catch { }
});

ipcMain.handle("open-in-explorer", async (event, directory) => {
  await shell.openPath(directory);
});

ipcMain.handle("check-for-updates", async () => {
  const { checkForUpdates } = require("./updater");
  try {
    return await checkForUpdates();
  } catch (e) {
    return { hasUpdate: false, error: e.message || String(e), currentVersion: app.getVersion() };
  }
});

ipcMain.handle("download-update", async (event, assetUrl, assetName) => {
  const { downloadUpdate } = require("./updater");
  return await downloadUpdate(assetUrl, assetName, (received, total) => {
    event.sender.send("update-download-progress", { received, total });
  });
});

ipcMain.handle("install-update", async (event, assetPath) => {
  const { installUpdate } = require("./updater");
  return await installUpdate(assetPath);
});

ipcMain.handle("create-pr", async (event, directory, options = {}) => {
  const { headBranch, baseBranch, title } = options;

  const branch = headBranch || runGit(["rev-parse", "--abbrev-ref", "HEAD"], directory).trim();
  if (branch === "HEAD") throw new Error("Cannot create a pull request from a detached HEAD state.");

  let remoteUrl;
  try {
    remoteUrl = runGit(["remote", "get-url", "origin"], directory).trim();
  } catch {
    throw new Error("No remote configured. Set a remote origin to create pull requests.");
  }

  const { buildPullRequestUrl } = require("./app/utils/providerDetector");
  const prUrl = buildPullRequestUrl(remoteUrl, branch, baseBranch || "main");

  if (!prUrl) {
    throw new Error("Could not determine a valid pull request URL for this repository's remote.");
  }

  await shell.openExternal(prUrl);
  return { ok: true, url: prUrl };
});
