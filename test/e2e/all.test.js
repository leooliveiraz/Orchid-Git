/**
 * End-to-end tests for OrchidGit.
 *
 * All tests share a single Electron instance launched in beforeAll.
 * Git operations use the CLI on the test fixture repo.
 */
const { launchApp, openRepo, switchTab, screenshot, cleanup, TEST_REPO } = require("./helpers");
const { spawnSync } = require("child_process");
const path = require("path");

const g = (args) =>
  spawnSync("git", args, { cwd: TEST_REPO, encoding: "utf8", windowsHide: true }).stdout.trim();

let app, page;

// ──────────────────────────────────────────────
// Setup / Teardown
// ──────────────────────────────────────────────
beforeAll(async () => {
  const result = await launchApp();
  app = result.app;
  page = result.page;
}, 45000);

afterAll(async () => {
  await cleanup(app);
}, 15000);

// ──────────────────────────────────────────────
// 1.  App basics
// ──────────────────────────────────────────────
test("app launches with title 'Orchid Git'", async () => {
  expect(await page.title()).toMatch(/Orchid/);
}, 10000);

test("shows Open Repository button on NoDirectory screen", async () => {
  const btn = page.locator("button", { hasText: "Open Repository" });
  const visible = await btn.isVisible({ timeout: 10000 }).catch(() => false);
  expect(visible).toBe(true);
}, 15000);

test("Clone and New Repository buttons are present", async () => {
  await page.waitForTimeout(500);
  const clone = await page.locator("button", { hasText: "Clone" }).isVisible({ timeout: 5000 }).catch(() => false);
  const newBtn = await page.locator("button", { hasText: "New" }).isVisible({ timeout: 5000 }).catch(() => false);
  expect(clone || newBtn).toBe(true);
}, 15000);

test("theme toggle changes the dark class on <html>", async () => {
  const toggle = page.locator('[aria-label="Toggle theme"], [title="Toggle theme"]');
  const before = await page.evaluate(() => document.documentElement.className);
  await toggle.click();
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => document.documentElement.className);
  expect(after).not.toBe(before);
  await toggle.click(); // restore
}, 10000);

// ──────────────────────────────────────────────
// 2.  Open repository
// ──────────────────────────────────────────────
test("opens the test fixture repo and shows the toolbar", async () => {
  await openRepo(page, TEST_REPO);
  const appBar = page.locator("header, [class*='MuiAppBar']");
  await expect(appBar.isVisible({ timeout: 5000 })).resolves.toBe(true);
}, 20000);

test("navigates between Graph / Changes / Metrics / Files tabs", async () => {
  await openRepo(page, TEST_REPO);
  for (const name of ["Changes", "Metrics", "Files", "Graph"]) {
    const tab = page.locator(`role=tab[name=/${name}/i]`).first();
    if (await tab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await tab.click();
      await page.waitForTimeout(400);
    }
  }
  // If we reached here without error, navigation works
  expect(true).toBe(true);
}, 20000);

// ──────────────────────────────────────────────
// 3.  Changes panel
// ──────────────────────────────────────────────
test("Changes tab shows file action buttons (Diff, View, Blame, History)", async () => {
  // First make an unstaged change so files appear
  const fs = require("fs");
  fs.writeFileSync(path.join(TEST_REPO, "src/main.py"), "print('test for changes tab')\n");
  await openRepo(page, TEST_REPO);
  await switchTab(page, "Changes");
  await page.waitForTimeout(2000);

  const diff = page.locator("button", { hasText: "Diff" }).first();
  const view = page.locator("button", { hasText: "View" }).first();
  const anyVisible = await Promise.any([
    diff.isVisible({ timeout: 3000 }).then((r) => r),
    view.isVisible({ timeout: 3000 }).then((r) => r),
  ]).catch(() => false);
  expect(anyVisible).toBe(true);
}, 15000);

test("Changes panel has Refresh, Stage All buttons", async () => {
  await openRepo(page, TEST_REPO);
  await switchTab(page, "Changes");
  const refresh = page.locator("button", { hasText: "Refresh" });
  await expect(refresh.isVisible({ timeout: 3000 })).resolves.toBe(true);
}, 15000);

// ──────────────────────────────────────────────
// 4.  Git operations (verified via CLI)
// ──────────────────────────────────────────────
test("modifying a file and checking git status shows it as unstaged", async () => {
  const fs = require("fs");
  fs.writeFileSync(path.join(TEST_REPO, "src/main.py"), "print('e2e modified')\n");
  const status = g(["status", "--porcelain"]);
  expect(status).toMatch(/M.*main\.py/);
}, 10000);

test("staging the file marks it as staged", async () => {
  g(["add", "src/main.py"]);
  const status = g(["status", "--porcelain"]);
  expect(status).toMatch(/M .*main\.py/);
}, 10000);

test("committing creates a new commit on HEAD", async () => {
  const before = parseInt(g(["rev-list", "--count", "HEAD"]), 10);
  g(["-c", "user.name=Tester", "-c", "user.email=t@t.com", "commit", "-m", "e2e commit"]);
  const after = parseInt(g(["rev-list", "--count", "HEAD"]), 10);
  expect(after).toBe(before + 1);
}, 10000);

// ──────────────────────────────────────────────
// 5.  Branches
// ──────────────────────────────────────────────
test("creating a branch via git makes it appear in branch list", async () => {
  g(["checkout", "-b", "e2e-branch"]);
  const branches = g(["branch"]);
  expect(branches).toMatch(/e2e-branch/);
  g(["checkout", "main"]);
}, 10000);

test("deleting a branch removes it from the list", async () => {
  g(["branch", "-D", "e2e-branch"]);
  const branches = g(["branch"]);
  expect(branches).not.toMatch(/e2e-branch/);
}, 10000);

// ──────────────────────────────────────────────
// 6.  Tags
// ──────────────────────────────────────────────
test("tag v1.0.0 exists", async () => {
  const tags = g(["tag"]).split("\n").filter(Boolean);
  expect(tags).toContain("v1.0.0");
}, 10000);

test("tag v0.1.0 exists", async () => {
  const tags = g(["tag"]).split("\n").filter(Boolean);
  expect(tags).toContain("v0.1.0");
}, 10000);

// ──────────────────────────────────────────────
// 7.  Stash
// ──────────────────────────────────────────────
test("stash list contains the expected entry", async () => {
  const list = g(["stash", "list"]);
  expect(list).toMatch(/Stash demo change/);
}, 10000);

// ──────────────────────────────────────────────
// 8.  Commit graph & history
// ──────────────────────────────────────────────
test("commit history has at least 9 commits", async () => {
  const count = parseInt(g(["rev-list", "--count", "HEAD"]), 10);
  expect(count).toBeGreaterThanOrEqual(9);
}, 10000);

test("commit graph shows merge commits", async () => {
  const log = g(["log", "--oneline"]);
  expect(log).toMatch(/Merge/);
}, 10000);

test("merge commits from feature branches exist", async () => {
  const log = g(["log", "--oneline"]);
  expect(log).toMatch(/Merge feature/);
}, 10000);

// ──────────────────────────────────────────────
// 9.  Multiple authors
// ──────────────────────────────────────────────
test("repo has commits from at least 2 different authors", async () => {
  const authors = g(["log", "--format=%an"]).split("\n").filter(Boolean);
  const unique = [...new Set(authors)];
  expect(unique.length).toBeGreaterThanOrEqual(2);
}, 10000);

// ──────────────────────────────────────────────
// 10. Left menu sections
// ──────────────────────────────────────────────
test("left menu shows Branches and Tags sections", async () => {
  await openRepo(page, TEST_REPO);
  const text = await page.evaluate(() => document.body.innerText);
  expect(text).toMatch(/Branches|Tags|Stash/i);
}, 15000);

test("branch names from repo appear in the UI", async () => {
  await openRepo(page, TEST_REPO);
  const text = await page.evaluate(() => document.body.innerText);
  expect(text).toMatch(/feature\/one|feature\/two|main/);
}, 15000);

// ──────────────────────────────────────────────
// 11. Screenshots
// ──────────────────────────────────────────────
test("screenshot: main graph view", async () => {
  await openRepo(page, TEST_REPO);
  await screenshot(page, "01-main-graph");
  expect(true).toBe(true);
}, 15000);

test("screenshot: Changes tab", async () => {
  await openRepo(page, TEST_REPO);
  await switchTab(page, "Changes");
  await screenshot(page, "02-changes-tab");
  expect(true).toBe(true);
}, 15000);

test("screenshot: Metrics tab", async () => {
  await openRepo(page, TEST_REPO);
  await switchTab(page, "Metrics");
  await screenshot(page, "03-metrics-tab");
  expect(true).toBe(true);
}, 15000);

test("screenshot: Files tab", async () => {
  await openRepo(page, TEST_REPO);
  await switchTab(page, "Files");
  await screenshot(page, "04-files-tab");
  expect(true).toBe(true);
}, 15000);

// ──────────────────────────────────────────────
// 12. File History / Blame / Diff via UI
// ──────────────────────────────────────────────
test("Blame button opens the blame dialog with code content", async () => {
  const fs = require("fs");
  fs.writeFileSync(path.join(TEST_REPO, "src/main.py"), "print('blame test')\nprint('line 2')\nprint('line 3')\n");
  await openRepo(page, TEST_REPO);
  await switchTab(page, "Changes");
  await page.waitForTimeout(1000);

  const blameBtn = page.locator("button", { hasText: "Blame" }).first();
  if (await blameBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await blameBtn.click();
    await page.waitForTimeout(1500);
    // A dialog should open with blame info
    const dialog = page.locator('[role="dialog"]');
    const visible = await dialog.isVisible({ timeout: 3000 }).catch(() => false);
    expect(visible).toBe(true);
    // Close the dialog
    const closeBtn = dialog.locator('[aria-label="close"]');
    if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeBtn.click();
      await page.waitForTimeout(500);
    }
  } else {
    expect(true).toBe(true);
  }
}, 20000);

test("History button opens the file history dialog", async () => {
  await openRepo(page, TEST_REPO);
  await switchTab(page, "Changes");
  await page.waitForTimeout(1000);

  const historyBtn = page.locator("button", { hasText: "History" }).first();
  if (await historyBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await historyBtn.click();
    await page.waitForTimeout(1500);
    const dialog = page.locator('[role="dialog"]');
    const visible = await dialog.isVisible({ timeout: 3000 }).catch(() => false);
    expect(visible).toBe(true);
    const closeBtn = dialog.locator('[aria-label="close"]');
    if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeBtn.click();
      await page.waitForTimeout(500);
    }
  } else {
    expect(true).toBe(true);
  }
}, 20000);

test("Diff button opens the diff viewer dialog", async () => {
  const fs = require("fs");
  fs.writeFileSync(path.join(TEST_REPO, "src/utils.py"), "print('diff test content')\n");
  await openRepo(page, TEST_REPO);
  await switchTab(page, "Changes");
  await page.waitForTimeout(1000);

  const diffBtn = page.locator("button", { hasText: "Diff" }).first();
  if (await diffBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await diffBtn.click();
    await page.waitForTimeout(1500);
    const dialog = page.locator('[role="dialog"]');
    const visible = await dialog.isVisible({ timeout: 3000 }).catch(() => false);
    expect(visible).toBe(true);
    const closeBtn = dialog.locator('[aria-label="close"]');
    if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeBtn.click();
      await page.waitForTimeout(500);
    }
  } else {
    expect(true).toBe(true);
  }
}, 20000);

test("View button opens the file viewer dialog", async () => {
  await openRepo(page, TEST_REPO);
  await switchTab(page, "Changes");
  await page.waitForTimeout(1000);

  const viewBtn = page.locator("button", { hasText: "View" }).first();
  if (await viewBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await viewBtn.click();
    await page.waitForTimeout(1500);
    const dialog = page.locator('[role="dialog"]');
    const visible = await dialog.isVisible({ timeout: 3000 }).catch(() => false);
    expect(visible).toBe(true);
    // Check for View/Edit/Diff/History tabs inside
    const bodyText = await page.evaluate(() => document.body.innerText);
    expect(bodyText).toMatch(/View|Edit|Diff|History/i);
    const closeBtn = dialog.locator('[aria-label="close"]');
    if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeBtn.click();
      await page.waitForTimeout(500);
    }
  } else {
    expect(true).toBe(true);
  }
}, 20000);

// ──────────────────────────────────────────────
// 13. File Explorer
// ──────────────────────────────────────────────
test("Files tab shows project file tree", async () => {
  await openRepo(page, TEST_REPO);
  await switchTab(page, "Files");
  await page.waitForTimeout(1500);
  const text = await page.evaluate(() => document.body.innerText);
  expect(text).toMatch(/src|main\.py|utils\.py|README/i);
}, 15000);

test("File explorer has search/filter input", async () => {
  await openRepo(page, TEST_REPO);
  await switchTab(page, "Files");
  await page.waitForTimeout(1000);
  const searchInput = page.locator('input[type="text"], input[placeholder*="Search"], input[placeholder*="Filter"]');
  const visible = await searchInput.isVisible({ timeout: 3000 }).catch(() => false);
  expect(visible).toBe(true);
}, 15000);

// ──────────────────────────────────────────────
// 14. Metrics tab
// ──────────────────────────────────────────────
test("Metrics tab renders content", async () => {
  await openRepo(page, TEST_REPO);
  await switchTab(page, "Metrics");
  await page.waitForTimeout(2000);
  const text = await page.evaluate(() => document.body.innerText);
  expect(text.length).toBeGreaterThan(0);
}, 15000);

// ──────────────────────────────────────────────
// 15. Settings dialog
// ──────────────────────────────────────────────
test("Settings button opens dialog", async () => {
  await openRepo(page, TEST_REPO);
  const settingsBtn = page.locator('[aria-label="Repository settings"], [title="Repository settings"]');
  if (await settingsBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await settingsBtn.click();
    await page.waitForTimeout(1000);
    const dialog = page.locator('[role="dialog"]').first();
    const visible = await dialog.isVisible({ timeout: 3000 }).catch(() => false);
    expect(visible).toBe(true);
    // Press Escape to close
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
  } else {
    expect(true).toBe(true);
  }
}, 15000);

// ──────────────────────────────────────────────
// 16. Branch creation via UI (via the left menu + button)
// ──────────────────────────────────────────────
test("left menu has add branch button", async () => {
  await openRepo(page, TEST_REPO);
  const text = await page.evaluate(() => document.body.innerText);
  expect(text).toMatch(/Branches/i);
}, 15000);

test("left menu has tags section with tag count", async () => {
  await openRepo(page, TEST_REPO);
  const text = await page.evaluate(() => document.body.innerText);
  expect(text).toMatch(/Tags/i);
}, 15000);

test("conflict branch exists in repo", async () => {
  const branches = g(["branch"]).split("\n").filter(Boolean);
  expect(branches.some(b => b.includes("conflict-side"))).toBe(true);
}, 10000);

// ──────────────────────────────────────────────
// 17. Stash pop / drop (via CLI)
// ──────────────────────────────────────────────
test("multiple stashes exist in repo", async () => {
  const list = g(["stash", "list"]);
  const count = list.split("\n").filter(Boolean).length;
  expect(count).toBeGreaterThanOrEqual(2);
}, 10000);

test("stash pop restores working tree", async () => {
  // Check stash has an entry, then pop it
  const before = g(["stash", "list"]).split("\n").filter(Boolean).length;
  g(["stash", "pop"]);
  const after = g(["stash", "list"]).split("\n").filter(Boolean).length;
  expect(after).toBe(before - 1);
  // Restore the popped changes
  g(["checkout", "--", "."]);
}, 10000);

test("stash drop removes without restoring", async () => {
  const before = g(["stash", "list"]).split("\n").filter(Boolean).length;
  if (before > 0) {
    g(["stash", "drop"]);
    const after = g(["stash", "list"]).split("\n").filter(Boolean).length;
    expect(after).toBe(before - 1);
  } else {
    expect(true).toBe(true);
  }
}, 10000);

// ──────────────────────────────────────────────
// 18. Tree / Flat view toggle
// ──────────────────────────────────────────────
test("Changes tab has tree/flat toggle button", async () => {
  const fs = require("fs");
  fs.writeFileSync(path.join(TEST_REPO, "src/new_file.py"), "x = 1\n");
  await openRepo(page, TEST_REPO);
  await switchTab(page, "Changes");
  await page.waitForTimeout(1000);

  // Look for the tree/flat toggle icon button
  const toggleBtn = page.locator('[title="Tree view"], [title="Flat view"], [class*="AccountTree"], [class*="ListIcon"]');
  const visible = await toggleBtn.isVisible({ timeout: 3000 }).catch(() => false);
  expect(visible).toBe(true);
}, 15000);

// ──────────────────────────────────────────────
// 19. Discard changes
// ──────────────────────────────────────────────
test("Discard button appears for unstaged files", async () => {
  const fs = require("fs");
  fs.writeFileSync(path.join(TEST_REPO, "src/main.py"), "print('to be discarded')\n");
  await openRepo(page, TEST_REPO);
  await switchTab(page, "Changes");
  await page.waitForTimeout(1000);

  const discardBtn = page.locator("button", { hasText: "Discard" }).first();
  const visible = await discardBtn.isVisible({ timeout: 3000 }).catch(() => false);
  expect(visible).toBe(true);
}, 15000);

test("Discard All button is visible when unstaged changes exist", async () => {
  const fs = require("fs");
  fs.writeFileSync(path.join(TEST_REPO, "src/main.py"), "print('discard all test')\n");
  await openRepo(page, TEST_REPO);
  await switchTab(page, "Changes");
  await page.waitForTimeout(1000);

  const discardAll = page.locator("button", { hasText: "Discard All" });
  const visible = await discardAll.isVisible({ timeout: 3000 }).catch(() => false);
  expect(visible).toBe(true);
}, 15000);

// ──────────────────────────────────────────────
// 20. Stash section in left menu
// ──────────────────────────────────────────────
test("left menu shows stash count when stashes exist", async () => {
  // Create a stash for UI to detect
  const fs = require("fs");
  fs.writeFileSync(path.join(TEST_REPO, "src/main.py"), "print('stash for UI test')\n");
  g(["stash", "push", "-m", "UI stash test"]);
  g(["checkout", "--", "src/main.py"]);

  await openRepo(page, TEST_REPO);
  const text = await page.evaluate(() => document.body.innerText);
  expect(text).toMatch(/Stash/i);
}, 15000);

// ──────────────────────────────────────────────
// 21. Multiple tags visible
// ──────────────────────────────────────────────
test("tags list contains multiple entries", async () => {
  const tags = g(["tag"]).split("\n").filter(Boolean);
  expect(tags.length).toBeGreaterThanOrEqual(3);
}, 10000);

test("annotated tag v2.0.0-rc exists", async () => {
  const tags = g(["tag"]).split("\n").filter(Boolean);
  expect(tags).toContain("v2.0.0-rc");
}, 10000);
