import React, { useEffect, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, Typography, Chip, Alert, LinearProgress, CircularProgress,
} from "@mui/material";
import SystemUpdateAltIcon from "@mui/icons-material/SystemUpdateAlt";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

function formatBytes(bytes) {
  if (!bytes) return "";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[i]}`;
}

export default function UpdateDialog({ onClose }) {
  const [info, setInfo] = useState(null);
  const [error, setError] = useState(null);
  const [checking, setChecking] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState({ received: 0, total: 0 });
  const [downloadedPath, setDownloadedPath] = useState(null);
  const [installing, setInstalling] = useState(false);

  const check = async () => {
    if (!window.api) return;
    setChecking(true);
    setError(null);
    try {
      const result = await window.api.checkForUpdates();
      setInfo(result);
    } catch (e) {
      setError(e.message || String(e));
    }
    setChecking(false);
  };

  useEffect(() => { check(); }, []);

  useEffect(() => {
    if (!window.api?.onUpdateProgress) return;
    const unsub = window.api.onUpdateProgress((p) => setProgress(p));
    return unsub;
  }, []);

  const handleDownload = async () => {
    if (!window.api || !info?.asset) return;
    setDownloading(true);
    setError(null);
    setProgress({ received: 0, total: 0 });
    try {
      const path = await window.api.downloadUpdate(info.asset.url, info.asset.name);
      setDownloadedPath(path);
    } catch (e) {
      setError(e.message || String(e));
    }
    setDownloading(false);
  };

  const handleInstall = async () => {
    if (!window.api || !downloadedPath) return;
    setInstalling(true);
    setError(null);
    try {
      await window.api.installUpdate(downloadedPath);
    } catch (e) {
      setError(e.message || String(e));
      setInstalling(false);
    }
  };

  const percent = progress.total > 0 ? Math.round((progress.received / progress.total) * 100) : 0;

  return (
    <Dialog open onClose={() => !downloading && !installing && onClose()} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <SystemUpdateAltIcon />
        Software Update
      </DialogTitle>
      <DialogContent>
        {checking && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, py: 3, justifyContent: "center" }}>
            <CircularProgress size={24} />
            <Typography variant="body2">Checking for updates...</Typography>
          </Box>
        )}

        {!checking && info && (
          <>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 2, flexWrap: "wrap" }}>
              <Chip label={`Current: v${info.currentVersion}`} size="small" variant="outlined" />
              {info.hasUpdate && <Chip label={`Latest: v${info.latestVersion}`} size="small" color="success" variant="outlined" />}
              {info.hasUpdate && <CheckCircleIcon sx={{ color: "success.main", fontSize: 18 }} />}
            </Box>

            {info.hasUpdate && (
              <>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  {info.releaseName || `Version ${info.latestVersion}`}
                </Typography>
                {info.releaseNotes && (
                  <Box sx={{
                    maxHeight: 200, overflow: "auto", mb: 2,
                    fontSize: "0.8125rem", whiteSpace: "pre-wrap",
                    bgcolor: "action.hover", borderRadius: 1, p: 1.5,
                  }}>
                    {info.releaseNotes}
                  </Box>
                )}
                {info.asset && (
                  <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 1 }}>
                    Package: {info.asset.name} ({formatBytes(info.asset.size)})
                  </Typography>
                )}
                {downloading && (
                  <Box sx={{ mb: 2 }}>
                    <LinearProgress variant={progress.total > 0 ? "determinate" : "indeterminate"} value={percent} sx={{ mb: 0.5 }} />
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {progress.total > 0 ? `${percent}% (${formatBytes(progress.received)} / ${formatBytes(progress.total)})` : "Downloading..."}
                    </Typography>
                  </Box>
                )}
                {downloadedPath && !installing && (
                  <Alert severity="success" sx={{ mb: 1 }}>
                    Download complete. Click "Install & Restart" to apply the update.
                  </Alert>
                )}
                {installing && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
                    <CircularProgress size={20} />
                    <Typography variant="body2">Installing update...</Typography>
                  </Box>
                )}
              </>
            )}

            {!info.hasUpdate && (
              <Alert severity="success">You're up to date! v{info.currentVersion} is the latest version.</Alert>
            )}
          </>
        )}

        {!checking && error && (
          <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={downloading || installing}>Close</Button>
        {!checking && !info?.hasUpdate && !downloadedPath && (
          <Button variant="outlined" onClick={check}>Check again</Button>
        )}
        {!downloading && !downloadedPath && info?.hasUpdate && info?.asset && (
          <Button variant="contained" onClick={handleDownload}>Download & Install</Button>
        )}
        {downloadedPath && !installing && (
          <Button variant="contained" color="success" onClick={handleInstall}>Install & Restart</Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
