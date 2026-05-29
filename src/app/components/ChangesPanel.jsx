import React, { useEffect, useState, useCallback, useContext } from "react";
import CommitDialog from "./CommitDialog.jsx";
import DiffViewer from "./DiffViewer.jsx";
import CodeEditor from "./CodeEditor.jsx";
import FileHistoryDialog from "./FileHistoryDialog.jsx";
import FileViewDialog from "./FileViewDialog.jsx";
import ConflictResolver from "./ConflictResolver.jsx";
import SuccessSnackbar from "./SuccessSnackbar.jsx";
import {
  Box, Button, Typography, List, ListItem, ListItemIcon, ListItemText,
  Chip, Alert, Dialog, DialogTitle, DialogContent, IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
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

function StatusFile({ file, onStage, onUnstage, onViewDiff, onViewBlame, onViewHistory, onViewFile, onDiscard, onDiscardHunks }) {
  return (
    <ListItem
      secondaryAction={
        <Box sx={{ display: "flex", gap: 0.5 }}>
          {file.staged ? (
            <Button size="small" variant="outlined" color="warning" onClick={(e) => { e.stopPropagation(); onUnstage(file.path); }}>
              Unstage
            </Button>
          ) : (
            <Button size="small" variant="outlined" onClick={(e) => { e.stopPropagation(); onStage(file.path); }}>
              Stage
            </Button>
          )}
          <Button size="small" variant="text" onClick={(e) => { e.stopPropagation(); onViewDiff(file); }}>
            Diff
          </Button>
          <Button size="small" variant="text" onClick={(e) => { e.stopPropagation(); onViewFile(file); }}>
            View
          </Button>
          <Button size="small" variant="text" onClick={(e) => { e.stopPropagation(); onViewBlame(file); }}>
            Blame
          </Button>
          <Button size="small" variant="text" onClick={(e) => { e.stopPropagation(); onViewHistory(file); }}>
            History
          </Button>
          {!file.staged && (
            <Button size="small" variant="text" color="error" onClick={(e) => { e.stopPropagation(); onDiscard(file); }}>
              Discard
            </Button>
          )}
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
        primaryTypographyProps={{
          variant: "body2", noWrap: true,
          sx: { fontSize: "0.8125rem", cursor: "pointer", "&:hover": { textDecoration: "underline" } },
          onClick: (e) => { e.stopPropagation(); onViewDiff(file); },
        }}
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
  const [diffViewer, setDiffViewer] = useState(null);
  const [blameViewer, setBlameViewer] = useState(null);
  const [historyViewer, setHistoryViewer] = useState(null);
  const [fileViewer, setFileViewer] = useState(null);
  const [success, setSuccess] = useState(null);
  const [discardConfirm, setDiscardConfirm] = useState(null);

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

  const handleViewBlame = async (file) => {
    try {
      const [data, fileContent] = await Promise.all([
        window.api.getBlame(directory, file.path),
        window.api.getFileContent(directory, file.path),
      ]);
      if (data && data.length) {
        setBlameViewer({ fileName: file.path, blameData: data, fileContent: fileContent || "" });
      } else {
        setError("No blame data available");
      }
    } catch (e) {
      setError(e.message || String(e));
    }
  };

  const handleViewHistory = async (file) => {
    setHistoryViewer({ fileName: file.path });
  };

  const handleViewFile = async (file) => {
    setFileViewer({ fileName: file.path });
  };

  const handleCommitClose = (didCommit) => {
    setShowCommit(false);
    if (didCommit) {
      setSuccess("Commit created successfully");
      refresh();
    }
  };

  const handleDiscardFile = async (file) => {
    setDiscardConfirm({ type: "file", path: file.path, action: async () => {
      if (!window.api) return;
      try {
        await window.api.discardFile(directory, file.path);
        setSuccess(`Discarded changes in ${file.path}`);
        refresh();
      } catch (e) {
        setError(e.message || String(e));
      }
    }});
  };

  const handleDiscardAll = async () => {
    setDiscardConfirm({ type: "all", path: "all changes", action: async () => {
      if (!window.api) return;
      try {
        await window.api.discardAll(directory);
        setSuccess("All changes discarded");
        refresh();
      } catch (e) {
        setError(e.message || String(e));
      }
    }});
  };

  const handleDiscardHunks = async (file) => {
    setDiscardConfirm({ type: "hunks", path: file.path, action: async () => {
      if (!window.api) return;
      try {
        const hunks = await window.api.getDiscardHunks(directory, file.path);
        if (!hunks?.length) { setError("No discardable hunks"); return; }
        await window.api.discardHunks(directory, file.path, hunks.map(h => h.id));
        setSuccess(`Discarded changes in ${file.path}`);
        refresh();
      } catch (e) {
        setError(e.message || String(e));
      }
    }});
  };

  const staged = statusList.filter(f => f.staged);
  const unstaged = statusList.filter(f => !f.staged);
  const conflicted = statusList.filter(f => f.conflicted).map(f => f.path);

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
        {unstaged.length > 0 && (
          <Button size="small" variant="outlined" color="error" onClick={handleDiscardAll}>
            Discard All
          </Button>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}

      {conflicted.length > 0 && (
        <ConflictResolver directory={directory} conflictedFiles={conflicted} onRefresh={refresh} />
      )}

      {conflicted.length === 0 && (
        <>
      <Typography variant="overline" sx={{ display: "block", color: "text.secondary", mb: 0.5 }}>
        Staged ({staged.length})
      </Typography>
      {staged.length === 0 && (
        <Typography variant="body2" sx={{ color: "text.secondary", py: 1 }}>No staged files</Typography>
      )}
      <List dense>
        {staged.map(f => (
          <StatusFile key={"staged-" + f.path} file={f} onStage={handleStage} onUnstage={handleUnstage} onViewDiff={handleViewDiff} onViewBlame={handleViewBlame} onViewHistory={handleViewHistory} onViewFile={handleViewFile} onDiscard={handleDiscardFile} onDiscardHunks={handleDiscardHunks} />
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
          <StatusFile key={"unstaged-" + f.path} file={f} onStage={handleStage} onUnstage={handleUnstage} onViewDiff={handleViewDiff} onViewBlame={handleViewBlame} onViewHistory={handleViewHistory} onViewFile={handleViewFile} />
        ))}
      </List>

      {showCommit && (
        <CommitDialog directory={directory} stagedFiles={staged} onClose={handleCommitClose} />
      )}

      {diffViewer && (
        <DiffViewer
          fileName={diffViewer.fileName}
          diffText={diffViewer.diffText}
          onClose={() => setDiffViewer(null)}
        />
      )}

      {blameViewer && (
        <Dialog open onClose={() => setBlameViewer(null)} maxWidth="lg" fullWidth>
          <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography component="div" variant="body2" sx={{ fontFamily: "monospace", flex: 1, fontWeight: 600 }}>
              {blameViewer.fileName}
            </Typography>
            <IconButton size="small" onClick={() => setBlameViewer(null)} aria-label="close">
              <CloseIcon fontSize="small" />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ overflow: "auto", maxHeight: "70vh", p: 0 }}>
            <CodeEditor
              value={blameViewer.fileContent}
              filename={blameViewer.fileName}
              readOnly
              height="55vh"
              blameAnnotations={blameViewer.blameData}
            />
          </DialogContent>
        </Dialog>
      )}

      {historyViewer && (
        <FileHistoryDialog
          directory={directory}
          fileName={historyViewer.fileName}
          onClose={() => setHistoryViewer(null)}
        />
      )}

      {fileViewer && (
        <FileViewDialog
          directory={directory}
          fileName={fileViewer.fileName}
          onClose={() => setFileViewer(null)}
        />
      )}

      <SuccessSnackbar message={success} onClose={() => setSuccess(null)} />

      {discardConfirm && (
        <Box sx={OVERLAY_STYLE}>
          <Box sx={MODAL_STYLE}>
            <Typography variant="h6" sx={{ mb: 1 }}>Discard changes</Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Discard changes in <strong>{discardConfirm.path}</strong>? This cannot be undone.
            </Typography>
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
              <Button onClick={() => setDiscardConfirm(null)}>Cancel</Button>
              <Button color="error" variant="contained" onClick={() => { discardConfirm.action(); setDiscardConfirm(null); }}>
                Discard
              </Button>
            </Box>
          </Box>
        </Box>
      )}
      </>
    )}
    </Box>
  );
}
