const { _electron: electron } = require("playwright");
const path = require("path");
const { startRendererServer, stopRendererServer } = require("./renderer-server");

const ROOT = path.resolve(__dirname, "../..");
const TEST_REPO = path.join(ROOT, "test", "test-fixture-repo");

let serverProcess = null;

/**
 * Ensure the renderer static server is running on port 3000.
 */
async function ensureServer() {
  if (!serverProcess) {
    serverProcess = await startRendererServer();
    await new Promise((r) => setTimeout(r, 3000));
  }
}

/**
 * Launch the OrchidGit Electron app via Playwright.
 * Returns { app, page } where page is the main app window.
 */
async function launchApp() {
  await ensureServer();

  const app = await electron.launch({
    executablePath: require("electron"),
    args: ["."],
    cwd: ROOT,
    env: { ...process.env },
  });

  // DevTools opens first; wait for the main app window
  await new Promise((r) => setTimeout(r, 5000));

  let page = null;
  for (const w of app.windows()) {
    const url = w.url();
    if (url && !url.includes("devtools") && !url.includes("chrome-error") && !url.includes("about:blank")) {
      page = w;
      break;
    }
  }
  if (!page) {
    page = await app.firstWindow();
  }

  // Clear localStorage so the app starts on NoDirectory screen
  await page.evaluate(() => {
    localStorage.removeItem("orchid-last-dir");
    localStorage.removeItem("orchid-recent-dirs");
  });

  // Reload to apply the cleared state
  await page.reload();
  await page.waitForTimeout(3000);

  // Wait until the React shell renders
  try {
    await page.waitForFunction(
      () => {
        const t = document.body?.innerText || "";
        return t.length > 0 || document.querySelectorAll("button").length > 0;
      },
      { timeout: 15000 }
    );
  } catch {
    await page.waitForTimeout(3000);
  }

  return { app, page };
}

/**
 * Open a repository in OrchidGit by clicking "Open Repository"
 * and overriding the native file dialog.
 */
async function openRepo(page, repoPath = TEST_REPO) {
  // Set the directory in localStorage and reload so the app opens it directly
  await page.evaluate((dir) => {
    localStorage.setItem("orchid-last-dir", dir);
  }, repoPath);
  await page.reload();
  await page.waitForTimeout(3000);

  // Wait for the repository content to load (toolbar + tabs)
  try {
    await page.waitForFunction(
      () => {
        const text = document.body?.innerText || "";
        return text.includes("Graph") || text.includes("Changes") || text.includes("Refresh");
      },
      { timeout: 15000 }
    );
  } catch {
    await page.waitForTimeout(3000);
  }
}

/**
 * Switch to a tab in the main content area by visible text.
 */
async function switchTab(page, tabName) {
  const tab = page.locator(`role=tab[name=/${tabName}/i]`).first();
  if (await tab.isVisible({ timeout: 2000 }).catch(() => false)) {
    await tab.click();
  }
  await page.waitForTimeout(500);
}

/**
 * Take a screenshot, saved in test/e2e/screenshots/.
 */
async function screenshot(page, name) {
  const fs = require("fs");
  const dir = path.join(ROOT, "test", "e2e", "screenshots");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: path.join(dir, `${name}.png`) });
}

/**
 * Close the Electron app.
 */
async function closeApp(app) {
  try {
    await app.close();
  } catch {}
}

/**
 * Full cleanup: close app + stop renderer server.
 */
async function cleanup(app) {
  if (app) await closeApp(app);
  stopRendererServer();
  serverProcess = null;
}

module.exports = {
  launchApp, ensureServer, openRepo, switchTab, screenshot, closeApp, cleanup,
  TEST_REPO, ROOT,
};
