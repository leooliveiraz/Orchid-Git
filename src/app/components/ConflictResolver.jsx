import React, { useState, useEffect, useCallback, useContext } from "react";
import {
  Box, Typography, Button, Paper, Alert, LinearProgress, Chip, Divider, IconButton,
} from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CallSplitIcon from "@mui/icons-material/CallSplit";
import { OrchidContext } from "../OrchidContext.jsx";

function ConflictBlock({ block, onResolve, onCancel, file }) {
  const [choice, setChoice] = useState(null);

  const handleApply = () => {
    if (!choice) return;
    onResolve(file, block.index, choice);
    setChoice(null);
  };

  return (
    <Paper variant="outlined" sx={{ m: 1, p: 1, borderColor: "warning.main" }}>
      <Box sx={{ display: "flex", gap: 0.5, mb: 0.5, flexWrap: "wrap" }}>
        <Button size="small" variant={choice === "ours" ? "contained" : "outlined"} color="primary"
          onClick={() => setChoice("ours")} sx={{ fontSize: "0.65rem", minWidth: 50 }}>
          Ours
        </Button>
        <Button size="small" variant={choice === "theirs" ? "contained" : "outlined"} color="primary"
          onClick={() => setChoice("theirs")} sx={{ fontSize: "0.65rem", minWidth: 50 }}>
          Theirs
        </Button>
        <Button size="small" variant={choice === "both" ? "contained" : "outlined"} color="primary"
          onClick={() => setChoice("both")} sx={{ fontSize: "0.65rem", minWidth: 50 }}>
          Both
        </Button>
        {choice && (
          <Button size="small" variant="contained" color="success"
            onClick={handleApply} sx={{ fontSize: "0.65rem" }}>
            Apply
          </Button>
        )}
      </Box>
      <Box sx={{ display: "flex", gap: 1, fontSize: "0.75rem", fontFamily: "monospace", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
        <Box sx={{ flex: 1, p: 0.5, bgcolor: "error.light", borderRadius: 1, color: "#fff", opacity: 0.9 }}>
          {block.ours}
        </Box>
        <Box sx={{ flex: 1, p: 0.5, bgcolor: "success.light", borderRadius: 1, color: "#fff", opacity: 0.9 }}>
          {block.theirs}
        </Box>
      </Box>
    </Paper>
  );
}

export default function ConflictResolver({ directory, conflictedFiles, onRefresh }) {
  const { refresh } = useContext(OrchidContext);
  const [fileBlocks, setFileBlocks] = useState({});
  const [loading, setLoading] = useState(null);
  const [resolving, setResolving] = useState(null);
  const [error, setError] = useState(null);
  const [pendingResolves, setPendingResolves] = useState({});
  const [files, setFiles] = useState(conflictedFiles || []);

  useEffect(() => {
    setFiles(conflictedFiles || []);
  }, [conflictedFiles]);

  useEffect(() => {
    if (!directory || !window.api) return;
    files.forEach(async (file) => {
      try {
        const data = await window.api.getConflictBlocks(directory, file);
        setFileBlocks(prev => ({ ...prev, [file]: data.blocks || [] }));
      } catch (e) {
        setError(e.message || String(e));
      }
    });
  }, [directory, files]);

  const handleBlockResolve = async (file, blockIndex, choice) => {
    setPendingResolves(prev => {
      const key = `${file}::${blockIndex}`;
      const next = { ...prev };
      if (choice) next[key] = choice;
      else delete next[key];
      return next;
    });
  };

  const handleApplyAll = async (file) => {
    if (!window.api) return;
    setResolving(file);
    setError(null);
    try {
      const blocks = fileBlocks[file] || [];
      const resolutions = blocks.map((b, i) => {
        const choice = pendingResolves[`${file}::${i}`];
        if (!choice) return null;
        return { blockIndex: i, choice };
      }).filter(Boolean);
      if (resolutions.length === 0) {
        setError("Select a resolution for each block first");
        setResolving(null);
        return;
      }
      await window.api.resolveConflictBlocks(directory, file, resolutions, "\n// === kept both ===\n");
      await window.api.resolveFile(directory, file);
      setFiles(prev => prev.filter(f => f !== file));
      onRefresh?.();
    } catch (e) {
      setError(e.message || String(e));
    }
    setResolving(null);
  };

  const handleResolveAll = async () => {
    for (const file of files) {
      await handleApplyAll(file);
    }
  };

  const handleContinue = async () => {
    if (!window.api) return;
    setLoading("continue");
    setError(null);
    try {
      await window.api.continueMerge(directory);
      onRefresh?.();
      refresh();
    } catch (e) {
      setError(e.message || String(e));
    }
    setLoading(null);
  };

  const handleAbort = async () => {
    if (!window.api) return;
    setLoading("abort");
    setError(null);
    try {
      await window.api.abortMerge(directory);
      onRefresh?.();
      refresh();
    } catch (e) {
      setError(e.message || String(e));
    }
    setLoading(null);
  };

  return (
    <Box sx={{ py: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <WarningAmberIcon color="warning" />
        <Typography variant="h6" sx={{ fontWeight: 600 }}>Merge Conflicts</Typography>
        <Chip label={`${files.length} file(s)`} size="small" color="error" />
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {files.map(file => {
        const blocks = fileBlocks[file] || [];
        const resolvedCount = Object.keys(pendingResolves).filter(k => k.startsWith(file + "::")).length;
        return (
          <Paper key={file} variant="outlined" sx={{ mb: 2, p: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <Typography variant="body2" sx={{ flex: 1, fontFamily: "monospace", fontWeight: 600 }}>
                {file}
              </Typography>
              <Chip label={`${resolvedCount}/${blocks.length}`} size="small" color={resolvedCount === blocks.length ? "success" : "default"} />
              <Button size="small" variant="contained" color="success"
                onClick={() => handleApplyAll(file)}
                disabled={resolving === file || blocks.length === 0 || resolvedCount !== blocks.length}
                sx={{ fontSize: "0.7rem" }}
              >
                {resolving === file ? "..." : "Apply & resolve"}
              </Button>
            </Box>
            {blocks.length === 0 && (
              <Typography variant="caption" sx={{ color: "text.secondary", px: 1 }}>
                No conflict blocks detected — file may already be resolved
              </Typography>
            )}
            {blocks.map((block, i) => {
              const key = `${file}::${i}`;
              const currentChoice = pendingResolves[key];
              return (
                <Paper key={i} variant="outlined" sx={{ m: 0.5, p: 1, borderColor: currentChoice ? "success.main" : "warning.main", borderWidth: currentChoice ? 2 : 1 }}>
                  <Box sx={{ display: "flex", gap: 0.5, mb: 0.5, flexWrap: "wrap" }}>
                    {["ours", "theirs", "both"].map(opt => (
                      <Button key={opt} size="small"
                        variant={currentChoice === opt ? "contained" : "outlined"}
                        color={opt === "ours" ? "error" : opt === "theirs" ? "success" : "warning"}
                        onClick={() => handleBlockResolve(file, i, currentChoice === opt ? null : opt)}
                        sx={{ fontSize: "0.65rem", minWidth: 50 }}
                      >
                        {opt === "ours" ? "Keep ours" : opt === "theirs" ? "Keep theirs" : "Keep both"}
                      </Button>
                    ))}
                  </Box>
                  <Box sx={{ display: "flex", gap: 1, fontSize: "0.7rem", fontFamily: "monospace", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    <Box sx={{ flex: 1, p: 0.5, bgcolor: "rgba(211,47,47,0.1)", borderRadius: 1 }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: "error.main", display: "block", mb: 0.25 }}>Ours</Typography>
                      {block.ours}
                    </Box>
                    <Box sx={{ flex: 1, p: 0.5, bgcolor: "rgba(56,142,60,0.1)", borderRadius: 1 }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: "success.main", display: "block", mb: 0.25 }}>Theirs</Typography>
                      {block.theirs}
                    </Box>
                  </Box>
                </Paper>
              );
            })}
          </Paper>
        );
      })}

      {files.length === 0 && (
        <Alert severity="success" sx={{ mb: 2 }}>
          All conflicts resolved! You can now continue.
        </Alert>
      )}

      <Divider sx={{ my: 2 }} />

      <Box sx={{ display: "flex", gap: 1 }}>
        <Button variant="contained" onClick={handleContinue}
          disabled={files.length > 0 || !!loading}
        >
          {loading === "continue" ? "Continuing..." : "Continue"}
        </Button>
        <Button variant="outlined" color="error" onClick={handleAbort} disabled={!!loading}>
          {loading === "abort" ? "Aborting..." : "Abort merge"}
        </Button>
      </Box>
    </Box>
  );
}
