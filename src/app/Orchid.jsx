import React, { useEffect, useState, useMemo, useCallback } from "react";
import { OrchidContext } from "./OrchidContext.jsx";
import LeftMenu from "./components/LeftMenu.jsx";
import { Box } from "@mui/material";
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

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  useEffect(() => {
    if (directory) localStorage.setItem("orchid-last-dir", directory);
  }, [directory]);

  useEffect(() => {
    localStorage.setItem("orchid-theme", themeMode);
    document.documentElement.className = themeMode === "dark" ? "dark" : "";
  }, [themeMode]);

  useEffect(() => {
    if (directory) {
      setRepoData(null);
      fetchRepoData(directory).then(setRepoData);
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

  const theme = useMemo(() => createTheme({ palette: { mode: themeMode } }), [themeMode]);

  return (
    <ThemeProvider theme={theme}>
      <OrchidContext.Provider value={{ directory, setDirectory, themeMode, toggleTheme, repoData, setRepoData, menuOpen, setMenuOpen }}>
        <Box sx={{ flexGrow: 1 }}>
          <AppMenu onToggleMenu={() => setMenuOpen(prev => !prev)}></AppMenu>
          <Box sx={{ display: "flex" }}>
            <LeftMenu open={menuOpen} onRefresh={refresh}></LeftMenu>
            <MainArea>
              <h1>Orchid!</h1>
              <h2>Your git ui system</h2>
            </MainArea>
          </Box>
        </Box>
      </OrchidContext.Provider>
    </ThemeProvider>
  );
}
