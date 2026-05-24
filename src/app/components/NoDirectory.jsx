import React, { useContext, useState } from "react";
import { Box, Typography, Button, Divider } from "@mui/material";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import NoteAddIcon from "@mui/icons-material/NoteAdd";
import FolderIcon from "@mui/icons-material/Folder";
import { OrchidContext } from "../OrchidContext.jsx";
import CloneDialog from "./CloneDialog.jsx";
import InitRepoDialog from "./InitRepoDialog.jsx";

export default function NoDirectory() {
  const { setDirectory, recentDirs } = useContext(OrchidContext);
  const [showClone, setShowClone] = useState(false);
  const [showInit, setShowInit] = useState(false);

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
          Open Repository
        </Button>

        <Button variant="outlined" size="large" startIcon={<ContentCopyIcon />}
          onClick={() => setShowClone(true)} sx={{ minWidth: 220, justifyContent: "flex-start" }}
        >
          Clone Repository
        </Button>

        <Button variant="outlined" size="large" startIcon={<NoteAddIcon />}
          onClick={() => setShowInit(true)} sx={{ minWidth: 220, justifyContent: "flex-start" }}
        >
          New Repository
        </Button>

        {recentDirs?.length > 0 && (
          <Box sx={{ mt: 3, width: "100%", maxWidth: 360 }}>
            <Divider sx={{ mb: 2 }}>Recent</Divider>
            {recentDirs.map(dir => (
              <Box
                key={dir}
                onClick={() => setDirectory(dir)}
                sx={{
                  display: "flex", alignItems: "center", gap: 1, p: 1, borderRadius: 1,
                  cursor: "pointer", "&:hover": { bgcolor: "action.hover" },
                }}
              >
                <FolderIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                <Typography variant="body2" sx={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {dir}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {showClone && <CloneDialog onClose={() => setShowClone(false)} />}
      {showInit && <InitRepoDialog onClose={() => setShowInit(false)} />}
    </>
  );
}
