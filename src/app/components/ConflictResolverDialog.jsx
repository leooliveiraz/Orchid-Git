import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Typography, Box, Button, IconButton, MenuItem, TextField, Chip, Alert, Divider, Snackbar,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

export default function ConflictResolverDialog({ directory, conflictedFiles, onClose, onRefresh }) {
  const [fileIndex, setFileIndex] = useState(0);
  const [segments, setSegments] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [blockIndex, setBlockIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const cardRefs = useRef({});

  const currentFile = conflictedFiles?.[fileIndex];

  const conflictIndices = useMemo(() => {
    const indices = [];
    segments.forEach((s, i) => { if (s.type === "conflict") indices.push(i); });
    return indices;
  }, [segments]);

  const segmentsWithLines = useMemo(() => {
    let line = 1;
    return segments.map(seg => {
      const startLine = line;
      if (seg.type === "normal") {
        const lines = seg.content.split("\n");
        const count = seg.content ? (seg.content.endsWith("\n") ? lines.length - 1 : lines.length) : 0;
        line += count;
        return { ...seg, startLine, lineCount: count };
      }
      const ourLines = seg.ours ? (seg.ours.match(/\n/g) || []).length + 1 : 1;
      const theirLines = seg.theirs ? (seg.theirs.match(/\n/g) || []).length + 1 : 1;
      const count = ourLines + theirLines;
      line += count;
      return { ...seg, startLine, lineCount: count };
    });
  }, [segments]);

  const parseIntoSegments = useCallback((fullContent, parsedBlocks) => {
    const segs = [];
    let lastEnd = 0;
    for (const b of parsedBlocks) {
      if (b.start > lastEnd) {
        segs.push({ type: "normal", content: fullContent.slice(lastEnd, b.start) });
      }
      segs.push({
        type: "conflict",
        id: b.index,
        ours: b.ours,
        theirs: b.theirs,
        start: b.start,
        end: b.end,
      });
      lastEnd = b.end;
    }
    if (lastEnd < fullContent.length) {
      segs.push({ type: "normal", content: fullContent.slice(lastEnd) });
    }
    return segs;
  }, []);

  const fetchBlocks = useCallback(async () => {
    if (!directory || !window.api || !currentFile) return;
    setLoading(true);
    setError(null);
    setBlockIndex(0);
    try {
      const data = await window.api.getConflictBlocks(directory, currentFile);
      const parsedBlocks = data.blocks || [];
      setBlocks(parsedBlocks);
      if (parsedBlocks.length === 0) {
        setSegments([{ type: "normal", content: data.fullContent || "" }]);
      } else {
        setSegments(parseIntoSegments(data.fullContent || "", parsedBlocks));
      }
    } catch (e) {
      setError(e.message || String(e));
    }
    setLoading(false);
  }, [directory, currentFile, parseIntoSegments]);

  useEffect(() => { fetchBlocks(); }, [fetchBlocks]);

  useEffect(() => {
    if (conflictIndices.length === 0) {
      setBlockIndex(0);
    } else if (blockIndex >= conflictIndices.length) {
      setBlockIndex(conflictIndices.length - 1);
    }
  }, [conflictIndices.length, blockIndex]);

  const buildMergedContent = useCallback(() => {
    return segments.map(s => {
      if (s.type === "normal") return s.content;
      return `<<<<<<< HEAD\n${s.ours}\n=======\n${s.theirs}\n>>>>>>> branch\n`;
    }).join("");
  }, [segments]);

  const resolveBlock = useCallback((segmentIdx, choice) => {
    setSegments(prev => {
      const seg = prev[segmentIdx];
      if (!seg || seg.type !== "conflict") return prev;
      let content = "";
      if (choice === "ours") content = seg.ours;
      else if (choice === "theirs") content = seg.theirs;
      else if (choice === "both") content = seg.ours + "\n" + seg.theirs;
      const next = [...prev];
      next[segmentIdx] = { type: "normal", content: content + "\n", _conflict: { ours: seg.ours, theirs: seg.theirs } };
      return next;
    });
  }, []);

  const handleNormalEdit = useCallback((idx, newContent) => {
    setSegments(prev => {
      const seg = prev[idx];
      if (!seg || seg.type !== "normal") return prev;
      const next = [...prev];
      next[idx] = { ...seg, content: newContent };
      return next;
    });
  }, []);

  const handleOursEdit = useCallback((idx, text) => {
    setSegments(prev => {
      const seg = prev[idx];
      if (!seg || seg.type !== "conflict") return prev;
      const next = [...prev];
      next[idx] = { ...seg, ours: text };
      return next;
    });
  }, []);

  const handleTheirsEdit = useCallback((idx, text) => {
    setSegments(prev => {
      const seg = prev[idx];
      if (!seg || seg.type !== "conflict") return prev;
      const next = [...prev];
      next[idx] = { ...seg, theirs: text };
      return next;
    });
  }, []);

  const undoBlock = useCallback((idx) => {
    setSegments(prev => {
      const seg = prev[idx];
      if (!seg || seg.type !== "normal" || !seg._conflict) return prev;
      const next = [...prev];
      next[idx] = {
        type: "conflict",
        id: Date.now(),
        ours: seg._conflict.ours,
        theirs: seg._conflict.theirs,
      };
      return next;
    });
  }, []);

  useEffect(() => {
    if (conflictIndices.length === 0) return;
    const targetIdx = conflictIndices[Math.min(blockIndex, conflictIndices.length - 1)];
    const seg = segments[targetIdx];
    if (seg?.type === "conflict" && cardRefs.current[seg.id]) {
      cardRefs.current[seg.id].scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [blockIndex, conflictIndices, segments]);

  const handlePrevBlock = () => setBlockIndex(i => Math.max(0, i - 1));
  const handleNextBlock = () => setBlockIndex(i => Math.min(conflictIndices.length - 1, i + 1));

  const handleSave = async () => {
    if (!window.api || !currentFile) return;

    if (segments.some(s => s.type === "conflict")) {
      setError("Resolve all conflict blocks before saving.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const mergedContent = buildMergedContent();
      await window.api.saveFileContent(directory, currentFile, mergedContent);
      await window.api.resolveFile(directory, currentFile);
      if (fileIndex < conflictedFiles.length - 1) {
        setFileIndex(i => i + 1);
      } else {
        try {
          await window.api.continueMerge(directory);
        } catch (e) {
          setError("All conflicts resolved, but merge could not be finalized: " + (e.message || e));
          return;
        }
        onRefresh?.();
        onClose();
      }
    } catch (e) {
      setError(e.message || String(e));
    }
    setSaving(false);
  };

  const handleSkip = () => {
    if (fileIndex < conflictedFiles.length - 1) {
      setFileIndex(i => i + 1);
    } else {
      onClose();
    }
  };

  const handleCancel = () => {
    setSegments([]);
    setBlocks([]);
    setConfirmCancel(false);
    setError(null);
    fetchBlocks();
  };

  const renderNormalSegment = (seg, idx) => {
    const displayLines = seg.content ? (seg.content.endsWith("\n") ? seg.content.slice(0, -1) : seg.content).split("\n") : [];
    return (
      <Box key={idx} sx={{ display: "flex", px: 1.5, py: 0, gap: 0.5 }}>
        {seg._conflict && (
          <Button size="small" variant="outlined" color="info"
            onClick={() => undoBlock(idx)}
            sx={{ flexShrink: 0, minWidth: 28, fontSize: "0.65rem", py: 0, mt: 0.5 }}
            title="Undo resolution"
          >
            ↩
          </Button>
        )}
        <Box sx={{ textAlign: "right", userSelect: "none", color: "text.secondary", fontFamily: "monospace", fontSize: "13px", lineHeight: 1.5, py: 0.5, minWidth: seg.lineCount >= 100 ? 44 : seg.lineCount >= 10 ? 36 : 28 }}>
          {displayLines.map((_, i) => (
            <div key={i} style={{ paddingRight: 8 }}>{seg.startLine + i}</div>
          ))}
        </Box>
        <div
          contentEditable
          suppressContentEditableWarning
          style={{
            flex: 1,
            fontFamily: "monospace",
            fontSize: "13px",
            lineHeight: 1.5,
            whiteSpace: "pre",
            outline: "none",
            minHeight: "1.5em",
          }}
          onInput={e => handleNormalEdit(idx, e.currentTarget.textContent || "")}
        >
          {seg.content}
        </div>
      </Box>
    );
  };

  const activeBlockId = useMemo(() => {
    if (conflictIndices.length === 0) return null;
    const targetIdx = conflictIndices[Math.min(blockIndex, conflictIndices.length - 1)];
    const seg = segments[targetIdx];
    return seg?.type === "conflict" ? seg.id : null;
  }, [blockIndex, conflictIndices, segments]);

  const renderConflictCard = (seg, idx) => (
    <Box
      key={idx}
      ref={el => cardRefs.current[seg.id] = el}
      sx={{
        border: activeBlockId === seg.id ? "2px solid" : "1px solid",
        borderColor: activeBlockId === seg.id ? "primary.main" : "divider",
        borderRadius: 1,
        mx: 1,
        my: 1,
        overflow: "hidden",
        bgcolor: "background.paper",
      }}
    >
      <Box sx={{ display: "flex", gap: 0.5, p: 0.5, bgcolor: "action.hover", borderBottom: "1px solid", borderColor: "divider", alignItems: "center" }}>
        <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, mr: 1, fontFamily: "monospace", px: 1 }}>
          Lines {seg.startLine}–{seg.startLine + seg.lineCount - 1}
        </Typography>
        <Button size="small" variant="contained" color="error" onClick={() => resolveBlock(idx, "ours")}>
          Ours
        </Button>
        <Button size="small" variant="contained" color="success" onClick={() => resolveBlock(idx, "theirs")}>
          Theirs
        </Button>
        <Button size="small" variant="contained" color="warning" onClick={() => resolveBlock(idx, "both")}>
          Both
        </Button>
      </Box>
      <Box sx={{ bgcolor: "rgba(33,150,243,0.08)", px: 1.5, py: 0.5 }}>
        <Typography variant="caption" sx={{ color: "primary.main", fontWeight: 600, display: "block", mb: 0.25 }}>
          OURS
        </Typography>
        <div
          contentEditable
          suppressContentEditableWarning
          style={{
            fontFamily: "monospace",
            fontSize: "13px",
            lineHeight: 1.5,
            whiteSpace: "pre",
            outline: "none",
            minHeight: "1.5em",
          }}
          onInput={e => handleOursEdit(idx, e.currentTarget.textContent || "")}
        >
          {seg.ours}
        </div>
      </Box>
      <Divider />
      <Box sx={{ bgcolor: "rgba(76,175,80,0.08)", px: 1.5, py: 0.5 }}>
        <Typography variant="caption" sx={{ color: "success.main", fontWeight: 600, display: "block", mb: 0.25 }}>
          THEIRS
        </Typography>
        <div
          contentEditable
          suppressContentEditableWarning
          style={{
            fontFamily: "monospace",
            fontSize: "13px",
            lineHeight: 1.5,
            whiteSpace: "pre",
            outline: "none",
            minHeight: "1.5em",
          }}
          onInput={e => handleTheirsEdit(idx, e.currentTarget.textContent || "")}
        >
          {seg.theirs}
        </div>
      </Box>
    </Box>
  );

  return (
    <Dialog open onClose={onClose} maxWidth="xl" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        <TextField select size="small" value={fileIndex}
          onChange={e => setFileIndex(Number(e.target.value))}
          sx={{ minWidth: 250 }}
        >
          {conflictedFiles.map((f, i) => (
            <MenuItem key={f} value={i}>{f}</MenuItem>
          ))}
        </TextField>
        <Chip label={`Block ${conflictIndices.length > 0 ? blockIndex + 1 : 0}/${conflictIndices.length}`} size="small" />
        <Button size="small" onClick={handlePrevBlock} disabled={blockIndex <= 0 || conflictIndices.length === 0}>Prev</Button>
        <Button size="small" onClick={handleNextBlock} disabled={blockIndex >= conflictIndices.length - 1 || conflictIndices.length === 0}>Next</Button>
        <Box sx={{ flex: 1 }} />
        <IconButton size="small" onClick={onClose} aria-label="close">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 1, overflow: "auto" }}>
        {loading && <Typography sx={{ textAlign: "center", py: 4 }}>Loading...</Typography>}
        {!loading && !currentFile && (
          <Typography sx={{ textAlign: "center", py: 4, color: "text.secondary" }}>
            No conflicted files
          </Typography>
        )}
        {!loading && currentFile && segmentsWithLines.map((seg, idx) =>
          seg.type === "normal" ? renderNormalSegment(seg, idx) : renderConflictCard(seg, idx)
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleSkip}>Skip</Button>
        <Button color="error" onClick={() => setConfirmCancel(true)}>Cancel changes</Button>
        <Button variant="contained" onClick={handleSave} disabled={!currentFile || saving}>
          {saving ? "Saving..." : "Resolve & advance"}
        </Button>
      </DialogActions>
      {confirmCancel && (
        <Box sx={{ position: "fixed", inset: 0, bgcolor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1400 }}>
          <Box sx={{ bgcolor: "background.paper", borderRadius: 3, width: 360, maxWidth: "90vw", boxShadow: 24, p: 3 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>Cancel changes?</Typography>
            <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
              This will undo all block resolutions for the current file and reset to the original conflict state.
            </Typography>
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
              <Button onClick={() => setConfirmCancel(false)}>Keep editing</Button>
              <Button color="error" variant="contained" onClick={handleCancel}>Cancel changes</Button>
            </Box>
          </Box>
        </Box>
      )}

      <Snackbar open={!!error} autoHideDuration={5000} onClose={() => setError(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity="error" onClose={() => setError(null)} sx={{ width: "100%" }}>
          {error}
        </Alert>
      </Snackbar>
    </Dialog>
  );
}
