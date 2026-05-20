// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
const { ipcRenderer, contextBridge } = require("electron");

contextBridge.exposeInMainWorld("api", {
  // Invoke Methods
  testInvoke: (args) => ipcRenderer.invoke("test-invoke", args),
  selectDirectory: (args) => ipcRenderer.invoke("select-directory", args),
  getRepositoryCommits: (repositoryDirectory, useTopoOrder, showAllBranches, commitLimit) => ipcRenderer.invoke("get-repository-commits", repositoryDirectory, useTopoOrder, showAllBranches, commitLimit),
  getBranches: (directory) => ipcRenderer.invoke("get-branches", directory),
  getRemoteBranches: (directory) => ipcRenderer.invoke("get-remote-branches", directory),
  getTags: (directory) => ipcRenderer.invoke("get-tags", directory),
  getStashList: (directory) => ipcRenderer.invoke("get-stash-list", directory),
  getCurrentBranch: (directory) => ipcRenderer.invoke("get-current-branch", directory),
  getCommitFiles: (directory, hash) => ipcRenderer.invoke("get-commit-files", directory, hash),
  getCommitFileDiff: (directory, hash, filePath) => ipcRenderer.invoke("get-commit-file-diff", directory, hash, filePath),
  checkoutBranch: (directory, branch) => ipcRenderer.invoke("checkout-branch", directory, branch),
  stashApply: (directory, stashId) => ipcRenderer.invoke("stash-apply", directory, stashId),
  getStatus: (directory) => ipcRenderer.invoke("get-status", directory),
  stageFile: (directory, filePath) => ipcRenderer.invoke("stage-file", directory, filePath),
  unstageFile: (directory, filePath) => ipcRenderer.invoke("unstage-file", directory, filePath),
  stageAll: (directory) => ipcRenderer.invoke("stage-all", directory),
  commit: (directory, message) => ipcRenderer.invoke("commit", directory, message),
  getDiff: (directory, filePath) => ipcRenderer.invoke("get-diff", directory, filePath),
  getStagedDiff: (directory, filePath) => ipcRenderer.invoke("get-staged-diff", directory, filePath),
  push: (directory) => ipcRenderer.invoke("push", directory),
  pull: (directory) => ipcRenderer.invoke("pull", directory),
  getUserConfig: (directory) => ipcRenderer.invoke("get-user-config", directory),
  setUserConfig: (directory, name, email) => ipcRenderer.invoke("set-user-config", directory, name, email),
  clone: (url, destPath) => ipcRenderer.invoke("clone", url, destPath),
  // Send Methods
  testSend: (args) => ipcRenderer.send("test-send", args),
  openDevTools: (args) => ipcRenderer.send("open-dev-tools", args),
  // Receive Methods
  testReceive: (callback) => {
    ipcRenderer.on("test-receive", (event, data) => {
      callback(data);
    })
  }
});
