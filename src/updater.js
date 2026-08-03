const { net, app, shell } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const childProcess = require("node:child_process");

const UPDATE_REPO = "leooliveiraz/orchid-git-packages";
const RELEASES_API_URL = `https://api.github.com/repos/${UPDATE_REPO}/releases/latest`;

function parseVersion(v) {
  const m = String(v || "").replace(/^v/, "").match(/^(\d+)\.(\d+)\.(\d+)/);
  return m ? [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)] : null;
}

function isNewerThan(remoteTag, currentVersion) {
  const a = parseVersion(remoteTag);
  const b = parseVersion(currentVersion);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) {
    if (a[i] > b[i]) return true;
    if (a[i] < b[i]) return false;
  }
  return false;
}

function selectAsset(assets) {
  if (!Array.isArray(assets)) return null;
  const name = (a) => (a.name || "").toLowerCase();
  if (process.platform === "win32") {
    return assets.find(a => name(a).endsWith(".exe")) || assets.find(a => name(a).endsWith(".msi")) || null;
  }
  if (process.platform === "darwin") {
    return assets.find(a => name(a).endsWith(".dmg")) || assets.find(a => name(a).endsWith(".zip")) || null;
  }
  return assets.find(a => name(a).endsWith(".deb"))
    || assets.find(a => name(a).endsWith(".rpm"))
    || assets.find(a => name(a).endsWith(".appimage")) || null;
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const request = net.request({ url, headers: { "User-Agent": "Orchid-Git-Updater", Accept: "application/vnd.github+json" } });
    request.on("response", (response) => {
      let body = "";
      response.on("data", (chunk) => body += chunk);
      response.on("end", () => {
        if (response.statusCode >= 400) {
          reject(new Error(`GitHub API error (HTTP ${response.statusCode})`));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(new Error("Invalid response from GitHub API"));
        }
      });
    });
    request.on("error", reject);
    request.end();
  });
}

async function checkForUpdates() {
  const release = await fetchJson(RELEASES_API_URL);
  const latestVersion = String(release.tag_name || "").replace(/^v/, "");
  const currentVersion = app.getVersion();
  const asset = selectAsset(release.assets);
  return {
    hasUpdate: isNewerThan(latestVersion, currentVersion),
    currentVersion,
    latestVersion,
    releaseName: release.name || latestVersion,
    releaseNotes: release.body || "",
    publishedAt: release.published_at || "",
    asset: asset ? { name: asset.name, url: asset.browser_download_url, size: asset.size || 0 } : null,
  };
}

function downloadFile(url, destPath, onProgress) {
  return new Promise((resolve, reject) => {
    const request = net.request({ url, headers: { "User-Agent": "Orchid-Git-Updater" } });
    request.on("response", (response) => {
      if (response.statusCode >= 400) {
        reject(new Error(`Download failed (HTTP ${response.statusCode})`));
        return;
      }
      const total = parseInt(response.headers["content-length"] || "0", 10);
      let received = 0;
      const file = fs.createWriteStream(destPath);
      response.on("data", (chunk) => {
        received += chunk.length;
        file.write(chunk);
        onProgress && onProgress(received, total);
      });
      response.on("end", () => file.end());
      file.on("finish", () => resolve(destPath));
      file.on("error", reject);
    });
    request.on("error", reject);
    request.end();
  });
}

function installUpdate(assetPath) {
  try {
    const stat = fs.statSync(assetPath);
    if (stat.size === 0) throw new Error("Downloaded file is empty. The download may have failed.");
  } catch (e) {
    throw e;
  }
  if (process.platform === "win32") {
    const proc = childProcess.spawn(assetPath, [], { detached: true, stdio: "ignore" });
    proc.unref();
    setTimeout(() => app.quit(), 1500);
    return { ok: true, restarting: true };
  }
  return shell.openPath(assetPath).then((err) => err ? { ok: false, error: err } : { ok: true });
}

function downloadUpdate(assetUrl, assetName, onProgress) {
  const destPath = path.join(os.tmpdir(), assetName || "orchid-git-update");
  return downloadFile(assetUrl, destPath, onProgress);
}

module.exports = { checkForUpdates, downloadUpdate, installUpdate, isNewerThan };
