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
  isGitRepo: (directory) => ipcRenderer.invoke("is-git-repo", directory),
  createBranch: (directory, branchName) => ipcRenderer.invoke("create-branch", directory, branchName),
  initRepo: (directory) => ipcRenderer.invoke("init-repo", directory),
  createTag: (directory, tagName) => ipcRenderer.invoke("create-tag", directory, tagName),
  merge: (directory, branch, strategy) => ipcRenderer.invoke("merge", directory, branch, strategy),
  cherryPick: (directory, commitHash) => ipcRenderer.invoke("cherry-pick", directory, commitHash),
  getRebaseCommits: (directory, targetBranch) => ipcRenderer.invoke("get-rebase-commits", directory, targetBranch),
  getFileHistory: (directory, filePath) => ipcRenderer.invoke("get-file-history", directory, filePath),
  getRepoFiles: (directory) => ipcRenderer.invoke("get-repo-files", directory),
  executeRebase: (directory, targetBranch, todoList) => ipcRenderer.invoke("execute-rebase", directory, targetBranch, todoList),
  stashApply: (directory, stashId) => ipcRenderer.invoke("stash-apply", directory, stashId),
  stashDrop: (directory, stashId) => ipcRenderer.invoke("stash-drop", directory, stashId),
  stashPush: (directory, message) => ipcRenderer.invoke("stash-push", directory, message),
  deleteBranch: (directory, branchName) => ipcRenderer.invoke("delete-branch", directory, branchName),
  deleteTag: (directory, tagName) => ipcRenderer.invoke("delete-tag", directory, tagName),
  deleteRemoteBranch: (directory, remoteName) => ipcRenderer.invoke("delete-remote-branch", directory, remoteName),
  getOriginUrl: (directory) => ipcRenderer.invoke("get-origin-url", directory),
  setOriginUrl: (directory, url) => ipcRenderer.invoke("set-origin-url", directory, url),
  getStatus: (directory) => ipcRenderer.invoke("get-status", directory),
  stageFile: (directory, filePath) => ipcRenderer.invoke("stage-file", directory, filePath),
  unstageFile: (directory, filePath) => ipcRenderer.invoke("unstage-file", directory, filePath),
  stageAll: (directory) => ipcRenderer.invoke("stage-all", directory),
  getBlame: (directory, filePath) => ipcRenderer.invoke("get-blame", directory, filePath),
  commit: (directory, message) => ipcRenderer.invoke("commit", directory, message),
  getDiff: (directory, filePath) => ipcRenderer.invoke("get-diff", directory, filePath),
  getStagedDiff: (directory, filePath) => ipcRenderer.invoke("get-staged-diff", directory, filePath),
  push: (directory) => ipcRenderer.invoke("push", directory),
  pull: (directory) => ipcRenderer.invoke("pull", directory),
  fetch: (directory) => ipcRenderer.invoke("fetch", directory),
  getUserConfig: (directory) => ipcRenderer.invoke("get-user-config", directory),
  setUserConfig: (directory, name, email) => ipcRenderer.invoke("set-user-config", directory, name, email),
  clone: (url, destPath) => ipcRenderer.invoke("clone", url, destPath),
  getRepoMetrics: (directory) => ipcRenderer.invoke("get-repo-metrics", directory),
  getRepoMetricsExtra: (directory) => ipcRenderer.invoke("get-repo-metrics-extra", directory),
  getConflictDiff: (directory, filePath) => ipcRenderer.invoke("get-conflict-diff", directory, filePath),
  checkoutOurs: (directory, filePath) => ipcRenderer.invoke("checkout-ours", directory, filePath),
  checkoutTheirs: (directory, filePath) => ipcRenderer.invoke("checkout-theirs", directory, filePath),
  resolveFile: (directory, filePath) => ipcRenderer.invoke("resolve-file", directory, filePath),
  getConflictBlocks: (directory, filePath) => ipcRenderer.invoke("get-conflict-blocks", directory, filePath),
  resolveConflictBlocks: (directory, filePath, resolutions, separator) => ipcRenderer.invoke("resolve-conflict-blocks", directory, filePath, resolutions, separator),
  continueMerge: (directory) => ipcRenderer.invoke("continue-merge", directory),
  abortMerge: (directory) => ipcRenderer.invoke("abort-merge", directory),
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
