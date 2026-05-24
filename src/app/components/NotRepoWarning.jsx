import React, { useContext, useState } from "react";
import { Box, Typography, Button, Alert } from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import NoteAddIcon from "@mui/icons-material/NoteAdd";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import { OrchidContext } from "../OrchidContext.jsx";

export default function NotRepoWarning() {
  const { directory, setDirectory, refresh } = useContext(OrchidContext);
  const [initializing, setInitializing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleInit = async () => {
    if (!window.api) return;
    setInitializing(true);
    setError(null);
    try {
      await window.api.initRepo(directory);
      setSuccess("Repository initialized");
      refresh();
    } catch (e) {
      setError(e.message || String(e));
    }
    setInitializing(false);
  };

  const handleSelectDir = () => {
    window.api.selectDirectory("").then((data) => {
      if (!data.canceled) setDirectory(data.filePaths[0]);
    });
  };

  return (
    <Box sx={{
      flex: 1, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 2, p: 4,
    }}>
      <WarningAmberIcon sx={{ fontSize: 48, color: "warning.main" }} />
      <Typography variant="h5" sx={{ fontWeight: 600 }}>Not a Git Repository</Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center", maxWidth: 400 }}>
        The directory <strong>{directory}</strong> is not a Git repository.
      </Typography>

      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success">{success}</Alert>}

      <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
        <Button variant="contained" size="large" startIcon={<NoteAddIcon />}
          onClick={handleInit} disabled={initializing}>
          {initializing ? "Initializing..." : "Initialize repository"}
        </Button>
        <Button variant="outlined" size="large" startIcon={<FolderOpenIcon />} onClick={handleSelectDir}>
          Choose another directory
        </Button>
      </Box>
    </Box>
  );
}
