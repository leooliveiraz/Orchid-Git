// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
const { ipcRenderer, contextBridge } = require("electron");

contextBridge.exposeInMainWorld("api", {
  // Invoke Methods
  testInvoke: (args) => ipcRenderer.invoke("test-invoke", args),
  // Send Methods
  testSend: (args) => ipcRenderer.send("test-send", args),
  // Receive Methods
  testReceive: (callback) => {
    ipcRenderer.on("test-receive", (event, data) => {
      callback(data);
    })
  }
});
