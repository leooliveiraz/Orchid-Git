import React from "react";
import { Diff, Hunk, parseDiff } from "react-diff-view";
import {
  Dialog, DialogTitle, DialogContent, IconButton, Typography, Box, Chip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

export default function DiffViewer({ fileName, diffText, onClose }) {
  const files = parseDiff(diffText || "");
  const hasContent = files.some(f => f.hunks?.length > 0);

  const totalAdded = files.reduce((sum, f) =>
    sum + f.hunks.reduce((s, h) => s + h.changes.filter(c => c.type === "insert").length, 0), 0);
  const totalDeleted = files.reduce((sum, f) =>
    sum + f.hunks.reduce((s, h) => s + h.changes.filter(c => c.type === "delete").length, 0), 0);

  return (
    <Dialog open onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        <Typography component="div" variant="body2" sx={{ fontFamily: "monospace", flex: 1, fontWeight: 600 }}>
          {fileName}
        </Typography>
        {totalAdded > 0 && (
          <Chip label={`+${totalAdded}`} size="small" sx={{ color: "#28a745", fontWeight: 700, fontSize: "0.7rem" }} variant="outlined" />
        )}
        {totalDeleted > 0 && (
          <Chip label={`-${totalDeleted}`} size="small" sx={{ color: "#d73a49", fontWeight: 700, fontSize: "0.7rem" }} variant="outlined" />
        )}
        <IconButton size="small" onClick={onClose} aria-label="close">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ overflow: "auto", maxHeight: "70vh" }}>
        {!hasContent && (
          <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center", py: 3 }}>
            No changes
          </Typography>
        )}
        {hasContent && files.map((file, fi) => (
          <Box key={file.newPath || file.oldPath} sx={{ mb: 2 }}>
            {files.length > 1 && (
              <Typography variant="caption" sx={{
                fontWeight: 600, color: "text.secondary", display: "block", mb: 0.5,
                px: 1.5, py: 0.75, bgcolor: "action.hover", borderRadius: 1,
                fontFamily: "monospace", fontSize: "0.75rem",
              }}>
                {file.newPath || file.oldPath}
              </Typography>
            )}
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
