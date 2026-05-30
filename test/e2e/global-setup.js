/**
 * Global setup for e2e tests.
 * Creates the test fixture repository with branches, tags, stash, and history.
 */
const { spawnSync, execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const TEST_REPO = path.resolve(__dirname, "../test-fixture-repo");

function git(args, opts = {}) {
  const result = spawnSync("git", args, {
    cwd: opts.cwd || TEST_REPO,
    encoding: "utf8",
    windowsHide: true,
    ...opts,
  });
  if (result.status !== 0 && !opts.ignoreError) {
    const msg = result.stderr?.slice(0, 300) || result.stdout?.slice(0, 300) || "unknown error";
    throw new Error(`git ${args.join(" ")} failed: ${msg}`);
  }
  return result.stdout?.trim() || "";
}

function writeFile(name, content) {
  const fullPath = path.join(TEST_REPO, name);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(fullPath, content, "utf8");
}

async function setupTestRepo() {
  if (fs.existsSync(TEST_REPO)) {
    fs.rmSync(TEST_REPO, { recursive: true, force: true });
  }
  fs.mkdirSync(TEST_REPO, { recursive: true });

  // Init
  git(["init"]);
  git(["config", "user.name", "Alice Silva"]);
  git(["config", "user.email", "alice@example.com"]);

  // Root commit
  writeFile("README.md", "# Test Repo\n\nE2E test fixture.\n");
  writeFile("src/main.py", "print('hello')\n");
  writeFile("src/utils.py", "def util():\n    return 42\n");
  writeFile("tests/test_main.py", "def test_pass():\n    assert True\n");
  writeFile(".gitignore", "__pycache__/\n*.pyc\n");
  git(["add", "-A"]);
  git(["commit", "-m", "Initial commit"]);
  git(["tag", "v0.1.0", "-m", "First tag"]);

  // feature/one branch
  git(["checkout", "-b", "feature/one"]);
  writeFile("src/auth.py", "class Auth:\n    pass\n");
  git(["add", "-A"]);
  git(["-c", "user.name=Bob Santos", "-c", "user.email=bob@example.com", "commit", "-m", "Add auth module by Bob"]);

  // feature/two branch from main
  git(["checkout", "main"]);
  git(["checkout", "-b", "feature/two"]);
  writeFile("src/api.py", "def api():\n    return {}\n");
  git(["add", "-A"]);
  git(["-c", "user.name=Carol Oliveira", "-c", "user.email=carol@example.com", "commit", "-m", "Add API module by Carol"]);

  // Merge feature/one into main
  git(["checkout", "main"]);
  git(["merge", "feature/one", "--no-ff", "-m", "Merge feature/one"]);
  git(["tag", "v1.0.0", "-m", "Release v1.0.0"]);

  // Merge feature/two into main
  git(["merge", "feature/two", "--no-ff", "-m", "Merge feature/two"]);

  // More commits on main
  writeFile("src/config.py", "DEBUG = True\n");
  git(["add", "-A"]);
  git(["commit", "-m", "Add config module"]);

  // Stash
  writeFile("src/main.py", "print('modified for stash')\n");
  git(["stash", "push", "-m", "Stash demo change"]);
  git(["checkout", "--", "src/main.py"]);

  // Second stash
  writeFile("src/auth.py", "class Auth:\n    x = 1\n");
  git(["stash", "push", "-m", "WIP: auth changes"]);
  git(["checkout", "--", "src/auth.py"]);

  // Third stash (for pop/drop tests)
  writeFile("src/api.py", "def new_endpoint():\n    pass\n");
  git(["stash", "push", "-m", "WIP: new endpoint"]);
  git(["checkout", "--", "src/api.py"]);

  // ── Conflict scenario ──
  git(["checkout", "-b", "feature/conflict-side"]);
  writeFile("src/main.py", "print('conflict side branch')\ndef conflict_func():\n    return 'from conflict side'\n");
  git(["add", "-A"]);
  git(["commit", "-m", "Conflict side change"]);

  git(["checkout", "main"]);
  writeFile("src/main.py", "print('main branch')\ndef conflict_func():\n    return 'from main'\n");
  git(["add", "-A"]);
  git(["commit", "-m", "Main change for conflict scenario"]);

  // Tag for branch creation tests
  git(["tag", "v2.0.0-rc", "-m", "Release candidate 2.0.0"]);

  // Annotated tag for tag tests
  writeFile("CHANGELOG.md", "# Changelog\n\n## v2.0.0\n- Feature one\n- Feature two\n");
  git(["add", "-A"]);
  git(["commit", "-m", "Add changelog"]);

  console.log(`Test repo created at ${TEST_REPO}`);
  return TEST_REPO;
}

module.exports = setupTestRepo;

if (require.main === module) {
  setupTestRepo().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
}
