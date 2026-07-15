import React, { useEffect, useState, useMemo, useCallback, useContext } from "react";
import { OrchidContext } from "./OrchidContext.jsx";
import LeftMenu from "./components/LeftMenu.jsx";
import { Box, CssBaseline, Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, TextField, LinearProgress } from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import MainArea from "./components/MainArea.jsx";
import AppMenu from "./components/AppMenu.jsx";

const BACKGROUND_FETCH_INTERVAL_MS = 5 * 60 * 1000;

async function fetchRepoData(directory) {
  if (!directory || !window.api) return null;
  try {
    const [branches, remoteBranches, tags, stashList, currentBranch, aheadBehind, branchesStatus] = await Promise.all([
      window.api.getBranches(directory),
      window.api.getRemoteBranches(directory),
      window.api.getTags(directory),
      window.api.getStashList(directory),
      window.api.getCurrentBranch(directory),
      window.api.getAheadBehind(directory).catch(() => ({ ahead: 0, behind: 0 })),
      window.api.getBranchesAheadBehind(directory).catch(() => []),
    ]);
    return { branches, remoteBranches, tags, stashList, currentBranch, ahead: aheadBehind.ahead, behind: aheadBehind.behind, branchesStatus };
  } catch {
    return null;
  }
}

function RebaseEditDialog() {
  const { rebaseEditRequest, setRebaseEditRequest } = useContext(OrchidContext);
  const [edited, setEdited] = useState("");

  useEffect(() => {
    if (rebaseEditRequest) setEdited(rebaseEditRequest.content || "");
  }, [rebaseEditRequest]);

  const handleConfirm = () => {
    if (window.api?.sendRebaseEditResponse) {
      window.api.sendRebaseEditResponse({ content: edited });
    }
    setRebaseEditRequest(null);
  };

  return (
    <Dialog open={!!rebaseEditRequest} onClose={() => {}} maxWidth="md" fullWidth disableEscapeKeyDown>
      <DialogTitle>Edit commit message</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          multiline
          minRows={6}
          maxRows={15}
          value={edited}
          onChange={e => setEdited(e.target.value)}
          sx={{ fontFamily: "monospace", fontSize: "0.85rem", mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleConfirm} variant="contained">Use this message</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function Orchid() {
  const [directory, setDirectory] = useState(() => localStorage.getItem("orchid-last-dir") || "");
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem("orchid-theme") || "light");
  const [menuOpen, setMenuOpen] = useState(true);
  const [repoData, setRepoData] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [notRepo, setNotRepo] = useState(null);
  const [recentDirs, setRecentDirs] = useState(() => {
    try { return JSON.parse(localStorage.getItem("orchid-recent-dirs") || "[]"); }
    catch { return []; }
  });
  const [recentSort, setRecentSort] = useState(() => localStorage.getItem("orchid-recent-sort") || "recent");
  const [tabSignal, setTabSignal] = useState(null);
  const [syncWarning, setSyncWarning] = useState(null);
  const [isMerging, setIsMerging] = useState(false);
  const [isReverting, setIsReverting] = useState(false);
  const [rebaseEditRequest, setRebaseEditRequest] = useState(null);
  const [scrollToCommitHash, setScrollToCommitHash] = useState(null);
  const [viewCommit, setViewCommit] = useState(null);
  const [dateFormat, setDateFormat] = useState(() => localStorage.getItem("orchid-date-format") || "");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem("orchid-date-format", dateFormat);
  }, [dateFormat]);

  useEffect(() => {
    if (!window.api?.onRebaseEditRequest) return;
    const cleanup = window.api.onRebaseEditRequest((data) => {
      setRebaseEditRequest(data);
    });
    return cleanup;
  }, []);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  const addRecentDir = useCallback((dir) => {
    if (!dir) return;
    setRecentDirs(prev => {
      const next = [dir, ...prev.filter(d => d !== dir)].slice(0, 8);
      localStorage.setItem("orchid-recent-dirs", JSON.stringify(next));
      return next;
    });
  }, []);

  const removeRecentDir = useCallback((dir) => {
    setRecentDirs(prev => {
      const next = prev.filter(d => d !== dir);
      localStorage.setItem("orchid-recent-dirs", JSON.stringify(next));
      return next;
    });
  }, []);

  const handleSetRecentSort = useCallback((sort) => {
    setRecentSort(sort);
    localStorage.setItem("orchid-recent-sort", sort);
  }, []);

  useEffect(() => {
    if (directory) {
      localStorage.setItem("orchid-last-dir", directory);
      addRecentDir(directory);
      window.api?.writeLastDirectory(directory);
    }
  }, [directory, addRecentDir]);

  useEffect(() => {
    localStorage.setItem("orchid-theme", themeMode);
    document.documentElement.className = themeMode === "dark" ? "dark" : "";
  }, [themeMode]);

  useEffect(() => {
    if (directory) {
      setIsLoading(true);
      setNotRepo(null);
      (async () => {
        const isRepo = window.api ? await window.api.isGitRepo(directory).catch(() => false) : false;
        if (!isRepo) { setNotRepo(true); setIsLoading(false); return; }
        setNotRepo(false);
        const data = await fetchRepoData(directory);
        if (data) setRepoData(data);
        setIsLoading(false);
      })();
    }
  }, [directory, refreshKey]);

  useEffect(() => {
    function handler(e) {
      if (e.key === "F5") {
        e.preventDefault();
        refresh();
      }
      if (e.key === "F12") {
        e.preventDefault();
        window.api?.openDevTools();
      }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [refresh]);

  useEffect(() => {
    if (!directory || notRepo !== false) return;

    let mounted = true;

    async function backgroundFetch() {
      if (!window.api?.fetch) return;
      try {
        await window.api.fetch(directory);
        if (!mounted) return;

        const data = await fetchRepoData(directory);
        if (data && mounted) setRepoData(data);
      } catch (e) {
        if (mounted) setSyncWarning(`Background fetch failed: ${e.message}`);
      }
    }

    backgroundFetch();
    const intervalId = setInterval(backgroundFetch, BACKGROUND_FETCH_INTERVAL_MS);
    return () => { mounted = false; clearInterval(intervalId); };
  }, [directory, notRepo]);

  const toggleTheme = () => {
    setThemeMode((prev) => (prev === "light" ? "dark" : "light"));
  };

  const theme = useMemo(() => createTheme({
    palette: {
      mode: themeMode,
      ...(themeMode === "light"
        ? {
          primary: { main: "#1976d2" },
          background: { default: "#f5f5f5", paper: "#ffffff" },
        }
        : {
          primary: { main: "#90caf9" },
          background: { default: "#121212", paper: "#1e1e1e" },
        }),
    },
    typography: {
      fontFamily: '"Roboto","-apple-system","BlinkMacSystemFont","Segoe UI",sans-serif',
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
      body2: { fontSize: "0.875rem" },
    },
    shape: { borderRadius: 10 },
    components: {
      MuiButton: {
        styleOverrides: {
          root: { textTransform: "none", borderRadius: 8 },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottom: "1px solid var(--border-color)",
            color: "var(--text-primary)",
            padding: "6px 12px",
            whiteSpace: "nowrap",
          },
          head: {
            fontWeight: 600,
            backgroundColor: "var(--bg-table-alt)",
            position: "sticky",
            top: 0,
            zIndex: 100,
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            "&:hover": {
              backgroundColor: "var(--bg-table-alt)",
              "& td": { backgroundColor: "var(--bg-table-alt)" },
            },
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: { borderRadius: 12 },
        },
      },
      MuiAccordion: {
        styleOverrides: {
          root: {
            boxShadow: "none",
            "&:before": { display: "none" },
            borderBottom: "1px solid var(--border-color)",
            backgroundColor: "transparent",
            "&.Mui-expanded": { margin: 0 },
          },
        },
      },
      MuiAccordionSummary: {
        styleOverrides: {
          root: {
            minHeight: 40,
            "&.Mui-expanded": { minHeight: 40 },
          },
          content: {
            "&.Mui-expanded": { margin: 0 },
          },
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            textTransform: "none",
            fontSize: "0.75rem",
            padding: "2px 10px",
          },
        },
      },
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            overflow: "hidden",
          },
        },
      },
    },
  }), [themeMode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <OrchidContext.Provider value={{ directory, setDirectory, themeMode, toggleTheme, repoData, setRepoData, menuOpen, setMenuOpen, refresh, refreshKey, recentDirs, notRepo, setNotRepo, removeRecentDir, recentSort, setRecentSort: handleSetRecentSort, tabSignal, setTabSignal, syncWarning, setSyncWarning, isMerging, setIsMerging, isReverting, setIsReverting, rebaseEditRequest, setRebaseEditRequest, scrollToCommitHash, setScrollToCommitHash, viewCommit, setViewCommit, dateFormat, setDateFormat, isLoading, setIsLoading }}>
        <Box sx={{ height: "100vh", display: "flex", flexDirection: "column", position: "relative" }}>
          <AppMenu onToggleMenu={() => setMenuOpen(prev => !prev)} />
          {isLoading && <LinearProgress sx={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 2000 }} />}
          <Box sx={{ display: "flex", flex: 1, overflow: "hidden" }}>
            <LeftMenu open={menuOpen} />
            <MainArea />
          </Box>
        </Box>

        <RebaseEditDialog />
      </OrchidContext.Provider>
    </ThemeProvider>
  );
}
