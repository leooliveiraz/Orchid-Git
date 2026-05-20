import React, { useState, useEffect, useContext } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Alert, LinearProgress,
} from "@mui/material";
import { OrchidContext } from "../OrchidContext.jsx";

export default function SettingsDialog({ onClose }) {
  const { directory } = useContext(OrchidContext);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (!directory || !window.api) return;
    setLoading(true);
    window.api.getUserConfig(directory).then(({ name, email }) => {
      setName(name || "");
      setEmail(email || "");
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [directory]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await window.api.setUserConfig(directory, name, email);
      setSuccess("User config saved");
    } catch (e) {
      setError(e.message || String(e));
    }
    setSaving(false);
  };

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Repository Settings</DialogTitle>
      {loading && <LinearProgress />}
      <DialogContent>
        {!loading && (
          <>
            <br></br>
            <TextField
              autoFocus
              fullWidth
              label="User name"
              placeholder="git config user.name"
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={saving}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="User email"
              placeholder="git config user.email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={saving}
            />
          </>
        )}
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Close</Button>
        <Button variant="contained" onClick={handleSave} disabled={loading || saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
