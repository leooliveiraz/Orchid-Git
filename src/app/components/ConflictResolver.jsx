import React, { useState, useEffect, useCallback, useContext } from "react";
import {
  Box, Typography, Button, Paper, Alert, LinearProgress, Chip, Divider,
} from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { OrchidContext } from "../OrchidContext.jsx";
import DiffViewer from "./DiffViewer.jsx";

export default function ConflictResolver({ directory, conflictedFiles, onRefresh }) {
  const { refresh } = useContext(OrchidContext);
  const [files, setFiles] = useState(conflictedFiles || []);
  const [loading, setLoading] = useState(null);
  const [diffViewer, setDiffViewer] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setFiles(conflictedFiles || []);
  }, [conflictedFiles]);

  const handleViewDiff = async (filePath) => {
    if (!window.api) return;
    try {
      const diff = await window.api.getConflictDiff(directory, filePath);
      setDiffViewer({ fileName: filePath, diffText: diff });
    } catch (e) {
      setError(e.message || String(e));
    }
  };

  const handleResolveOurs = async (filePath) => {
    if (!window.api) return;
    setLoading(filePath);
    setError(null);
    try {
      await window.api.checkoutOurs(directory, filePath);
      await window.api.resolveFile(directory, filePath);
      setFiles(prev => prev.filter(f => f !== filePath));
      onRefresh?.();
    } catch (e) {
      setError(e.message || String(e));
    }
    setLoading(null);
  };

  const handleResolveTheirs = async (filePath) => {
    if (!window.api) return;
    setLoading(filePath);
    setError(null);
    try {
      await window.api.checkoutTheirs(directory, filePath);
      await window.api.resolveFile(directory, filePath);
      setFiles(prev => prev.filter(f => f !== filePath));
      onRefresh?.();
    } catch (e) {
      setError(e.message || String(e));
    }
    setLoading(null);
  };

  const handleMarkResolved = async (filePath) => {
    if (!window.api) return;
    setLoading(filePath);
    setError(null);
    try {
      await window.api.resolveFile(directory, filePath);
      setFiles(prev => prev.filter(f => f !== filePath));
      onRefresh?.();
    } catch (e) {
      setError(e.message || String(e));
    }
    setLoading(null);
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

      <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
        Resolve all conflicts before continuing
      </Typography>

      {files.map(file => (
        <Paper key={file} variant="outlined" sx={{ p: 1.5, mb: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="body2" sx={{ flex: 1, fontFamily: "monospace", fontSize: "0.8125rem" }}>
              {file}
            </Typography>
            <Button size="small" variant="text" onClick={() => handleViewDiff(file)} disabled={loading === file}>
              Diff
            </Button>
            <Button size="small" variant="outlined" color="primary"
              onClick={() => handleResolveOurs(file)}
              disabled={loading === file}
              sx={{ fontSize: "0.7rem", minWidth: 60 }}
            >
              Ours
            </Button>
            <Button size="small" variant="outlined" color="primary"
              onClick={() => handleResolveTheirs(file)}
              disabled={loading === file}
              sx={{ fontSize: "0.7rem", minWidth: 60 }}
            >
              Theirs
            </Button>
            <Button size="small" variant="contained" color="success"
              onClick={() => handleMarkResolved(file)}
              disabled={loading === file}
              sx={{ fontSize: "0.7rem" }}
            >
              {loading === file ? "..." : "Resolved"}
            </Button>
          </Box>
        </Paper>
      ))}

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

      {diffViewer && (
        <DiffViewer
          fileName={diffViewer.fileName}
          diffText={diffViewer.diffText}
          onClose={() => setDiffViewer(null)}
        />
      )}
    </Box>
  );
}
