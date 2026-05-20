import {
  AppBar,
  Box,
  IconButton,
  Toolbar,
  Typography,
  Tooltip,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import SettingsIcon from "@mui/icons-material/Settings";
import MenuIcon from "@mui/icons-material/Menu";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CallSplitIcon from "@mui/icons-material/CallSplit";
import React, { useContext, useState } from "react";
import { OrchidContext } from "../OrchidContext.jsx";
import CloneDialog from "./CloneDialog.jsx";
import SettingsDialog from "./SettingsDialog.jsx";
import CreateBranchDialog from "./CreateBranchDialog.jsx";

export default function AppMenu({ onToggleMenu }) {
  const { directory, setDirectory, themeMode, toggleTheme, refresh } = useContext(OrchidContext);
  const [showClone, setShowClone] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNewBranch, setShowNewBranch] = useState(false);

  function selectDirectory() {
    window.api.selectDirectory("").then((data) => {
      if (!data.canceled) {
        const path = data.filePaths[0];
        setDirectory(path)
      }
    })
  }

  return (
    <Box>
      <AppBar position="relative" >
        <Toolbar variant="dense">
          <IconButton
            size="medium"
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ mr: 1 }}
            onClick={onToggleMenu}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
            Orchid
          </Typography>
          <Tooltip title="Refresh (F5)">
            <IconButton color="inherit" onClick={refresh} sx={{ mr: 0.5 }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Toggle theme">
            <IconButton color="inherit" onClick={toggleTheme} sx={{ mr: 0.5 }}>
              {themeMode === "dark" ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Clone repository">
            <IconButton color="inherit" onClick={() => setShowClone(true)} sx={{ mr: 0.5 }}>
              <ContentCopyIcon />
            </IconButton>
          </Tooltip>
          {directory && (
            <Tooltip title="Repository settings">
              <IconButton color="inherit" onClick={() => setShowSettings(true)} sx={{ mr: 0.5 }}>
                <SettingsIcon />
              </IconButton>
            </Tooltip>
          )}
          {directory && (
            <Tooltip title="Create branch">
              <IconButton color="inherit" onClick={() => setShowNewBranch(true)} sx={{ mr: 0.5 }}>
                <CallSplitIcon />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Open repository">
            <IconButton color="inherit" onClick={selectDirectory}>
              <FolderOpenIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>
      {showClone && <CloneDialog onClose={() => setShowClone(false)} />}
      {showSettings && <SettingsDialog onClose={() => setShowSettings(false)} />}
      {showNewBranch && <CreateBranchDialog onClose={() => setShowNewBranch(false)} />}
    </Box>
  );
}
