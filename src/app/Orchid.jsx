import React, { useEffect, useState, useMemo, useCallback } from "react";
import { OrchidContext } from "./OrchidContext.jsx";
import LeftMenu from "./components/LeftMenu.jsx";
import { Box, CssBaseline } from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import MainArea from "./components/MainArea.jsx";
import AppMenu from "./components/AppMenu.jsx";

async function fetchRepoData(directory) {
  if (!directory || !window.api) return null;
  try {
    const [branches, remoteBranches, tags, stashList, currentBranch] = await Promise.all([
      window.api.getBranches(directory),
      window.api.getRemoteBranches(directory),
      window.api.getTags(directory),
      window.api.getStashList(directory),
      window.api.getCurrentBranch(directory),
    ]);
    return { branches, remoteBranches, tags, stashList, currentBranch };
  } catch {
    return null;
  }
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
    }
  }, [directory, addRecentDir]);

  useEffect(() => {
    localStorage.setItem("orchid-theme", themeMode);
    document.documentElement.className = themeMode === "dark" ? "dark" : "";
  }, [themeMode]);

  useEffect(() => {
    if (directory) {
      setRepoData(null);
      setNotRepo(null);
      (async () => {
        const isRepo = window.api ? await window.api.isGitRepo(directory).catch(() => false) : false;
        if (!isRepo) { setNotRepo(true); return; }
        setNotRepo(false);
        const data = await fetchRepoData(directory);
        if (data) setRepoData(data);
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
      <OrchidContext.Provider value={{ directory, setDirectory, themeMode, toggleTheme, repoData, setRepoData, menuOpen, setMenuOpen, refresh, refreshKey, recentDirs, notRepo, setNotRepo, removeRecentDir, recentSort, setRecentSort: handleSetRecentSort, tabSignal, setTabSignal }}>
        <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
          <AppMenu onToggleMenu={() => setMenuOpen(prev => !prev)} />
          <Box sx={{ display: "flex", flex: 1, overflow: "hidden" }}>
            <LeftMenu open={menuOpen} />
            <MainArea />
          </Box>
        </Box>
      </OrchidContext.Provider>
    </ThemeProvider>
  );
}
