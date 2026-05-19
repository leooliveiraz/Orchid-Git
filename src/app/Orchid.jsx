import React, { useEffect, useState, useMemo } from "react";
import { OrchidContext } from "./OrchidContext.jsx";
import LeftMenu from "./components/LeftMenu.jsx";
import { Box } from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import MainArea from "./components/MainArea.jsx";
import AppMenu from "./components/AppMenu.jsx";
export default function Orchid() {
  const [directory, setDirectory] = useState(() => localStorage.getItem("orchid-last-dir") || "");
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem("orchid-theme") || "light");

  const toggleTheme = () => {
    setThemeMode((prev) => (prev === "light" ? "dark" : "light"));
  };

  useEffect(() => {
    if (directory) localStorage.setItem("orchid-last-dir", directory);
  }, [directory]);

  useEffect(() => {
    localStorage.setItem("orchid-theme", themeMode);
    document.documentElement.className = themeMode === "dark" ? "dark" : "";
  }, [themeMode]);

  useEffect(() => {
    function keyDown(e) {
      let charStr,
        key = e.which || e.keyCode;
      if (key >= 112 && key <= 123) {
        e.preventDefault();
        e.stopPropagation();
        charStr = "F" + (key - 111);
        if (charStr === "F12") {
          window.api?.openDevTools();
        }
      }
    }
    document.addEventListener("keydown", keyDown);
    return () => {
      document.removeEventListener("keydown", keyDown);
    };
  }, []);

  const theme = useMemo(() => createTheme({ palette: { mode: themeMode } }), [themeMode]);

  return (
    <ThemeProvider theme={theme}>
      <OrchidContext.Provider value={{ directory, setDirectory, themeMode, toggleTheme }}>
        <Box sx={{ flexGrow: 1 }}>
          <AppMenu></AppMenu>
          <Box sx={{ display: "flex" }}>
            {/* <LeftMenu></LeftMenu> */}
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
