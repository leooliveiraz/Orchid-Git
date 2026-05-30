# Orchid Git

A desktop Git GUI built with Electron, React, MUI 6, and Node.js.

## Features

- **Commit graph** — SVG visualization with 7 connection styles, colored lanes, branch/tag labels
- **Branch management** — Create, delete, rename, switch, merge, interactive rebase, cherry-pick
- **Stage/Unstage/Commit** — Full UI for managing changes, including per-file and per-hunk staging
- **Push/Pull/Fetch** — Remote sync with automatic upstream configuration
- **Stash** — Push, pop, drop with message support
- **Tags** — Create and delete annotated and lightweight tags
- **Diff & Blame** — Unified/split diff view, blame with per-commit coloring
- **File Explorer** — Tree/flat/compact navigation with search/filter
- **Conflict Resolver** — Block-level conflict resolution (keep ours/theirs/both)
- **Metrics** — Charts for commits per day/author, top committers, grouped by day/week/month/year
- **Dark/Light theme** — Toggle persisted in localStorage
- **Multiple tabs** — Graph, Changes, Metrics, Files

## Built with

| Layer | Stack |
|---|---|
| Frontend | React 18 + MUI 6 + Emotion + Recharts |
| Desktop | Electron 33 + Electron Forge + Webpack |
| Unit tests | Jest + Testing Library (96 tests, 11 suites) |
| E2E tests | Playwright + Jest (46 tests) |
| Git | `spawnSync` via IPC, `git blame --line-porcelain`, `git diff -U0` |

## Project structure

```
src/
├── main.js               # Electron main process (~50 IPC handlers)
├── preload.js            # Bridge between renderer and main (45+ methods)
├── renderer.js           # React entry point
├── app/
│   ├── Orchid.jsx        # Root component (theme, global state, refresh)
│   ├── OrchidContext.jsx # React context (directory, theme, repo data)
│   └── components/       # UI components
│       ├── Repository.jsx        # Tab container (Graph/Changes/Metrics/Files)
│       ├── GitGraph.jsx          # SVG commit graph
│       ├── CommitTable.jsx       # Commit table
│       ├── ChangesPanel.jsx      # Stage/unstage, Diff, Blame, Discard
│       ├── LeftMenu.jsx          # Side menu (branches, tags, stash, recent)
│       ├── AppMenu.jsx           # Top toolbar
│       ├── CodeEditor.jsx        # Text editor with gutter and highlights
│       ├── DiffViewer.jsx        # Unified/split diff viewer
│       ├── BlameViewer.jsx       # Blame visualizer
│       ├── FileExplorer.jsx      # File tree/flat/compact explorer
│       ├── MetricsPanel.jsx      # Charts and statistics
│       ├── ConflictResolver.jsx  # Conflict resolution UI
│       └── ... (dialogs: Commit, Merge, Rebase, Settings, Clone, etc.)
└── assets/
    └── icon.png           # App icon
```

## Requirements

- Node.js 18+ (tested on 24.15.0)
- Git 2.30+
- npm 9+ or yarn

## Installation

```bash
git clone https://github.com/your-username/orchid-git.git
cd orchid-git
npm install
npm start
```

## Available commands

```bash
npm start           # Start in development mode (hot reload)
npm test            # Run unit tests (96 tests)
npm run test:e2e    # Run end-to-end tests (46 tests)
npm run package     # Package for the current platform
npm run make        # Generate installers (Squirrel/Windows, DMG/macOS, DEB/Linux)
```

## Testing

### Unit tests

```bash
npm test
```

Uses Jest + Testing Library. Tests React components, parsers (git status, stash list), and dialogs in isolation without Electron.

### E2E tests

```bash
# Run everything (setup + tests)
npm run test:e2e

# Or step by step:
npm run test:e2e:setup                                    # Create test repo only
npx jest --config test/e2e/jest.e2e.config.js --runInBand  # Run tests only
```

E2E tests use Playwright to drive the Electron window:
1. Starts a static HTTP server for the webpack bundle (port 3000)
2. Launches Electron
3. Interacts with the UI (clicks, navigation, content verification)
4. Also runs git commands directly to verify repository state

## Building

```bash
# Package for current platform
npm run package

# Generate installer
npm run make
```

Artifacts are placed in `out/`:
- Windows: `out/orchid-win32-x64/` (or .exe with `npm run make`)
- macOS: `out/orchid-darwin-x64/`
- Linux: `out/orchid-linux-x64/`

## E2E test repository

The script `test/e2e/global-setup.js` creates a test Git repo at `test/test-fixture-repo/` with:

- **9+ commits** with merge history
- **7 branches**: `feature/one`, `feature/two`, `feature/validation`, `feature/api`, `feature/database`, `feature/export`, `feature/conflict-side`
- **5+ tags**: `v0.1.0`, `v1.0.0`, `v1.1.0`, `v2.0.0-rc`
- **3 stashes**
- **4 authors**: Alice Silva, Bob Santos, Carol Oliveira, Dave Pereira
- **Renamed files**: `string_ops.py → text_ops.py`
- **Moved files**: `validators.py → src/utils/`
- **Conflict scenario**: `feature/conflict-side` with conflicting changes in `src/main.py`

## LGPD (Brazilian Data Protection)

OrchidGit is a fully local desktop application. It:
- Does **not** collect personal data
- Does **not** send information to external servers
- Does **not** have user accounts or analytics
- Stores only local preferences (theme, recent directories) in `localStorage`
- All remote Git operations are user-initiated and user-controlled

## License

MIT
