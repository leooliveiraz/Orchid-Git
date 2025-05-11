// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
const { ipcRenderer, contextBridge } = require("electron");

contextBridge.exposeInMainWorld("api", {
  // Invoke Methods
  testInvoke: (args) => ipcRenderer.invoke("test-invoke", args),
  selectDirectory: (args) => ipcRenderer.invoke("select-directory", args),
  getRepositoryCommits: (repositoryDirectory, useTopoOrder, showAllBranches, commitLimit) => ipcRenderer.invoke("get-repository-commits", repositoryDirectory, useTopoOrder, showAllBranches, commitLimit),
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
