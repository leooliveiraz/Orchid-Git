import {
  AppBar,
  Box,
  IconButton,
  Toolbar,
  Typography,
  Tooltip,
  Button,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import SettingsIcon from "@mui/icons-material/Settings";
import MenuIcon from "@mui/icons-material/Menu";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CallSplitIcon from "@mui/icons-material/CallSplit";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import SyncIcon from "@mui/icons-material/Sync";
import MergeIcon from "@mui/icons-material/Merge";
import ContentPasteIcon from "@mui/icons-material/ContentPaste";
import React, { useContext, useState } from "react";
import { OrchidContext } from "../OrchidContext.jsx";
import CloneDialog from "./CloneDialog.jsx";
import SettingsDialog from "./SettingsDialog.jsx";
import CreateBranchDialog from "./CreateBranchDialog.jsx";
import MergeDialog from "./MergeDialog.jsx";
import CherryPickDialog from "./CherryPickDialog.jsx";
import SuccessSnackbar from "./SuccessSnackbar.jsx";

const OVERLAY_STYLE = {
  position: "fixed", inset: 0, bgcolor: "rgba(0,0,0,0.4)",
  display: "flex", alignItems: "center", justifyContent: "center",
  zIndex: 1300,
};

const MODAL_STYLE = {
  bgcolor: "background.paper", borderRadius: 3,
  width: 400, maxWidth: "90vw", boxShadow: 24, p: 3,
};

export default function AppMenu({ onToggleMenu }) {
  const { directory, setDirectory, themeMode, toggleTheme, refresh } = useContext(OrchidContext);
  const [showClone, setShowClone] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNewBranch, setShowNewBranch] = useState(false);
  const [showMerge, setShowMerge] = useState(false);
  const [showCherryPick, setShowCherryPick] = useState(false);
  const [syncAction, setSyncAction] = useState(null);
  const [syncError, setSyncError] = useState(null);
  const [syncSuccess, setSyncSuccess] = useState(null);

  function selectDirectory() {
    window.api.selectDirectory("").then((data) => {
      if (!data.canceled) {
        const path = data.filePaths[0];
        setDirectory(path)
      }
    })
  }

  const handlePush = async () => {
    setSyncAction(null);
    setSyncError(null);
    try {
      await window.api.push(directory);
      setSyncSuccess("Pushed successfully");
      refresh();
    } catch (e) {
      setSyncError(e.message || String(e));
    }
  };

  const handlePull = async () => {
    setSyncAction(null);
    setSyncError(null);
    try {
      await window.api.pull(directory);
      setSyncSuccess("Pull completed");
      refresh();
    } catch (e) {
      setSyncError(e.message || String(e));
    }
  };

  const handleFetch = async () => {
    setSyncError(null);
    try {
      await window.api.fetch(directory);
      setSyncSuccess("Fetch completed");
      refresh();
    } catch (e) {
      setSyncError(e.message || String(e));
    }
  };

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
            <Tooltip title="Push">
              <IconButton color="inherit" onClick={() => setSyncAction("push")} sx={{ mr: 0.5 }}>
                <CloudUploadIcon />
              </IconButton>
            </Tooltip>
          )}
          {directory && (
            <Tooltip title="Pull">
              <IconButton color="inherit" onClick={() => setSyncAction("pull")} sx={{ mr: 0.5 }}>
                <CloudDownloadIcon />
              </IconButton>
            </Tooltip>
          )}
          {directory && (
            <Tooltip title="Fetch">
              <IconButton color="inherit" onClick={handleFetch} sx={{ mr: 0.5 }}>
                <SyncIcon />
              </IconButton>
            </Tooltip>
          )}
          {directory && (
            <Tooltip title="Merge branch">
              <IconButton color="inherit" onClick={() => setShowMerge(true)} sx={{ mr: 0.5 }}>
                <MergeIcon />
              </IconButton>
            </Tooltip>
          )}
          {directory && (
            <Tooltip title="Cherry-pick commit">
              <IconButton color="inherit" onClick={() => setShowCherryPick(true)} sx={{ mr: 0.5 }}>
                <ContentPasteIcon />
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
      {showMerge && <MergeDialog onClose={() => setShowMerge(false)} />}
      {showCherryPick && <CherryPickDialog onClose={() => setShowCherryPick(false)} />}

      {syncAction === "push" && (
        <Box sx={OVERLAY_STYLE}>
          <Box sx={MODAL_STYLE}>
            <Typography variant="h6" sx={{ mb: 1 }}>Push</Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>Push commits to the remote repository?</Typography>
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
              <Button onClick={() => setSyncAction(null)}>Cancel</Button>
              <Button variant="contained" onClick={handlePush}>Push</Button>
            </Box>
          </Box>
        </Box>
      )}

      {syncAction === "pull" && (
        <Box sx={OVERLAY_STYLE}>
          <Box sx={MODAL_STYLE}>
            <Typography variant="h6" sx={{ mb: 1 }}>Pull</Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>Pull latest changes from the remote repository?</Typography>
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
              <Button onClick={() => setSyncAction(null)}>Cancel</Button>
              <Button variant="contained" onClick={handlePull}>Pull</Button>
            </Box>
          </Box>
        </Box>
      )}

      {syncError && (
        <Box sx={OVERLAY_STYLE}>
          <Box sx={MODAL_STYLE}>
            <Typography variant="h6" sx={{ mb: 1, color: "error.main" }}>Error</Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>{syncError}</Typography>
            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
              <Button onClick={() => setSyncError(null)}>Close</Button>
            </Box>
          </Box>
        </Box>
      )}

      <SuccessSnackbar message={syncSuccess} onClose={() => setSyncSuccess(null)} />
    </Box>
  );
}
