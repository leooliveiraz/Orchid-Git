import React from "react";
import {
  Dialog, DialogTitle, DialogContent, IconButton, Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

function hashToColor(hash) {
  if (!hash || hash === "00000000") return { bg: "transparent", bar: "transparent" };
  const hue = parseInt(hash.slice(0, 6), 16) % 360;
  return { bg: `hsla(${hue}, 25%, 50%, 0.12)`, bar: `hsl(${hue}, 50%, 50%)` };
}

export default function BlameViewer({ fileName, blameData, onClose }) {
  return (
    <Dialog open onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Typography component="div" variant="body2" sx={{ fontFamily: "monospace", flex: 1, fontWeight: 600 }}>
          {fileName}
        </Typography>
        <IconButton size="small" onClick={onClose} aria-label="close">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ overflow: "auto", maxHeight: "70vh", p: 0 }}>
        {blameData.map((row, i) => {
          const { bg, bar } = hashToColor(row.hash);
          return (
            <div key={i} style={{ display: "flex", background: bg, fontFamily: "monospace", fontSize: "0.75rem", lineHeight: 1.5 }}>
              <div style={{ width: 3, background: bar, flexShrink: 0 }} />
              <div style={{
                textAlign: "right", padding: "0 6px 0 8px", minWidth: 32, userSelect: "none",
                color: "var(--text-secondary)",
              }}>
                {row.lineNum}
              </div>
              <div style={{
                padding: "0 4px", minWidth: 62, userSelect: "none",
                color: "primary.main",
              }}>
                {(row.hash || "").slice(0, 7)}
              </div>
              <div style={{
                padding: "0 8px", minWidth: 120, userSelect: "none", overflow: "hidden",
                textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {row.author}
              </div>
              <div style={{
                padding: "0 8px", minWidth: 76, userSelect: "none", whiteSpace: "nowrap",
                color: "var(--text-secondary)",
              }}>
                {row.date}
              </div>
              <div style={{
                flex: 1, padding: "0 8px", whiteSpace: "pre-wrap",
                color: "inherit",
              }}>
                {row.content || "\u00A0"}
              </div>
            </div>
          );
        })}
        {blameData.length === 0 && (
          <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center", py: 3 }}>
            No blame data available
          </Typography>
        )}
      </DialogContent>
    </Dialog>
  );
}
