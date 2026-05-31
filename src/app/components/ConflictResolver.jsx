import React, { useState } from "react";
import {
  Box, Typography, Button, Paper, Chip, Alert, Divider,
} from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CallSplitIcon from "@mui/icons-material/CallSplit";
import ConflictResolverDialog from "./ConflictResolverDialog.jsx";

export default function ConflictResolver({ directory, conflictedFiles, onRefresh }) {
  const [showDialog, setShowDialog] = useState(false);
  const files = conflictedFiles || [];

  return (
    <Box sx={{ py: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2, flexWrap: "wrap" }}>
        <WarningAmberIcon color="warning" />
        <Typography variant="h6" sx={{ fontWeight: 600 }}>Merge Conflicts</Typography>
        <Chip label={`${files.length} file(s)`} size="small" color="error" />
        {files.length > 0 && (
          <Button size="small" variant="contained" startIcon={<CallSplitIcon />}
            onClick={() => setShowDialog(true)}
          >
            Open conflict resolver
          </Button>
        )}
      </Box>

      {files.length === 0 && (
        <Alert severity="success">All conflicts resolved!</Alert>
      )}

      {files.length > 0 && (
        <>
          {files.map(file => (
            <Paper key={file} variant="outlined" sx={{ mb: 1, p: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="body2" sx={{ flex: 1, fontFamily: "monospace", fontWeight: 600 }}>{file}</Typography>
              <Button size="small" variant="outlined" color="warning"
                onClick={() => setShowDialog(true)}
              >
                Resolve
              </Button>
            </Paper>
          ))}
          <Divider sx={{ my: 2 }} />
          
        </>
      )}

      {showDialog && (
        <ConflictResolverDialog
          directory={directory}
          conflictedFiles={files}
          onClose={() => setShowDialog(false)}
          onRefresh={onRefresh}
        />
      )}
    </Box>
  );
}
