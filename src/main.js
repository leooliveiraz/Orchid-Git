import { app, BrowserWindow } from "electron";
const { dialog, Menu, MenuItem } = require("electron");
import path from "node:path";
import started from "electron-squirrel-startup";
const ipcMain = require("electron").ipcMain;
const childProcess = require("child_process");
const fs = require("fs");
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
  console.log(event, directory)
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
  const dirName = path.basename(directory);
  const repoDir = path.join(__dirname, "..", "repositories");
  if (!fs.existsSync(repoDir)) fs.mkdirSync(repoDir, { recursive: true });
  fs.writeFileSync(path.join(repoDir, `${dirName}.txt`), output);
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
  return runGit(["checkout", branch], directory);
});

ipcMain.handle("stash-apply", (event, directory, stashId) => {
  return runGit(["stash", "apply", stashId], directory);
});

ipcMain.handle("get-status", (event, directory) => {
  const { parseStatusOutput } = require("./git");
  const output = runGit(["status", "--porcelain"], directory);
  return parseStatusOutput(output);
});

ipcMain.handle("stage-file", (event, directory, filePath) => {
  return runGit(["add", filePath], directory);
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
  return runGit(["diff", filePath], directory);
});

ipcMain.handle("get-staged-diff", (event, directory, filePath) => {
  return runGit(["diff", "--cached", filePath], directory);
});

ipcMain.handle("push", (event, directory) => {
  return runGit(["push"], directory);
});

ipcMain.handle("pull", (event, directory) => {
  return runGit(["pull"], directory);
});

ipcMain.handle("clone", async (event, url, destPath) => {
  return runGit(["clone", url, destPath]);
});
