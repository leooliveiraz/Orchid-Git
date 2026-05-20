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
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 600,
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

ipcMain.handle("create-branch", (event, directory, branchName) => {
  return runGit(["checkout", "-b", branchName], directory);
});

ipcMain.handle("create-tag", (event, directory, tagName) => {
  return runGit(["tag", tagName], directory);
});

ipcMain.handle("merge", (event, directory, branch, strategy) => {
  const args = ["merge"];
  if (strategy === "squash") args.push("--squash");
  else if (strategy === "no-ff") args.push("--no-ff");
  else if (strategy === "ff-only") args.push("--ff-only");
  args.push(branch);
  return runGit(args, directory);
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

ipcMain.handle("get-status", (event, directory) => {
  const { parseStatusOutput } = require("./git");
  const output = runGit(["status", "--porcelain"], directory);
  return parseStatusOutput(output);
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
