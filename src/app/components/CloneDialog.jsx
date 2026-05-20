import React, { useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Box, Alert, LinearProgress,
} from "@mui/material";

export default function CloneDialog({ onClose }) {
  const [url, setUrl] = useState("");
  const [destPath, setDestPath] = useState("");
  const [cloning, setCloning] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleBrowse = async () => {
    if (!window.api) return;
    const data = await window.api.selectDirectory("");
    if (!data.canceled) {
      setDestPath(data.filePaths[0]);
    }
  };

  const handleClone = async () => {
    if (!url.trim() || !destPath.trim()) return;
    setCloning(true);
    setError(null);
    setSuccess(null);
    try {
      await window.api.clone(url.trim(), destPath);
      setSuccess(`Repository cloned to ${destPath}`);
    } catch (e) {
      setError(e.message || String(e));
    }
    setCloning(false);
  };

  return (
    <Dialog open onClose={() => !cloning && onClose()} maxWidth="sm" fullWidth>
      <DialogTitle>Clone Repository</DialogTitle>
      {cloning && <LinearProgress />}
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          label="Repository URL"
          placeholder="https://github.com/user/repo.git"
          value={url}
          onChange={e => setUrl(e.target.value)}
          disabled={cloning}
          sx={{ mb: 2 }}
        />

        <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
          <TextField
            fullWidth
            label="Destination directory"
            placeholder="/path/to/destination"
            value={destPath}
            onChange={e => setDestPath(e.target.value)}
            disabled={cloning}
          />
          <Button variant="outlined" onClick={handleBrowse} disabled={cloning} sx={{ mt: 0.5, minWidth: 80 }}>
            Browse
          </Button>
        </Box>

        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}
      </DialogContent>

      <DialogActions>
        <Button onClick={() => onClose()} disabled={cloning}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleClone}
          disabled={!url.trim() || !destPath.trim() || cloning}
        >
          {cloning ? "Cloning..." : "Clone"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
