import React, { useState, useContext } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Typography, Box, Alert, MenuItem, Radio, RadioGroup, FormControlLabel, FormControl, FormLabel,
} from "@mui/material";
import { OrchidContext } from "../OrchidContext.jsx";

const STRATEGIES = [
  { value: "normal", label: "Normal (merge commit)" },
  { value: "squash", label: "Squash (squash all into one commit)" },
  { value: "no-ff", label: "No fast-forward (force merge commit)" },
  { value: "ff-only", label: "Fast-forward only (abort if not possible)" },
];

export default function MergeDialog({ onClose, defaultBranch }) {
  const { directory, repoData, refresh } = useContext(OrchidContext);
  const [source, setSource] = useState(defaultBranch || "");
  const [strategy, setStrategy] = useState("normal");
  const [merging, setMerging] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const branches = repoData?.branches?.filter(b => b !== repoData?.currentBranch) || [];

  const handleMerge = async () => {
    if (!source || !directory || !window.api) return;
    setMerging(true);
    setError(null);
    setSuccess(null);
    try {
      const output = await window.api.merge(directory, source, strategy);
      setSuccess(`Merged ${source} into ${repoData.currentBranch}`);
      refresh();
    } catch (e) {
      setError(e.message || String(e));
    }
    setMerging(false);
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Merge branch</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
          Current branch: <strong>{repoData?.currentBranch}</strong>
        </Typography>

        <TextField
          select
          fullWidth
          label="Source branch"
          value={source}
          onChange={e => setSource(e.target.value)}
          disabled={merging}
          sx={{ mb: 2 }}
        >
          {branches.map(b => (
            <MenuItem key={b} value={b}>{b}</MenuItem>
          ))}
        </TextField>

        <FormControl component="fieldset">
          <FormLabel component="legend">Merge strategy</FormLabel>
          <RadioGroup value={strategy} onChange={e => setStrategy(e.target.value)}>
            {STRATEGIES.map(s => (
              <FormControlLabel key={s.value} value={s.value} control={<Radio size="small" />} label={<Typography variant="body2">{s.label}</Typography>} />
            ))}
          </RadioGroup>
        </FormControl>

        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={merging}>Cancel</Button>
        <Button variant="contained" onClick={handleMerge} disabled={!source || merging}>
          {merging ? "Merging..." : "Merge"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
