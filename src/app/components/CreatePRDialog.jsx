import React, { useState, useEffect, useContext } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Box, Alert, Typography, Chip,
} from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { OrchidContext } from "../OrchidContext.jsx";
import { detectProvider, parseRemoteUrl } from "../utils/providerDetector";

const PROVIDER_LABELS = {
  github: "GitHub",
  gitlab: "GitLab",
  bitbucket: "Bitbucket",
  "azure-devops": "Azure DevOps",
  gitea: "Gitea",
  generic: "Git (auto-detected)",
  unknown: "Desconhecido",
};

export default function CreatePRDialog({ onClose }) {
  const { directory } = useContext(OrchidContext);
  const [headBranch, setHeadBranch] = useState("");
  const [baseBranch, setBaseBranch] = useState("main");
  const [title, setTitle] = useState("");
  const [remoteUrl, setRemoteUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [successUrl, setSuccessUrl] = useState(null);

  useEffect(() => {
    if (!directory) return;
    Promise.all([
      window.api.getCurrentBranch(directory),
      window.api.getOriginUrl(directory),
    ]).then(([branch, url]) => {
      setHeadBranch(branch);
      setRemoteUrl(url);
    }).catch(() => {});
  }, [directory]);

  const provider = remoteUrl
    ? (detectProvider(parseRemoteUrl(remoteUrl)) || "unknown")
    : null;

  const providerLabel = provider ? PROVIDER_LABELS[provider] || provider : null;

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    setSuccessUrl(null);

    try {
      if (!remoteUrl) {
        throw new Error("Este repositório não possui um remote configurado. Configure um remote em Settings para criar PRs.");
      }
      const result = await window.api.createPR(directory, {
        headBranch,
        baseBranch: baseBranch || "main",
        title: title.trim() || undefined,
      });
      setSuccess("Pull request page opened in your browser!");
      setSuccessUrl(result.url);
    } catch (e) {
      setError(e.message || String(e));
    }

    setLoading(false);
  };

  return (
    <Dialog open onClose={() => !loading && onClose()} maxWidth="sm" fullWidth>
      <DialogTitle>Create Pull Request</DialogTitle>
      <DialogContent>
        {providerLabel && (
          <Alert severity="info" sx={{ mb: 2, py: 0, "& .MuiAlert-message": { display: "flex", alignItems: "center" } }}>
            Platform detected: <Chip label={providerLabel} size="small" variant="outlined" sx={{ ml: 0.5, fontWeight: 600 }} />
          </Alert>
        )}

        {!remoteUrl && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Este repositório não possui um remote. Configure um remote em Settings para criar PRs.
          </Alert>
        )}

        <TextField
          fullWidth
          label="Source branch"
          value={headBranch}
          onChange={e => setHeadBranch(e.target.value)}
          disabled={loading}
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          label="Target branch"
          placeholder="main"
          value={baseBranch}
          onChange={e => setBaseBranch(e.target.value)}
          disabled={loading}
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          label="Title (optional)"
          placeholder="Brief description of your changes"
          value={title}
          onChange={e => setTitle(e.target.value)}
          disabled={loading}
          onKeyDown={e => { if (e.key === "Enter" && !loading) handleCreate(); }}
        />

        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        {success && (
          <Alert severity="success" sx={{ mt: 2 }}>
            {success}
            {successUrl && (
              <Typography variant="body2" sx={{ mt: 0.5, wordBreak: "break-all" }}>
                URL: {successUrl}
              </Typography>
            )}
          </Alert>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={() => onClose()} disabled={loading}>Cancel</Button>
        {success ? (
          <Button variant="contained" onClick={() => onClose()}>Close</Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!headBranch.trim() || !baseBranch.trim() || loading || !remoteUrl}
            startIcon={<OpenInNewIcon />}
          >
            {loading ? "Opening..." : "Open in Browser"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
