import React, { useContext, useState } from "react";
import { Box, Typography, Button } from "@mui/material";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { OrchidContext } from "../OrchidContext.jsx";
import CloneDialog from "./CloneDialog.jsx";

export default function NoDirectory() {
  const { setDirectory } = useContext(OrchidContext);
  const [showClone, setShowClone] = useState(false);

  function selectDirectory() {
    window.api.selectDirectory("").then((data) => {
      if (!data.canceled) {
        setDirectory(data.filePaths[0]);
      }
    });
  }

  return (
    <>
      <Box sx={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 2, p: 4,
      }}>
        <Typography variant="h3" sx={{ fontWeight: 300, color: "text.primary" }}>
          Orchid Git
        </Typography>
        <Typography variant="body1" sx={{ color: "text.secondary", mb: 2 }}>
          Your Git GUI for Electron
        </Typography>

        <Button variant="outlined" size="large" startIcon={<FolderOpenIcon />}
          onClick={selectDirectory} sx={{ minWidth: 220, justifyContent: "flex-start" }}
        >
          Open Project
        </Button>

        <Button variant="outlined" size="large" startIcon={<ContentCopyIcon />}
          onClick={() => setShowClone(true)} sx={{ minWidth: 220, justifyContent: "flex-start" }}
        >
          Clone Repository
        </Button>
      </Box>

      {showClone && <CloneDialog onClose={() => setShowClone(false)} />}
    </>
  );
}
