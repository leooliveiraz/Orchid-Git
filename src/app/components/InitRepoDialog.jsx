import React, { useState, useContext } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Typography, Alert, Box,
} from "@mui/material";
import NoteAddIcon from "@mui/icons-material/NoteAdd";
import { OrchidContext } from "../OrchidContext.jsx";

export default function InitRepoDialog({ onClose }) {
  const { setDirectory } = useContext(OrchidContext);
  const [dirPath, setDirPath] = useState("");
  const [initializing, setInitializing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleBrowse = async () => {
    if (!window.api) return;
    const data = await window.api.selectDirectory("");
    if (!data.canceled) {
      setDirPath(data.filePaths[0]);
    }
  };

  const handleInit = async () => {
    if (!dirPath.trim() || !window.api) return;
    setInitializing(true);
    setError(null);
    setSuccess(null);
    try {
      await window.api.initRepo(dirPath.trim());
      setSuccess(`Repository initialized at ${dirPath.trim()}`);
    } catch (e) {
      setError(e.message || String(e));
    }
    setInitializing(false);
  };

  const handleOpen = () => {
    setDirectory(dirPath.trim());
    onClose();
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <NoteAddIcon />
        Initialize Repository
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
          Create an empty Git repository in the specified directory.
        </Typography>
        <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
          <TextField
            autoFocus
            fullWidth
            label="Directory"
            placeholder="/path/to/new-repo"
            value={dirPath}
            onChange={e => setDirPath(e.target.value)}
            disabled={initializing}
            sx={{ flex: 1 }}
          />
          <Button variant="outlined" onClick={handleBrowse} disabled={initializing} sx={{ mt: 0.5, minWidth: 80 }}>
            Browse
          </Button>
        </Box>
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        {success && (
          <Alert severity="success" sx={{ mt: 2 }} action={
            <Button size="small" variant="contained" onClick={handleOpen}>Open</Button>
          }>
            {success}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={initializing}>Cancel</Button>
        <Button variant="contained" onClick={handleInit} disabled={!dirPath.trim() || initializing}>
          {initializing ? "Initializing..." : "Initialize"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
