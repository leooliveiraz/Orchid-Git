import {
  AppBar,
  Box,
  Button,
  IconButton,
  Toolbar,
  Typography,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import React, { useContext } from "react";
import { OrchidContext } from "../OrchidContext.jsx";
import "./AppMenu.css"

export default function AppMenu() {
  const { directory, setDirectory, themeMode, toggleTheme } = useContext(OrchidContext);
  
  function selectDirectory() {
    window.api.selectDirectory("").then((data) => {
      if(!data.canceled){
        const path = data.filePaths[0];
        setDirectory(path)
      }
    })
  }
  
  return (
    <Box sx={{ flexGrow: 1 }} className="app-menu">
      <AppBar position="relative" >
        <Toolbar>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h5" component="div" sx={{ flexGrow: 1 }}>
            Orchid
          </Typography>
          <IconButton color="inherit" onClick={toggleTheme} sx={{ mr: 1 }}>
            {themeMode === "dark" ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
          <Button color="inherit" onClick={() => {selectDirectory()}}>Open Project</Button>
        </Toolbar>
      </AppBar>
    </Box>
  );
}
