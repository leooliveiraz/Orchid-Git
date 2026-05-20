import React from "react";
import { Diff, Hunk, parseDiff } from "react-diff-view";
import {
  Dialog, DialogTitle, DialogContent, IconButton, Typography, Box,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

export default function DiffViewer({ fileName, diffText, onClose }) {
  const files = parseDiff(diffText || "");
  const hasContent = files.some(f => f.hunks?.length > 0);

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Typography component="div" variant="body2" sx={{ fontFamily: "monospace", flex: 1 }}>{fileName}</Typography>
        <IconButton size="small" onClick={onClose} aria-label="close">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ overflow: "auto" }}>
        {!hasContent && (
          <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center", py: 3 }}>
            No changes
          </Typography>
        )}
        {hasContent && files.map(file => (
          <Box key={file.newPath || file.oldPath} sx={{ mb: 2 }}>
            <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", display: "block", mb: 0.5, px: 1, py: 0.5, bgcolor: "action.hover", borderRadius: 1 }}>
              {file.newPath || file.oldPath}
            </Typography>
            <Diff
              className="dv-diff"
              diffType={file.type}
              hunks={file.hunks}
              viewType="unified"
            >
              {hunks => hunks.map(hunk => (
                <Hunk key={hunk.content} hunk={hunk} />
              ))}
            </Diff>
          </Box>
        ))}
      </DialogContent>
    </Dialog>
  );
}
