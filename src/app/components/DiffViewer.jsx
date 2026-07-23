import React, { useState, useRef, useCallback, useMemo, useEffect } from "react";
import {
  Dialog, DialogTitle, DialogContent, IconButton, Typography, Box, Chip, ToggleButtonGroup, ToggleButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp", ".svg", ".ico"]);

function isImageFile(name) {
  const ext = name?.substring(name.lastIndexOf(".")).toLowerCase();
  return IMAGE_EXTENSIONS.has(ext);
}

function mimeType(name) {
  const ext = name?.substring(name.lastIndexOf(".")).toLowerCase();
  const map = {
    ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".gif": "image/gif", ".bmp": "image/bmp", ".webp": "image/webp",
    ".svg": "image/svg+xml", ".ico": "image/x-icon",
  };
  return map[ext] || "image/png";
}

function splitDiff(diffText) {
  const lines = diffText.split("\n");
  const hunks = [];
  let currentHunk = null;

  for (const raw of lines) {
    if (raw.startsWith("@@")) {
      if (currentHunk) hunks.push(currentHunk);
      const m = raw.match(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
      currentHunk = {
        oldStart: m ? parseInt(m[1], 10) : 1,
        newStart: m ? parseInt(m[3], 10) : 1,
        lines: [],
      };
    } else if (currentHunk) {
      if (raw.startsWith("diff") || raw.startsWith("index") || raw.startsWith("---") || raw.startsWith("+++")) {
        if (currentHunk.lines.length === 0) { currentHunk = null; }
        continue;
      }
      currentHunk.lines.push(raw);
    }
  }
  if (currentHunk) hunks.push(currentHunk);

  const oldLines = [];
  const newLines = [];
  for (const hunk of hunks) {
    let oN = hunk.oldStart;
    let nN = hunk.newStart;
    for (const line of hunk.lines) {
      if (line.startsWith(" ")) {
        const c = line.slice(1);
        oldLines.push({ num: oN++, content: c, type: "context" });
        newLines.push({ num: nN++, content: c, type: "context" });
      } else if (line.startsWith("-")) {
        oldLines.push({ num: oN++, content: line.slice(1), type: "delete" });
        newLines.push({ num: null, content: "", type: "blank" });
      } else if (line.startsWith("+")) {
        oldLines.push({ num: null, content: "", type: "blank" });
        newLines.push({ num: nN++, content: line.slice(1), type: "add" });
      }
    }
  }
  return { oldLines, newLines };
}

function parseUnifiedLines(diffText) {
  const lines = diffText.split("\n");
  const result = [];
  let oldLine = 0, newLine = 0;

  for (const line of lines) {
    if (line.startsWith("@@")) {
      const m = line.match(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
      if (m) { oldLine = parseInt(m[1], 10); newLine = parseInt(m[3], 10); }
      continue;
    }
    if (line.startsWith("diff") || line.startsWith("index") || line.startsWith("---") || line.startsWith("+++")) continue;
    if (line.startsWith(" ")) {
      result.push({ oldNum: oldLine++, newNum: newLine++, content: line.slice(1), type: "context" });
    } else if (line.startsWith("-")) {
      result.push({ oldNum: oldLine++, newNum: null, content: line.slice(1), type: "delete" });
    } else if (line.startsWith("+")) {
      result.push({ oldNum: null, newNum: newLine++, content: line.slice(1), type: "add" });
    }
  }
  return result;
}

function LineRow({ num, content, type, isLeft }) {
  let bg = "transparent";
  let color = "inherit";
  if (type === "delete") { bg = "rgba(244,67,54,0.35)"; color = "var(--diff-del-text)"; }
  else if (type === "add") { bg = "rgba(76,175,80,0.35)"; color = "var(--diff-add-text)"; }
  else if (type === "blank" && !isLeft) { color = "transparent"; }
  return (
    <div style={{ display: "flex", background: bg, color, fontFamily: "inherit", fontSize: "inherit", lineHeight: 1.5 }}>
      <div style={{
        textAlign: "right", padding: "0 6px 0 8px", minWidth: 36, userSelect: "none",
        color: num != null ? "var(--text-secondary)" : "transparent",
        background: type === "blank" ? "transparent" : bg,
      }}>
        {num != null ? num : ""}
      </div>
      <div style={{ flex: 1, padding: "0 8px", whiteSpace: "pre-wrap", background: type === "blank" ? "transparent" : bg }}>
        {content || "\u00A0"}
      </div>
    </div>
  );
}

function UnifiedRow({ oldNum, newNum, content, type }) {
  let bg = "transparent";
  let color = "inherit";
  if (type === "delete") { bg = "rgba(244,67,54,0.35)"; color = "var(--diff-del-text)"; }
  else if (type === "add") { bg = "rgba(76,175,80,0.35)"; color = "var(--diff-add-text)"; }
  return (
    <div style={{ display: "flex", background: bg, color, fontFamily: "inherit", fontSize: "inherit", lineHeight: 1.5 }}>
      <div style={{ textAlign: "right", padding: "0 4px", minWidth: 36, userSelect: "none", color: oldNum != null ? "var(--text-secondary)" : "transparent" }}>
        {oldNum != null ? oldNum : ""}
      </div>
      <div style={{ textAlign: "right", padding: "0 4px", minWidth: 36, userSelect: "none", color: newNum != null ? "var(--text-secondary)" : "transparent" }}>
        {newNum != null ? newNum : ""}
      </div>
      <div style={{ flex: 1, padding: "0 8px", whiteSpace: "pre-wrap" }}>{content || "\u00A0"}</div>
    </div>
  );
}

export default function DiffViewer({ fileName, diffText, onClose, directory, staged, commitHash, filePath }) {
  const [viewType, setViewType] = useState("unified");
  const leftRef = useRef(null);
  const rightRef = useRef(null);
  const syncing = useRef(false);
  const [oldImage, setOldImage] = useState(null);
  const [newImage, setNewImage] = useState(null);

  const imageFilePath = filePath || fileName;
  const isImage = isImageFile(imageFilePath);

  useEffect(() => {
    if (!isImage || !directory || !window.api) return;
    let cancelled = false;

    async function fetchImages() {
      let oldB64 = null, newB64 = null;
      if (commitHash) {
        oldB64 = await window.api.getFileAtCommitBase64(directory, commitHash, imageFilePath).catch(() => null);
        newB64 = await window.api.getFileContentBase64(directory, imageFilePath)
          .catch(() => window.api.getFileAtRefBase64(directory, "HEAD", imageFilePath))
          .catch(() => null);
      } else if (staged) {
        oldB64 = await window.api.getFileAtRefBase64(directory, "HEAD", imageFilePath).catch(() => null);
        newB64 = await window.api.getFileAtRefBase64(directory, ":", imageFilePath).catch(() => null);
      } else {
        oldB64 = await window.api.getFileAtRefBase64(directory, ":", imageFilePath).catch(() => null);
        newB64 = await window.api.getFileContentBase64(directory, imageFilePath).catch(() => null);
      }
      if (!cancelled) {
        setOldImage(oldB64);
        setNewImage(newB64);
      }
    }
    fetchImages().catch(() => {});
    return () => { cancelled = true; };
  }, [isImage, directory, imageFilePath, staged, commitHash]);

  const parsed = splitDiff(diffText || "");
  const unifiedLines = useMemo(() => parseUnifiedLines(diffText || ""), [diffText]);
  const hasContent = parsed.oldLines.length > 0 || parsed.newLines.length > 0;

  let totalAdded = 0, totalDeleted = 0;
  for (const line of parsed.newLines) { if (line.type === "add") totalAdded++; }
  for (const line of parsed.oldLines) { if (line.type === "delete") totalDeleted++; }

  const handleSyncScroll = useCallback((source, target) => {
    if (syncing.current) return;
    syncing.current = true;
    if (target.current) target.current.scrollTop = source.current.scrollTop;
    requestAnimationFrame(() => { syncing.current = false; });
  }, []);

  return (
    <Dialog open onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        <Typography component="div" variant="body2" sx={{ fontFamily: "monospace", flex: 1, fontWeight: 600 }}>
          {fileName}
        </Typography>
        {!isImage && (
          <ToggleButtonGroup size="small" value={viewType} exclusive onChange={(e, v) => v && setViewType(v)} sx={{ mr: 1 }}>
            <ToggleButton value="unified" sx={{ fontSize: "0.65rem", py: 0.25 }}>Unified</ToggleButton>
            <ToggleButton value="split" sx={{ fontSize: "0.65rem", py: 0.25 }}>Split</ToggleButton>
          </ToggleButtonGroup>
        )}
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
      <DialogContent sx={{ overflow: "auto", maxHeight: "70vh", p: 0 }}>
        {isImage ? (
          <Box sx={{ display: "flex", height: "100%" }}>
            <Box sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", borderRight: "1px solid", borderColor: "divider", p: 2, minHeight: "50vh" }}>
              <Typography variant="caption" sx={{ color: "text.secondary", mb: 1, fontWeight: 600 }}>Old</Typography>
              {oldImage ? (
                <img src={`data:${mimeType(imageFilePath)};base64,${oldImage}`} alt="Old version" style={{ maxWidth: "100%", maxHeight: "55vh", objectFit: "contain", borderRadius: 4 }} />
              ) : (
                <Typography variant="body2" sx={{ color: "text.secondary", py: 4 }}>Not available</Typography>
              )}
            </Box>
            <Box sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", p: 2, minHeight: "50vh" }}>
              <Typography variant="caption" sx={{ color: "text.secondary", mb: 1, fontWeight: 600 }}>New</Typography>
              {newImage ? (
                <img src={`data:${mimeType(imageFilePath)};base64,${newImage}`} alt="New version" style={{ maxWidth: "100%", maxHeight: "55vh", objectFit: "contain", borderRadius: 4 }} />
              ) : (
                <Typography variant="body2" sx={{ color: "text.secondary", py: 4 }}>Not available</Typography>
              )}
            </Box>
          </Box>
        ) : (
          <>
            {!hasContent && (
              <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center", py: 3 }}>
                No changes
              </Typography>
            )}

            {viewType === "unified" && hasContent && (
              <Box sx={{ fontFamily: "monospace", fontSize: "13px" }}>
                {unifiedLines.map((line, i) => (
                  <UnifiedRow key={i} oldNum={line.oldNum} newNum={line.newNum} content={line.content} type={line.type} />
                ))}
              </Box>
            )}

            {viewType === "split" && hasContent && (
              <Box sx={{ display: "flex", fontFamily: "monospace", fontSize: "13px" }}>
                <Box ref={leftRef} sx={{ flex: 1, overflow: "auto", maxHeight: "65vh", borderRight: "1px solid", borderColor: "divider" }}
                  onScroll={() => handleSyncScroll(leftRef, rightRef)}
                >
                  {parsed.oldLines.map((line, i) => (
                    <LineRow key={i} num={line.num} content={line.content} type={line.type} isLeft />
                  ))}
                </Box>
                <Box ref={rightRef} sx={{ flex: 1, overflow: "auto", maxHeight: "65vh" }}
                  onScroll={() => handleSyncScroll(rightRef, leftRef)}
                >
                  {parsed.newLines.map((line, i) => (
                    <LineRow key={i} num={line.num} content={line.content} type={line.type} isLeft={false} />
                  ))}
                </Box>
              </Box>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
