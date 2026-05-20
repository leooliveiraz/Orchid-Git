import React, { useState, useContext } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField,
} from "@mui/material";
import { OrchidContext } from "../OrchidContext.jsx";

export default function CreateBranchDialog({ onClose }) {
  const { directory, refresh } = useContext(OrchidContext);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  const handleCreate = async () => {
    if (!name.trim() || !directory || !window.api) return;
    setCreating(true);
    setError(null);
    try {
      await window.api.createBranch(directory, name.trim());
      refresh();
      onClose();
    } catch (e) {
      setError(e.message || String(e));
    }
    setCreating(false);
  };

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Create branch</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          label="Branch name"
          placeholder="e.g. feature/new-feature"
          value={name}
          onChange={e => setName(e.target.value)}
          disabled={creating}
          error={!!error}
          helperText={error}
          onKeyDown={e => { if (e.key === "Enter") handleCreate(); }}
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={creating}>Cancel</Button>
        <Button variant="contained" onClick={handleCreate} disabled={!name.trim() || creating}>
          {creating ? "Creating..." : "Create & switch"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
