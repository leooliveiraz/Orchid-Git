import {
  AppBar,
  Box,
  IconButton,
  Toolbar,
  Typography,
  Tooltip,
  Button,
  TextField,
  Alert,
  Snackbar,
  CircularProgress,
  Chip,
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
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import SyncIcon from "@mui/icons-material/Sync";
import MergeIcon from "@mui/icons-material/Merge";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import NoteAddIcon from "@mui/icons-material/NoteAdd";
import ChecklistIcon from '@mui/icons-material/Checklist';
import ContentPasteIcon from "@mui/icons-material/ContentPaste";
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import WatchLaterIcon from '@mui/icons-material/WatchLater';
import ClearIcon from "@mui/icons-material/Clear";
import React, { useContext, useState, useEffect } from "react";
import appIcon from "../../assets/icon.png";
import { OrchidContext } from "../OrchidContext.jsx";
import CloneDialog from "./CloneDialog.jsx";
import SettingsDialog from "./SettingsDialog.jsx";
import CreateBranchDialog from "./CreateBranchDialog.jsx";
import MergeDialog from "./MergeDialog.jsx";
import CherryPickDialog from "./CherryPickDialog.jsx";
import CommitDialog from "./CommitDialog.jsx";
import RebaseDialog from "./RebaseDialog.jsx";
import InitRepoDialog from "./InitRepoDialog.jsx";
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
  const { directory, setDirectory, themeMode, toggleTheme, refresh, setTabSignal, syncWarning, setSyncWarning, repoData } = useContext(OrchidContext);
  const [showClone, setShowClone] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNewBranch, setShowNewBranch] = useState(false);
  const [showMerge, setShowMerge] = useState(false);
  const [showCherryPick, setShowCherryPick] = useState(false);
  const [showRebase, setShowRebase] = useState(false);
  const [showInit, setShowInit] = useState(false);
  const [showCommit, setShowCommit] = useState(false);
  const [commitStaged, setCommitStaged] = useState([]);
  const [showStashPush, setShowStashPush] = useState(false);
  const [stashMessage, setStashMessage] = useState("");
  const [stashPushing, setStashPushing] = useState(false);
  const [syncAction, setSyncAction] = useState(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const [syncSuccess, setSyncSuccess] = useState(null);
  const [forcePushEnabled, setForcePushEnabled] = useState(() => localStorage.getItem("orchid-force-push-enabled") === "true");

  useEffect(() => {
    const handler = (e) => setForcePushEnabled(e.detail);
    window.addEventListener("force-push-setting-changed", handler);
    return () => window.removeEventListener("force-push-setting-changed", handler);
  }, []);
  const [showForceConfirm, setShowForceConfirm] = useState(false);

  function selectDirectory() {
    window.api.selectDirectory("").then((data) => {
      if (!data.canceled) {
        const path = data.filePaths[0];
        setDirectory(path)
      }
    })
  }

  const handlePush = async () => {
    setSyncLoading(true);
    setSyncError(null);
    try {
      await window.api.push(directory);
      setSyncSuccess("Pushed successfully");
      setSyncAction(null);
      refresh();
    } catch (e) {
      setSyncError(e.message || String(e));
      setSyncAction(null);
    }
    setSyncLoading(false);
  };

  const handleForcePush = async () => {
    setShowForceConfirm(false);
    setSyncLoading(true);
    setSyncError(null);
    try {
      await window.api.pushForce(directory);
      setSyncSuccess("Force pushed successfully");
      setSyncAction(null);
      refresh();
    } catch (e) {
      setSyncError(e.message || String(e));
      setSyncAction(null);
    }
    setSyncLoading(false);
  };

  const handlePull = async () => {
    setSyncLoading(true);
    setSyncError(null);
    try {
      await window.api.pull(directory);
      setSyncSuccess("Pull completed");
      setSyncAction(null);
      refresh();
    } catch (e) {
      setSyncError(e.message || String(e));
      setSyncAction(null);
    }
    setSyncLoading(false);
  };

  const handleFetch = async () => {
    setSyncLoading(true);
    setSyncError(null);
    try {
      await window.api.fetch(directory);
      setSyncSuccess("Fetch completed");
      refresh();
    } catch (e) {
      setSyncError(e.message || String(e));
    }
    setSyncLoading(false);
  };

  const handleStashPush = async () => {
    if (!stashMessage.trim() || !window.api || !directory) return;
    setStashPushing(true);
    setSyncError(null);
    try {
      await window.api.stashPush(directory, stashMessage.trim());
      setSyncSuccess("Stash created");
      setShowStashPush(false);
      setStashMessage("");
      refresh();
    } catch (e) {
      setSyncError(e.message || String(e));
    }
    setStashPushing(false);
  };

  const handleOpenCommit = async () => {
    if (!window.api || !directory) return;
    try {
      const status = await window.api.getStatus(directory);
      const staged = status.filter(f => f.staged);
      if (staged.length === 0) {
        setTabSignal("changes");
        return;
      }
      setCommitStaged(staged);
      setShowCommit(true);
    } catch (e) { }
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
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mr: 1, flexGrow: 1 }}>
            <img src={appIcon} alt="Orchid" width="22" height="22" style={{ borderRadius: 4 }} />
            <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
              Orchid
            </Typography>
          </Box>

          <Tooltip title="Open repository">
            <IconButton color="inherit" onClick={selectDirectory}>
              <FolderOpenIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="New repository">
            <IconButton color="inherit" onClick={() => setShowInit(true)} sx={{ mr: 0.5 }}>
              <NoteAddIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Clone repository">
            <IconButton color="inherit" onClick={() => setShowClone(true)} sx={{ mr: 0.5 }}>
              <ContentCopyIcon />
            </IconButton>
          </Tooltip>

          {directory && <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.4)", userSelect: "none", mx: 0.5 }}>|</Typography>}
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
                <CloudSyncIcon />
              </IconButton>
            </Tooltip>
          )}
          {directory && repoData && (repoData.ahead > 0 || repoData.behind > 0) && (
            <Tooltip title={`${repoData.ahead} ahead, ${repoData.behind} behind`}>
              <Chip id="ahead-behind-chip"
                label={`↑${repoData.ahead} ↓${repoData.behind}`}
                size="small"
                sx={{
                  height: 20,
                  fontSize: "0.65rem",
                  fontWeight: 600,
                  mr: 0.5,
                  color: "#fff",
                  bgcolor: repoData.behind > 0 ? "rgba(239,83,80,0.8)" : "rgba(66,165,245,0.8)",
                  "& .MuiChip-label": { px: 0.75 },
                }}
              />
            </Tooltip>
          )}
          {directory && <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.4)", userSelect: "none", mx: 0.5 }}>|</Typography>}
          {directory && (
            <Tooltip title="Create branch">
              <IconButton color="inherit" onClick={() => setShowNewBranch(true)} sx={{ mr: 0.5 }}>
                <CallSplitIcon />
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
            <Tooltip title="Commit">
              <IconButton color="inherit" onClick={handleOpenCommit} sx={{ mr: 0.5 }}>
                <TaskAltIcon />
              </IconButton>
            </Tooltip>
          )}
          {directory && (
            <Tooltip title="Cherry-pick commit">
              <IconButton color="inherit" onClick={() => setShowCherryPick(true)} sx={{ mr: 0.5 }}>
                <AssignmentTurnedInIcon />
              </IconButton>
            </Tooltip>
          )}
          {directory && (
            <Tooltip title="Interactive rebase">
              <IconButton color="inherit" onClick={() => setShowRebase(true)} sx={{ mr: 0.5 }}>
                <ChecklistIcon />
              </IconButton>
            </Tooltip>
          )}
          {directory && (
            <Tooltip title="Stash">
              <IconButton color="inherit" onClick={() => setShowStashPush(true)} sx={{ mr: 0.5 }}>
                <WatchLaterIcon />
              </IconButton>
            </Tooltip>
          )}
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.4)", userSelect: "none", mx: 0.5 }}>|</Typography>
          {directory && (
            <Tooltip title="Refresh (F5)">
              <IconButton color="inherit" onClick={refresh} sx={{ mr: 0.5 }}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Toggle theme">
            <IconButton color="inherit" onClick={toggleTheme} sx={{ mr: 0.5 }}>
              {themeMode === "dark" ? <Brightness7Icon /> : <Brightness4Icon />}
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
            <Tooltip title="Close repository">
              <IconButton color="inherit" onClick={() => setDirectory("")}>
                <ClearIcon />
              </IconButton>
            </Tooltip>
          )}
        </Toolbar>
      </AppBar>
      {showClone && <CloneDialog onClose={() => setShowClone(false)} />}
      {showSettings && <SettingsDialog onClose={() => setShowSettings(false)} />}
      {showNewBranch && <CreateBranchDialog onClose={() => setShowNewBranch(false)} />}
      {showMerge && <MergeDialog onClose={() => setShowMerge(false)} />}
      {showCherryPick && <CherryPickDialog onClose={() => setShowCherryPick(false)} />}
      {showRebase && <RebaseDialog onClose={() => setShowRebase(false)} />}
      {showInit && <InitRepoDialog onClose={() => setShowInit(false)} />}
      {showCommit && <CommitDialog directory={directory} stagedFiles={commitStaged} onClose={(did) => { setShowCommit(false); if (did) refresh(); }} />}

      {showStashPush && (
        <Box sx={OVERLAY_STYLE}>
          <Box sx={MODAL_STYLE}>
            <Typography variant="h6" sx={{ mb: 1 }}>Create stash</Typography>
            <TextField
              autoFocus
              fullWidth
              label="Stash message"
              placeholder="e.g. WIP: working on feature"
              value={stashMessage}
              onChange={e => setStashMessage(e.target.value)}
              disabled={stashPushing}
              onKeyDown={e => { if (e.key === "Enter") handleStashPush(); }}
              sx={{ mb: 2 }}
            />
            {syncError && <Alert severity="error" sx={{ mb: 1 }}>{syncError}</Alert>}
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
              <Button onClick={() => { setShowStashPush(false); setStashMessage(""); setSyncError(null); }} disabled={stashPushing}>Cancel</Button>
              <Button variant="contained" onClick={handleStashPush} disabled={!stashMessage.trim() || stashPushing}>
                {stashPushing ? "Creating..." : "Create"}
              </Button>
            </Box>
          </Box>
        </Box>
      )}

      {syncAction === "push" && !showForceConfirm && (
        <Box sx={OVERLAY_STYLE}>
          <Box sx={MODAL_STYLE}>
            <Typography variant="h6" sx={{ mb: 1 }}>Push</Typography>
            {syncLoading ? (
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, py: 2 }}>
                <CircularProgress size={24} />
                <Typography variant="body2">Pushing...</Typography>
              </Box>
            ) : (
              <>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  {repoData?.ahead > 0
                    ? `Push ${repoData.ahead} commit(s) to the remote repository?`
                    : "Push commits to the remote repository?"}
                </Typography>
                {repoData?.behind > 0 && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    The remote has {repoData.behind} commit(s) that are not in your local branch. Consider pulling first.
                  </Alert>
                )}
              </>
            )}
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
              <Button onClick={() => { setSyncAction(null); setSyncLoading(false); }} disabled={syncLoading}>Cancel</Button>
              {forcePushEnabled && (
                <Button color="error" variant="outlined" onClick={() => setShowForceConfirm(true)} disabled={syncLoading} sx={{ mr: "auto" }}>Force Push</Button>
              )}
              <Button variant="contained" onClick={handlePush} disabled={syncLoading}>Push</Button>
            </Box>
          </Box>
        </Box>
      )}

      {showForceConfirm && (
        <Box sx={OVERLAY_STYLE}>
          <Box sx={MODAL_STYLE}>
            <Typography variant="h6" sx={{ mb: 1, color: "error.main" }}>Force Push</Typography>
            <Alert severity="warning" sx={{ mb: 2 }}>
              This will overwrite the remote history with your local history. Other collaborators may lose work. This action is destructive.
            </Alert>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Are you sure you want to force push using <code>--force-with-lease</code>?
            </Typography>
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
              <Button onClick={() => setShowForceConfirm(false)}>Cancel</Button>
              <Button color="error" variant="contained" onClick={handleForcePush}>Yes, force push</Button>
            </Box>
          </Box>
        </Box>
      )}

      {syncAction === "pull" && (
        <Box sx={OVERLAY_STYLE}>
          <Box sx={MODAL_STYLE}>
            <Typography variant="h6" sx={{ mb: 1 }}>Pull</Typography>
            {syncLoading ? (
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, py: 2 }}>
                <CircularProgress size={24} />
                <Typography variant="body2">Pulling...</Typography>
              </Box>
            ) : (
              <>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  {repoData?.behind > 0
                    ? `Pull ${repoData.behind} commit(s) from the remote repository?`
                    : "Pull latest changes from the remote repository?"}
                </Typography>
                {repoData?.ahead > 0 && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    You have {repoData.ahead} local commit(s) that have not been pushed yet.
                  </Alert>
                )}
              </>
            )}
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
              <Button onClick={() => { setSyncAction(null); setSyncLoading(false); }} disabled={syncLoading}>Cancel</Button>
              <Button variant="contained" onClick={handlePull} disabled={syncLoading}>Pull</Button>
            </Box>
          </Box>
        </Box>
      )}

      <Snackbar open={!!syncWarning} autoHideDuration={8000} onClose={() => setSyncWarning(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity="warning" onClose={() => setSyncWarning(null)} sx={{ width: "100%" }}>
          {syncWarning?.title && <strong>{syncWarning.title}: </strong>}{syncWarning?.message || ""}
        </Alert>
      </Snackbar>

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
