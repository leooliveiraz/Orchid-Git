import React, { useState, useContext } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Typography, Alert,
} from "@mui/material";
import { OrchidContext } from "../OrchidContext.jsx";

export default function CherryPickDialog({ onClose }) {
  const { directory, refresh } = useContext(OrchidContext);
  const [hash, setHash] = useState("");
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleCherryPick = async () => {
    if (!hash.trim() || !directory || !window.api) return;
    setPicking(true);
    setError(null);
    setSuccess(null);
    try {
      await window.api.cherryPick(directory, hash.trim());
      setSuccess(`Cherry-picked ${hash.trim()}`);
      refresh();
    } catch (e) {
      setError(e.message || String(e));
    }
    setPicking(false);
  };

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Cherry-pick commit</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          label="Commit hash"
          placeholder="e.g. a1b2c3d4"
          value={hash}
          onChange={e => setHash(e.target.value)}
          disabled={picking}
          onKeyDown={e => { if (e.key === "Enter") handleCherryPick(); }}
          sx={{ mt: 1 }}
          helperText="Paste the commit hash you want to cherry-pick into the current branch"
        />
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={picking}>Cancel</Button>
        <Button variant="contained" onClick={handleCherryPick} disabled={!hash.trim() || picking}>
          {picking ? "Cherry-picking..." : "Cherry-pick"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
