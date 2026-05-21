import React, { useState, useEffect, useContext, useCallback } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, Alert, MenuItem, TextField, Chip, IconButton,
  LinearProgress,
} from "@mui/material";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import { OrchidContext } from "../OrchidContext.jsx";

const ACTIONS = [
  { value: "pick", label: "pick", color: "#1976d2" },
  { value: "reword", label: "reword", color: "#e6a817" },
  { value: "squash", label: "squash", color: "#f57c00" },
  { value: "fixup", label: "fixup", color: "#d32f2f" },
  { value: "drop", label: "drop", color: "#6a737d" },
];

export default function RebaseDialog({ onClose }) {
  const { directory, repoData, refresh } = useContext(OrchidContext);
  const [target, setTarget] = useState("");
  const [commits, setCommits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rebasing, setRebasing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const branches = repoData?.branches?.filter(b => b !== repoData?.currentBranch) || [];

  const fetchCommits = useCallback(async () => {
    if (!target || !directory || !window.api) return;
    setLoading(true);
    setError(null);
    try {
      const list = await window.api.getRebaseCommits(directory, target);
      setCommits(list.map(c => ({ ...c, action: "pick" })));
    } catch (e) {
      setError(e.message || String(e));
    }
    setLoading(false);
  }, [directory, target]);

  useEffect(() => {
    if (target) fetchCommits();
  }, [target, fetchCommits]);

  const moveCommit = (index, dir) => {
    setCommits(prev => {
      const next = [...prev];
      const swap = dir === "up" ? index - 1 : index + 1;
      if (swap < 0 || swap >= next.length) return prev;
      [next[index], next[swap]] = [next[swap], next[index]];
      return next;
    });
  };

  const setAction = (index, action) => {
    setCommits(prev => {
      const next = [...prev];
      next[index] = { ...next[index], action };
      return next;
    });
  };

  const handleRebase = async () => {
    if (!target || !directory || !window.api) return;
    setRebasing(true);
    setError(null);
    setSuccess(null);
    try {
      await window.api.executeRebase(directory, target, commits);
      setSuccess("Rebase completed successfully");
      refresh();
    } catch (e) {
      setError(e.message || String(e));
    }
    setRebasing(false);
  };

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Interactive rebase</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
          Current branch: <strong>{repoData?.currentBranch}</strong>
        </Typography>

        <TextField
          select
          fullWidth
          label="Rebase onto"
          value={target}
          onChange={e => setTarget(e.target.value)}
          disabled={rebasing}
          sx={{ mb: 2 }}
        >
          {branches.map(b => (
            <MenuItem key={b} value={b}>{b}</MenuItem>
          ))}
        </TextField>

        {loading && <LinearProgress sx={{ mb: 2 }} />}

        {commits.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" sx={{ color: "text.secondary", mb: 1, display: "block" }}>
              {commits.length} commits to rebase — drag actions to reorder
            </Typography>
            {commits.map((c, i) => {
              const actionColor = ACTIONS.find(a => a.value === c.action)?.color || "#888";
              return (
                <Box key={c.hash} sx={{ display: "flex", gap: 1, alignItems: "center", mb: 0.5, p: 0.5, borderRadius: 1, bgcolor: "action.hover" }}>
                  <TextField
                    select
                    size="small"
                    value={c.action}
                    onChange={e => setAction(i, e.target.value)}
                    disabled={rebasing}
                    sx={{ width: 110 }}
                  >
                    {ACTIONS.map(a => (
                      <MenuItem key={a.value} value={a.value} sx={{ fontSize: "0.75rem" }}>{a.label}</MenuItem>
                    ))}
                  </TextField>
                  <IconButton size="small" onClick={() => moveCommit(i, "up")} disabled={i === 0 || rebasing}>
                    <ArrowUpwardIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => moveCommit(i, "down")} disabled={i === commits.length - 1 || rebasing}>
                    <ArrowDownwardIcon fontSize="small" />
                  </IconButton>
                  <Typography variant="caption" sx={{ fontFamily: "monospace", color: "primary.main", minWidth: 60 }}>
                    {c.hash}
                  </Typography>
                  <Typography variant="body2" sx={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.message}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        )}

        {!target && commits.length === 0 && !loading && (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>Select a target branch to see the commits</Typography>
        )}

        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={rebasing}>Cancel</Button>
        <Button variant="contained" onClick={handleRebase} disabled={!target || commits.length === 0 || rebasing}>
          {rebasing ? "Rebasing..." : "Start rebase"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
