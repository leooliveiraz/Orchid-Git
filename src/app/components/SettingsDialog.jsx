import React, { useState, useEffect, useContext } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Alert, LinearProgress,
  FormControlLabel, Checkbox, Typography, Box, Divider,
} from "@mui/material";
import { OrchidContext } from "../OrchidContext.jsx";

export default function SettingsDialog({ onClose }) {
  const { directory } = useContext(OrchidContext);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [originUrl, setOriginUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [skipConfirm, setSkipConfirm] = useState(() => localStorage.getItem("orchid-skip-repo-switch") === "true");

  useEffect(() => {
    if (!directory || !window.api) return;
    setLoading(true);
    Promise.all([
      window.api.getUserConfig(directory),
      window.api.getOriginUrl(directory),
    ]).then(([{ name, email }, origin]) => {
      setName(name || "");
      setEmail(email || "");
      setOriginUrl(origin || "");
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [directory]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await window.api.setUserConfig(directory, name, email);
      if (originUrl.trim()) {
        await window.api.setOriginUrl(directory, originUrl.trim());
      }
      setSuccess("Settings saved");
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
            <Typography variant="overline" sx={{ display: "block", color: "text.secondary", mb: 1 }}>User</Typography>
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
              sx={{ mb: 2 }}
            />

            <Divider sx={{ my: 2 }} />
            <Typography variant="overline" sx={{ display: "block", color: "text.secondary", mb: 1 }}>Remote</Typography>
            <TextField
              fullWidth
              label="Origin URL"
              placeholder="https://github.com/user/repo.git"
              value={originUrl}
              onChange={e => setOriginUrl(e.target.value)}
              disabled={saving}
              sx={{ mb: 2 }}
            />

            <Divider sx={{ mt: 2, mb: 1 }} />
            <FormControlLabel
              control={<Checkbox checked={skipConfirm}
                onChange={e => {
                  setSkipConfirm(e.target.checked);
                  localStorage.setItem("orchid-skip-repo-switch", e.target.checked ? "true" : "false");
                }}
              />}
              label={<Typography variant="body2">Don't ask when switching repositories</Typography>}
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
