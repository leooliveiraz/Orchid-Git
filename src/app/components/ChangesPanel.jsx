import React, { useEffect, useState, useCallback, useContext } from "react";
import CommitDialog from "./CommitDialog.jsx";
import DiffViewer from "./DiffViewer.jsx";
import SuccessSnackbar from "./SuccessSnackbar.jsx";
import {
  Box, Button, Typography, List, ListItem, ListItemIcon, ListItemText,
  Chip, Alert,
} from "@mui/material";
import { OrchidContext } from "../OrchidContext.jsx";

const OVERLAY_STYLE = {
  position: "fixed", inset: 0, bgcolor: "rgba(0,0,0,0.4)",
  display: "flex", alignItems: "center", justifyContent: "center",
  zIndex: 1300,
};

const MODAL_STYLE = {
  bgcolor: "background.paper", borderRadius: 3,
  width: 400, maxWidth: "90vw", boxShadow: 24, p: 3,
};

const STATUS_COLORS = {
  M: "#e6a817", A: "#28a745", D: "#d73a49", R: "#6f42c1",
  "??": "#6a737d", "!!": "#6a737d",
};

function StatusFile({ file, onStage, onUnstage, onViewDiff }) {
  return (
    <ListItem
      secondaryAction={
        <Box sx={{ display: "flex", gap: 0.5 }}>
          {file.staged ? (
            <Button size="small" variant="outlined" color="warning" onClick={() => onUnstage(file.path)}>
              Unstage
            </Button>
          ) : (
            <Button size="small" variant="outlined" onClick={() => onStage(file.path)}>
              Stage
            </Button>
          )}
          <Button size="small" variant="text" onClick={() => onViewDiff(file)}>
            Diff
          </Button>
        </Box>
      }
      sx={{ py: 0.5 }}
    >
      <ListItemIcon sx={{ minWidth: 32 }}>
        <Chip label={file.type} size="small"
          sx={{
            color: "#fff", fontWeight: 700, fontSize: "0.65rem", minWidth: 28, height: 20,
            backgroundColor: STATUS_COLORS[file.type] || "#6a737d",
          }}
        />
      </ListItemIcon>
      <ListItemText
        primary={file.path}
        primaryTypographyProps={{ variant: "body2", noWrap: true, sx: { fontSize: "0.8125rem" } }}
      />
    </ListItem>
  );
}

export default function ChangesPanel({ directory }) {
  const { refreshKey } = useContext(OrchidContext);
  const [statusList, setStatusList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCommit, setShowCommit] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [diffViewer, setDiffViewer] = useState(null);
  const [success, setSuccess] = useState(null);

  const refresh = useCallback(async () => {
    if (!directory || !window.api) return;
    setLoading(true);
    setError(null);
    try {
      const data = await window.api.getStatus(directory);
      setStatusList(data);
    } catch (e) {
      setError(e.message || String(e));
    }
    setLoading(false);
  }, [directory]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 10000);
    return () => clearInterval(interval);
  }, [refresh, refreshKey]);

  const handleStage = async (path) => {
    try {
      await window.api.stageFile(directory, path);
      refresh();
    } catch (e) {
      setError(e.message || String(e));
    }
  };

  const handleUnstage = async (path) => {
    try {
      await window.api.unstageFile(directory, path);
      refresh();
    } catch (e) {
      setError(e.message || String(e));
    }
  };

  const handleStageAll = async () => {
    try {
      await window.api.stageAll(directory);
      refresh();
    } catch (e) {
      setError(e.message || String(e));
    }
  };

  const handleViewDiff = async (file) => {
    try {
      const diff = file.staged
        ? await window.api.getStagedDiff(directory, file.path)
        : await window.api.getDiff(directory, file.path);
      if (diff && diff.trim()) {
        setDiffViewer({ fileName: file.path, diffText: diff });
      } else {
        setError("No diff available");
      }
    } catch (e) {
      setError(e.message || String(e));
    }
  };

  const handleCommitClose = (didCommit) => {
    setShowCommit(false);
    if (didCommit) {
      setSuccess("Commit created successfully");
      refresh();
    }
  };

  const handlePush = async () => {
    setConfirmAction(null);
    setError(null);
    try {
      await window.api.push(directory);
      setSuccess("Pushed successfully");
      refresh();
    } catch (e) {
      setError(e.message || String(e));
    }
  };

  const handlePull = async () => {
    setConfirmAction(null);
    setError(null);
    try {
      await window.api.pull(directory);
      setSuccess("Pull completed");
      refresh();
    } catch (e) {
      setError(e.message || String(e));
    }
  };

  const staged = statusList.filter(f => f.staged);
  const unstaged = statusList.filter(f => !f.staged);

  return (
    <Box sx={{ py: 1 }}>
      <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 1, flexWrap: "wrap" }}>
        <Typography variant="body2" sx={{ color: "text.secondary", mr: 1 }}>
          {loading ? "Refreshing..." : `${statusList.length} file(s)`}
        </Typography>
        <Button size="small" variant="outlined" onClick={refresh}>Refresh</Button>
        <Button size="small" variant="outlined" onClick={handleStageAll}>Stage All</Button>
        <Button size="small" variant="contained" onClick={() => setShowCommit(true)} disabled={staged.length === 0}>
          Commit
        </Button>
        <Button size="small" variant="outlined" onClick={() => setConfirmAction("push")}>Push</Button>
        <Button size="small" variant="outlined" onClick={() => setConfirmAction("pull")}>Pull</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}

      <Typography variant="overline" sx={{ display: "block", color: "text.secondary", mb: 0.5 }}>
        Staged ({staged.length})
      </Typography>
      {staged.length === 0 && (
        <Typography variant="body2" sx={{ color: "text.secondary", py: 1 }}>No staged files</Typography>
      )}
      <List dense>
        {staged.map(f => (
          <StatusFile key={"staged-" + f.path} file={f} onStage={handleStage} onUnstage={handleUnstage} onViewDiff={handleViewDiff} />
        ))}
      </List>

      <Typography variant="overline" sx={{ display: "block", color: "text.secondary", mt: 2, mb: 0.5 }}>
        Changes ({unstaged.length})
      </Typography>
      {unstaged.length === 0 && (
        <Typography variant="body2" sx={{ color: "text.secondary", py: 1 }}>No changes</Typography>
      )}
      <List dense>
        {unstaged.map(f => (
          <StatusFile key={"unstaged-" + f.path} file={f} onStage={handleStage} onUnstage={handleUnstage} onViewDiff={handleViewDiff} />
        ))}
      </List>

      {showCommit && (
        <CommitDialog directory={directory} stagedFiles={staged} onClose={handleCommitClose} />
      )}

      {confirmAction === "push" && (
        <Box sx={OVERLAY_STYLE}>
          <Box sx={MODAL_STYLE}>
            <Typography variant="h6" sx={{ mb: 1 }}>Push</Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>Push commits to the remote repository?</Typography>
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
              <Button onClick={() => setConfirmAction(null)}>Cancel</Button>
              <Button variant="contained" onClick={handlePush}>Push</Button>
            </Box>
          </Box>
        </Box>
      )}

      {confirmAction === "pull" && (
        <Box sx={OVERLAY_STYLE}>
          <Box sx={MODAL_STYLE}>
            <Typography variant="h6" sx={{ mb: 1 }}>Pull</Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>Pull latest changes from the remote repository?</Typography>
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
              <Button onClick={() => setConfirmAction(null)}>Cancel</Button>
              <Button variant="contained" onClick={handlePull}>Pull</Button>
            </Box>
          </Box>
        </Box>
      )}

      {diffViewer && (
        <DiffViewer
          fileName={diffViewer.fileName}
          diffText={diffViewer.diffText}
          onClose={() => setDiffViewer(null)}
        />
      )}

      <SuccessSnackbar message={success} onClose={() => setSuccess(null)} />
    </Box>
  );
}
