const fs = require("node:fs");
const path = require("node:path");

const REPO = "leooliveiraz/orchid-page";
const VERSION = require("../package.json").version;
const TAG = `v${VERSION}`;
const TOKEN = process.env.GITHUB_TOKEN;
const API = "https://api.github.com";

const ASSET_EXTENSIONS = [".exe", ".nupkg", ".msi", ".deb", ".rpm", ".zip", ".dmg", ".AppImage", ".yml"];
const ASSET_NAMES = ["RELEASES"];

function findArtifacts() {
  const makeDir = path.join(__dirname, "..", "out", "make");
  if (!fs.existsSync(makeDir)) return [];
  const artifacts = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (
        ASSET_EXTENSIONS.some(ext => entry.name.toLowerCase().endsWith(ext.toLowerCase()))
        || ASSET_NAMES.includes(entry.name)
      ) {
        artifacts.push(full);
      }
    }
  };
  walk(makeDir);
  return artifacts;
}

async function api(pathname, options = {}) {
  const res = await fetch(`${API}${pathname}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "Orchid-Git-Publish",
      ...(options.headers || {}),
    },
  });
  if (!res.ok && res.status !== 404) {
    const body = await res.text();
    throw new Error(`GitHub API ${options.method || "GET"} ${pathname} -> ${res.status}: ${body}`);
  }
  return res;
}

async function uploadAsset(releaseId, filePath) {
  const name = path.basename(filePath);
  const content = fs.readFileSync(filePath);
  const res = await fetch(`${API}/repos/${REPO}/releases/${releaseId}/assets?name=${encodeURIComponent(name)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "Orchid-Git-Publish",
      "Content-Type": "application/octet-stream",
    },
    body: content,
  });
  if (!res.ok && res.status !== 422) {
    const body = await res.text();
    throw new Error(`Asset upload ${name} -> ${res.status}: ${body}`);
  }
  return res.status === 422 ? { skipped: true } : { skipped: false };
}

async function main() {
  if (!TOKEN) {
    console.error("Set the GITHUB_TOKEN environment variable (needs repo scope).");
    process.exit(1);
  }
  const artifacts = findArtifacts();
  if (artifacts.length === 0) {
    console.error("No artifacts found in out/make. Run 'yarn make' first.");
    process.exit(1);
  }

  console.log(`Publishing ${VERSION} to ${REPO} (${artifacts.length} artifact(s))...`);

  let releaseId;
  let url;

  const byTag = await api(`/repos/${REPO}/releases/tags/${TAG}`);
  if (byTag.status === 404) {
    const res = await api(`/repos/${REPO}/releases`, {
      method: "POST",
      body: JSON.stringify({
        tag_name: TAG,
        name: `Orchid Git ${VERSION}`,
        body: `Release ${VERSION} of Orchid Git.`,
        draft: true,
      }),
    });
    if (res.status === 422) {
      const existing2 = await api(`/repos/${REPO}/releases/tags/${TAG}`);
      const data = await existing2.json();
      releaseId = data.id;
      url = data.html_url;
      console.log(`Release already created by another job, using existing: ${url}`);
    } else {
      const data = await res.json();
      releaseId = data.id;
      url = data.html_url;
      console.log(`Created release ${url}`);
    }
  } else {
    const data = await byTag.json();
    releaseId = data.id;
    url = data.html_url;
    console.log(`Release already exists, updating assets: ${url}`);
  }

  for (const file of artifacts) {
    const result = await uploadAsset(releaseId, file);
    console.log(`  ${result.skipped ? "skipped (already exists)" : "uploaded"}: ${path.basename(file)}`);
  }

  const final = await api(`/repos/${REPO}/releases/${releaseId}`, {
    method: "PATCH",
    body: JSON.stringify({ draft: false }),
  });
  const data = await final.json();
  console.log(`\nPublished: ${data.html_url}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
