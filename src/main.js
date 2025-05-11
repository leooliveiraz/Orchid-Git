import { app, BrowserWindow } from "electron";
const { dialog } = require("electron");
import path from "node:path";
import started from "electron-squirrel-startup";
const ipcMain = require("electron").ipcMain;
const childProcess = require("child_process");
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
  if (!topoOrder ) topoOrder = false;
  if (!allCommits ) topoOrder = false;
  const comando = `cd ${directory}; git log ${allCommits ? "--all" : ""} ${topoOrder ? "--topo-order" : ""} ${limit ? "-n "+limit : ""} --pretty=format:'{%n  "commit": "%h",%n  "parent": "%p",%n  "author": "%an",%n  "date": "%ad",%n  "message": "*()*()*()%s"*()*()*(),%n  "decoration":"%d"%n}!@#!@#!@#'   `;
  console.log(comando)
  return childProcess.execSync(comando, {
    encoding: "utf8",
  });
});
