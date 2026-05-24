import React,{ createContext } from "react";

export const OrchidContext = createContext({
  directory: "",
  setDirectory: () => {},
  themeMode: "light",
  toggleTheme: () => {},
  repoData: null,
  setRepoData: () => {},
  menuOpen: true,
  setMenuOpen: () => {},
  refresh: () => {},
  refreshKey: 0,
  recentDirs: [],
  notRepo: null,
  setNotRepo: () => {},
});