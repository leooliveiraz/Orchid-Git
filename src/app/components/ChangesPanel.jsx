import React, { useEffect, useState, useCallback, useContext, useMemo } from "react";
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
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import ListIcon from "@mui/icons-material/List";
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

function buildTree(files) {
  const root = {};
  for (const f of files) {
    const parts = f.path.replace(/\\/g, "/").split("/");
    let node = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        if (!node._files) node._files = [];
        node._files.push(f);
      } else {
        if (!node[part]) node[part] = {};
        node = node[part];
      }
    }
  }
  return root;
}

function TreeDir({ name, node, depth, ...handlers }) {
  const [open, setOpen] = useState(true);
  const dirs = Object.keys(node).filter(k => k !== "_files");
  const files = node._files || [];

  return (
    <>
      <ListItem dense sx={{ pl: 1 + depth * 2, py: 0.25, cursor: "pointer" }}
        onClick={() => setOpen(!open)}
      >
        <ListItemIcon sx={{ minWidth: 24 }}>
          <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "0.7rem" }}>
            {open ? "▼" : "▶"}
          </Typography>
        </ListItemIcon>
        <ListItemText primary={name} primaryTypographyProps={{ variant: "body2", sx: { fontWeight: 600, fontSize: "0.75rem", color: "text.secondary" } }} />
      </ListItem>
      {open && (
        <>
          {dirs.map(d => (
            <TreeDir key={d} name={d} node={node[d]} depth={depth + 1} {...handlers} />
          ))}
          {files.map(f => (
            <StatusFile key={f.path} file={f} depth={depth + 1} {...handlers} />
          ))}
        </>
      )}
    </>
  );
}

function TreeList({ tree, handlers }) {
  const dirs = Object.keys(tree).filter(k => k !== "_files").sort();
  const files = tree._files || [];
  return (
    <List dense>
      {dirs.map(d => (
        <TreeDir key={d} name={d} node={tree[d]} depth={0} {...handlers} />
      ))}
      {files.map(f => (
        <StatusFile key={f.path} file={f} depth={0} {...handlers} />
      ))}
    </List>
  );
}

const STATUS_COLORS = {
  M: "#e6a817", A: "#28a745", D: "#d73a49", R: "#6f42c1",
  "??": "#6a737d", "!!": "#6a737d",
};

function StatusFile({ file, onStage, onUnstage, onViewDiff, onViewBlame, onViewHistory, onViewFile, onDiscard, onDiscardHunks, depth = 0 }) {
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
      sx={{ py: 0.5, pl: depth > 0 ? 1 + depth * 2 : undefined }}
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
  const [confirmAbort, setConfirmAbort] = useState(false);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem("orchid-changes-view") || "flat");

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
      const [data, fileContent, diffLines] = await Promise.all([
        window.api.getBlame(directory, file.path),
        window.api.getFileContent(directory, file.path),
        window.api.getDiffLines(directory, file.path).catch(() => []),
      ]);
      if (data && data.length) {
        setBlameViewer({ fileName: file.path, blameData: data, fileContent: fileContent || "", highlightLines: diffLines || [] });
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
        await window.api.abortMerge(directory);
        setSuccess(`Discarded changes in ${file.path} (merge aborted)`);
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
        await window.api.abortMerge(directory);
      } catch (e) { /* sem merge em progresso */ }
      try {
        await window.api.discardAll(directory);
      } catch (e) { /* sem mudanças para descartar */ }
      setSuccess("All changes discarded");
      refresh();
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

  const handleAbort = async () => {
    if (!window.api) return;
    setConfirmAbort(false);
    try {
      await window.api.abortMerge(directory);
      setSuccess("Merge aborted successfully!");
      refresh();
    } catch (e) {
      setError(e.message || String(e));
    }
  };

  const staged = statusList.filter(f => f.staged);
  const unstaged = statusList.filter(f => !f.staged);
  const conflicted = statusList.filter(f => f.conflicted).map(f => f.path);
  const treeStaged = useMemo(() => buildTree(staged), [staged]);
  const treeUnstaged = useMemo(() => buildTree(unstaged), [unstaged]);

  const handleViewMode = useCallback((mode) => {
    setViewMode(mode);
    localStorage.setItem("orchid-changes-view", mode);
  }, []);

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
        {unstaged.length > 0 && conflicted.length === 0 && (
          <Button size="small" variant="outlined" color="error" onClick={handleDiscardAll}>
            Discard All
          </Button>
        )}
        {conflicted.length > 0 && (
          <Button size="small" variant="outlined" color="error" onClick={() => setConfirmAbort(true)}>
            Abort merge
          </Button>
        )}
        <IconButton size="small" onClick={() => handleViewMode(viewMode === "flat" ? "tree" : "flat")}
          sx={{ ml: "auto", color: "text.secondary" }}
          title={viewMode === "flat" ? "Tree view" : "Flat view"}
        >
          {viewMode === "flat" ? <AccountTreeIcon fontSize="small" /> : <ListIcon fontSize="small" />}
        </IconButton>
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
      {staged.length > 0 && viewMode === "tree" ? (
        <TreeList tree={treeStaged} handlers={{
          onStage: handleStage, onUnstage: handleUnstage,
          onViewDiff: handleViewDiff, onViewBlame: handleViewBlame,
          onViewHistory: handleViewHistory, onViewFile: handleViewFile,
          onDiscard: handleDiscardFile, onDiscardHunks: handleDiscardHunks,
        }} />
      ) : (
        <List dense>
          {staged.map(f => (
            <StatusFile key={"staged-" + f.path} file={f} onStage={handleStage} onUnstage={handleUnstage} onViewDiff={handleViewDiff} onViewBlame={handleViewBlame} onViewHistory={handleViewHistory} onViewFile={handleViewFile} onDiscard={handleDiscardFile} onDiscardHunks={handleDiscardHunks} />
          ))}
        </List>
      )}

      <Typography variant="overline" sx={{ display: "block", color: "text.secondary", mt: 2, mb: 0.5 }}>
        Changes ({unstaged.length})
      </Typography>
      {unstaged.length === 0 && (
        <Typography variant="body2" sx={{ color: "text.secondary", py: 1 }}>No changes</Typography>
      )}
      {unstaged.length > 0 && viewMode === "tree" ? (
        <TreeList tree={treeUnstaged} handlers={{
          onStage: handleStage, onUnstage: handleUnstage,
          onViewDiff: handleViewDiff, onViewBlame: handleViewBlame,
          onViewHistory: handleViewHistory, onViewFile: handleViewFile,
          onDiscard: handleDiscardFile, onDiscardHunks: handleDiscardHunks,
        }} />
      ) : (
        <List dense>
          {unstaged.map(f => (
            <StatusFile key={"unstaged-" + f.path} file={f} onStage={handleStage} onUnstage={handleUnstage} onViewDiff={handleViewDiff} onViewBlame={handleViewBlame} onViewHistory={handleViewHistory} onViewFile={handleViewFile} onDiscard={handleDiscardFile} onDiscardHunks={handleDiscardHunks} />
          ))}
        </List>
      )}
        </>
      )}

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
              highlightLines={blameViewer.highlightLines}
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

      {confirmAbort && (
        <Box sx={OVERLAY_STYLE}>
          <Box sx={MODAL_STYLE}>
            <Typography variant="h6" sx={{ mb: 1 }}>Abort merge?</Typography>
            <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
              This will abort the current merge/rebase and discard all conflict resolutions.
            </Typography>
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
              <Button onClick={() => setConfirmAbort(false)}>Keep editing</Button>
              <Button color="error" variant="contained" onClick={handleAbort}>Abort merge</Button>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}
