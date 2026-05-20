import React, { useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Typography, List, ListItem, ListItemIcon, ListItemText,
  LinearProgress, Box, Alert,
} from "@mui/material";

export default function CommitDialog({ directory, stagedFiles, onClose }) {
  const [message, setMessage] = useState("");
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState(null);

  const handleCommit = async () => {
    if (!message.trim()) return;
    setCommitting(true);
    setError(null);
    try {
      await window.api.commit(directory, message.trim());
      onClose(true);
    } catch (e) {
      setError(e.message || String(e));
    }
    setCommitting(false);
  };

  return (
    <Dialog open onClose={() => !committing && onClose(false)} maxWidth="sm" fullWidth>
      <DialogTitle>Commit changes</DialogTitle>
      {committing && <LinearProgress />}
      <DialogContent>
        <TextField
          autoFocus
          multiline
          minRows={3}
          maxRows={6}
          fullWidth
          placeholder="Commit message"
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleCommit(); }}
          disabled={committing}
          sx={{ mb: 2 }}
        />

        <Typography variant="body2" sx={{ fontWeight: 600, color: "text.secondary", mb: 1 }}>
          Staged files ({stagedFiles.length})
        </Typography>

        <List dense sx={{ maxHeight: 200, overflow: "auto" }}>
          {stagedFiles.map(f => (
            <ListItem key={f.path} sx={{ py: 0 }}>
              <ListItemIcon sx={{ minWidth: 28 }}>
                <Box component="span" sx={{ color: "success.main", fontWeight: 700, fontSize: "0.75rem" }}>A</Box>
              </ListItemIcon>
              <ListItemText primary={f.path} primaryTypographyProps={{ variant: "body2", noWrap: true }} />
            </ListItem>
          ))}
        </List>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={() => onClose(false)} disabled={committing}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleCommit}
          disabled={!message.trim() || committing}
        >
          {committing ? "Committing..." : "Commit"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
