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
  checkoutBranch: (directory, branch) => ipcRenderer.invoke("checkout-branch", directory, branch),
  stashApply: (directory, stashId) => ipcRenderer.invoke("stash-apply", directory, stashId),
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
