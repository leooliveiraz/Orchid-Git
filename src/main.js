import { app, BrowserWindow } from "electron";
const { dialog, Menu, MenuItem } = require("electron");
import path from "node:path";
import started from "electron-squirrel-startup";
const ipcMain = require("electron").ipcMain;
const childProcess = require("child_process");
const isWindows = process.platform === "win32";

function runGit(args, cwd) {
  const result = childProcess.spawnSync("git", args, { cwd, encoding: "utf8" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr || `git command failed: ${args.join(" ")}`);
  return result.stdout;
}

let win = null;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = () => {
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, "icon.png")
    : path.join(app.getAppPath(), "src", "assets", "icon.png");
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 600,
    icon: iconPath,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
    autoHideMenuBar: true,
  });

  // and load the index.html of the app.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
  win = mainWindow;

  mainWindow.webContents.on("context-menu", (event, params) => {
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

ipcMain.on("open-dev-tools", function (event,arg){
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

ipcMain.handle("get-repository-commits", function (event, directory, topoOrder, allCommits, limit) {
  if (!topoOrder) topoOrder = false;
  if (!allCommits) allCommits = false;
  const args = [
    "log",
    ...(allCommits ? ["--all"] : []),
    ...(topoOrder ? ["--topo-order"] : []),
    ...(limit ? ["-n", String(limit)] : []),
    `--pretty=format:%h%n%p%n%an%n%ad%n%s%n%D%x00`,
  ];
  const output = runGit(args, directory);
  return output;
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
  return runGit(["rev-parse", "--abbrev-ref", "HEAD"], directory).trim();
});

ipcMain.handle("checkout-branch", (event, directory, branch) => {
  return runGit(["checkout", branch, "--"], directory);
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

ipcMain.handle("get-file-content", (event, directory, filePath) => {
  const path = require("path");
  const fs = require("fs");
  const fullPath = path.join(directory, filePath);
  return fs.readFileSync(fullPath, "utf8").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
});

ipcMain.handle("save-file-content", (event, directory, filePath, content) => {
  const path = require("path");
  const fs = require("fs");
  const fullPath = path.join(directory, filePath);
  fs.writeFileSync(fullPath, content, "utf8");
  return "ok";
});

ipcMain.handle("get-file-at-commit", (event, directory, commitHash, filePath) => {
  return runGit(["show", `${commitHash}:${filePath}`], directory).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
});

ipcMain.handle("merge", (event, directory, branch, strategy) => {
  const args = ["merge"];
  if (strategy === "squash") args.push("--squash");
  else if (strategy === "no-ff") args.push("--no-ff");
  else if (strategy === "ff-only") args.push("--ff-only");
  args.push(branch);
  return runGit(args, directory);
});

ipcMain.handle("discard-file", (event, directory, filePath) => {
  return runGit(["checkout", "--", filePath], directory);
});

ipcMain.handle("discard-all", (event, directory) => {
  return runGit(["checkout", "--", "."], directory);
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
    try { fs.unlinkSync(tmpFile); } catch(e) {}
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

ipcMain.handle("execute-rebase", (event, directory, targetBranch, todoList) => {
  const os = require("os");
  const path = require("path");
  const fs = require("fs");

  const todoContent = todoList.map(item => `${item.action} ${item.hash} ${item.message}`).join("\n") + "\n";
  const todoFile = path.join(os.tmpdir(), `orchid-rebase-todo-${Date.now()}.txt`);
  fs.writeFileSync(todoFile, todoContent, "utf8");

  const scriptFile = path.join(os.tmpdir(), `orchid-rebase-editor-${Date.now()}${process.platform === "win32" ? ".bat" : ".sh"}`);
  if (process.platform === "win32") {
    fs.writeFileSync(scriptFile, `@echo off\ncopy /y "${todoFile}" %1 >nul\n`, "utf8");
  } else {
    fs.writeFileSync(scriptFile, `#!/bin/sh\ncp "${todoFile}" "$1"\n`, "utf8");
    fs.chmodSync(scriptFile, 0o755);
  }

  const result = childProcess.spawnSync("git", ["rebase", "-i", targetBranch], {
    cwd: directory,
    encoding: "utf8",
    env: { ...process.env, GIT_SEQUENCE_EDITOR: scriptFile },
  });

  try { fs.unlinkSync(scriptFile); } catch(e) {}
  try { fs.unlinkSync(todoFile); } catch(e) {}

  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr || "Rebase failed");
  return result.stdout;
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

ipcMain.handle("delete-remote-branch", (event, directory, remoteName) => {
  const branch = remoteName.replace(/^origin\//, "");
  return runGit(["push", "origin", "--delete", branch], directory);
});

ipcMain.handle("get-origin-url", (event, directory) => {
  try { return runGit(["remote", "get-url", "origin"], directory).trim(); }
  catch(e) { return ""; }
});

ipcMain.handle("set-origin-url", (event, directory, url) => {
  try {
    runGit(["remote", "set-url", "origin", url], directory);
  } catch(e) {
    runGit(["remote", "add", "origin", url], directory);
  }
  return "ok";
});

ipcMain.handle("get-status", (event, directory) => {
  const { parseStatusOutput } = require("./git");
  const output = runGit(["status", "--porcelain"], directory);
  return parseStatusOutput(output);
});

ipcMain.handle("get-repo-metrics", (event, directory) => {
  const output = runGit(["log", "--format=%an|%ad", "--date=short", "-n", "5000"], directory);
  return output.trim().split("\n").filter(Boolean).map(line => {
    const [author, date] = line.split("|");
    return { author: author || "Unknown", date: date || "0000-00-00" };
  });
});

ipcMain.handle("get-repo-metrics-extra", (event, directory) => {
  let hourData = [], topFiles = [], totalAdded = 0, totalDeleted = 0;

  try {
    const hourOutput = runGit(["log", "--format=%ad", "--date=format:%H", "-n", "5000"], directory);
    const hours = hourOutput.trim().split("\n").filter(Boolean).map(Number);
    const hourCounts = {};
    hours.forEach(h => { hourCounts[h] = (hourCounts[h] || 0) + 1; });
    hourData = Object.entries(hourCounts).sort((a, b) => a[0] - b[0]).map(([h, c]) => ({ hour: `${h}:00`, count: c }));
  } catch(e) {}

  try {
    const fileOutput = runGit(["log", "--diff-filter=AMDR", "--name-only", "--oneline", "-n", "2000"], directory);
    const fileCounts = {};
    fileOutput.trim().split("\n").filter(Boolean).forEach(line => {
      if (/^[0-9a-f]{7,}\s/i.test(line)) return;
      fileCounts[line] = (fileCounts[line] || 0) + 1;
    });
    topFiles = Object.entries(fileCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([path, count]) => ({ path, count }));
  } catch(e) {}

  try {
    const numstatOutput = runGit(["log", "--numstat", "--oneline", "-n", "2000"], directory);
    numstatOutput.trim().split("\n").filter(Boolean).forEach(line => {
      const clean = line.replace(/\r$/, "");
      const parts = clean.split("\t");
      if (parts.length >= 2 && /^\d+$/.test(parts[0]) && /^\d+$/.test(parts[1])) {
        totalAdded += parseInt(parts[0], 10);
        totalDeleted += parseInt(parts[1], 10);
      }
    });
  } catch(e) {}

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
  const content = fs.readFileSync(fullPath, "utf8");
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
  if (isMerge) return runGit(["merge", "--continue"], directory);
  if (isRebase) return runGit(["rebase", "--continue"], directory);
  throw new Error("No merge or rebase in progress");
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

ipcMain.handle("get-commit-files", (event, directory, commitHash) => {
  const statusOutput = runGit(["diff-tree", "--no-commit-id", "-r", "--name-status", commitHash], directory);
  const numstatOutput = runGit(["diff-tree", "--no-commit-id", "-r", "--numstat", commitHash], directory);
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

ipcMain.handle("get-commit-file-diff", (event, directory, commitHash, filePath) => {
  return runGit(["diff-tree", "--no-commit-id", "-r", "-p", commitHash, "--", filePath], directory);
});

ipcMain.handle("get-blame", (event, directory, filePath) => {
  const output = runGit(["blame", "--line-porcelain", filePath], directory);
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
  return runGit(["reset", "HEAD", "--", filePath], directory);
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
  return runGit(["diff", commitHash, "--", filePath], directory);
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
  } catch(e) { return []; }
});

ipcMain.handle("get-staged-diff", (event, directory, filePath) => {
  return runGit(["diff", "--cached", "--", filePath], directory);
});

ipcMain.handle("get-user-config", (event, directory) => {
  let name = "", email = "";
  try { name = runGit(["config", "user.name"], directory).trim(); } catch {}
  try { email = runGit(["config", "user.email"], directory).trim(); } catch {}
  return { name, email };
});

ipcMain.handle("set-user-config", (event, directory, name, email) => {
  runGit(["config", "user.name", name], directory);
  runGit(["config", "user.email", email], directory);
  return "ok";
});

ipcMain.handle("push", (event, directory) => {
  try {
    return runGit(["push"], directory);
  } catch (e) {
    const msg = e.message || "";
    if (msg.includes("has no upstream")) {
      const branch = runGit(["rev-parse", "--abbrev-ref", "HEAD"], directory).trim();
      return runGit(["push", "--set-upstream", "origin", branch], directory);
    }
    throw e;
  }
});

ipcMain.handle("pull", (event, directory) => {
  return runGit(["pull"], directory);
});

ipcMain.handle("fetch", (event, directory) => {
  return runGit(["fetch", "--all"], directory);
});

ipcMain.handle("clone", async (event, url, destPath) => {
  if (typeof url !== "string" || url.startsWith("-")) throw new Error("Invalid repository URL");
  try {
    new URL(url);
  } catch {
    throw new Error("Invalid repository URL");
  }
  return runGit(["clone", url, destPath]);
});
