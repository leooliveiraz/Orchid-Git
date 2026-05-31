import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Typography, Box, Button, IconButton, MenuItem, TextField, Chip, Alert,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CodeEditor from "./CodeEditor.jsx";

export default function ConflictResolverDialog({ directory, conflictedFiles, onClose, onRefresh }) {
  const [fileIndex, setFileIndex] = useState(0);
  const [blocks, setBlocks] = useState([]);
  const [fullContent, setFullContent] = useState("");
  const [mergedContent, setMergedContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [blockIndex, setBlockIndex] = useState(0);
  const [applied, setApplied] = useState({});
  const [saving, setSaving] = useState(false);
  const scrollTargets = useRef([null, null, null]);
  const syncingScroll = useRef(false);

  const handleScroll = useCallback((sourceIndex, scrollTop) => {
    if (syncingScroll.current) return;
    syncingScroll.current = true;
    scrollTargets.current.forEach((el, i) => {
      if (el && i !== sourceIndex) el.scrollTop = scrollTop;
    });
    syncingScroll.current = false;
  }, []);

  const ourScrollRef = useCallback((el) => { scrollTargets.current[0] = el; }, []);
  const mergedScrollRef = useCallback((el) => { scrollTargets.current[1] = el; }, []);
  const theirScrollRef = useCallback((el) => { scrollTargets.current[2] = el; }, []);

  const currentFile = conflictedFiles?.[fileIndex];

  const fetchBlocks = useCallback(async () => {
    if (!directory || !window.api || !currentFile) return;
    setLoading(true);
    setError(null);
    setBlockIndex(0);
    setApplied({});
    try {
      const data = await window.api.getConflictBlocks(directory, currentFile);
      setBlocks(data.blocks || []);
      setFullContent(data.fullContent || "");
      const merged = data.fullContent || "";
      setMergedContent(merged);
    } catch (e) {
      setError(e.message || String(e));
    }
    setLoading(false);
  }, [directory, currentFile]);

  useEffect(() => { fetchBlocks(); }, [fetchBlocks]);

  // Build OUR and THEIR content from blocks + fullContent
  const ourContent = useMemo(() => {
    if (!blocks.length || !fullContent) return fullContent;
    let result = fullContent;
    for (let i = blocks.length - 1; i >= 0; i--) {
      const b = blocks[i];
      result = result.slice(0, b.start) + b.ours + result.slice(b.end);
    }
    return result;
  }, [blocks, fullContent]);

  const theirContent = useMemo(() => {
    if (!blocks.length || !fullContent) return fullContent;
    let result = fullContent;
    for (let i = blocks.length - 1; i >= 0; i--) {
      const b = blocks[i];
      result = result.slice(0, b.start) + b.theirs + result.slice(b.end);
    }
    return result;
  }, [blocks, fullContent]);

  // Compute line ranges for highlights in OUR/THEIR
  const blockLineRanges = useMemo(() => {
    const ranges = [];
    for (const b of blocks) {
      const beforeOurs = (fullContent || "").slice(0, b.start);
      const startLine = (beforeOurs.match(/\n/g) || []).length + 1;
      const content = b.ours;
      const endLine = startLine + (content.match(/\n/g) || []).length;
      ranges.push({ startLine, endLine, ours: b.ours, theirs: b.theirs });
    }
    return ranges;
  }, [blocks, fullContent]);

  // Highlight ranges for OUR editor
  const ourHighlights = useMemo(() => blockLineRanges.map(r => ({ startLine: r.startLine, endLine: r.endLine })), [blockLineRanges]);

  // For THEIR editor, same ranges since content has same structure length
  const theirHighlights = useMemo(() => {
    const ranges = [];
    for (const b of blocks) {
      const before = (fullContent || "").slice(0, b.start);
      const startLine = (before.match(/\n/g) || []).length + 1;
      const content = b.theirs;
      const endLine = startLine + (content.match(/\n/g) || []).length;
      ranges.push({ startLine, endLine });
    }
    return ranges;
  }, [blocks, fullContent]);

  const currentBlock = blocks[blockIndex] || null;

  const acceptOurs = () => {
    if (!currentBlock) return;
    const blockRanges = blockLineRanges;
    const range = blockRanges[blockIndex];
    if (!range) return;
    applyBlock(blockIndex, range.ours);
  };

  const acceptTheirs = () => {
    if (!currentBlock) return;
    applyBlock(blockIndex, currentBlock.theirs);
  };

  const acceptBoth = () => {
    if (!currentBlock) return;
    applyBlock(blockIndex, currentBlock.ours + "\n" + currentBlock.theirs);
  };

  const applyBlock = (idx, replacement) => {
    setMergedContent(prev => {
      const b = blocks[idx];
      if (!b) return prev;
      return prev.slice(0, b.start) + replacement + prev.slice(b.end);
    });
    setApplied(prev => ({ ...prev, [idx]: true }));
  };

  const handlePrevBlock = () => setBlockIndex(i => Math.max(0, i - 1));
  const handleNextBlock = () => setBlockIndex(i => Math.min(blocks.length - 1, i + 1));

  // Change current block to match cursor/selection
  const handleMergedScroll = (lineNum) => {
    if (!blocks.length) return;
    // Find which block contains this line
    const lines = mergedContent.split("\n");
    let charCount = 0;
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      const blockStartLine = (mergedContent.slice(0, b.start).match(/\n/g) || []).length + 1;
      const blockEndLine = blockStartLine + ((b.ours.match(/\n/g) || []).length);
      if (lineNum >= blockStartLine && lineNum <= blockEndLine) {
        setBlockIndex(i);
        return;
      }
    }
  };

  const handleSave = async () => {
    if (!window.api || !currentFile) return;
    setSaving(true);
    setError(null);
    try {
      await window.api.saveFileContent(directory, currentFile, mergedContent);
      await window.api.resolveFile(directory, currentFile);
      // Move to next file or close
      if (fileIndex < conflictedFiles.length - 1) {
        setFileIndex(i => i + 1);
      } else {
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

  // Build merged highlight ranges (show which blocks are resolved in merged view)
  const mergedHighlights = useMemo(() => {
    const ranges = [];
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      const before = (fullContent || "").slice(0, b.start);
      const startLine = (before.match(/\n/g) || []).length + 1;
      const content = applied[i] ? "" : b.ours;
      const endLine = startLine + (content.match(/\n/g) || []).length;
      if (!applied[i]) {
        ranges.push({ startLine, endLine });
      }
    }
    return ranges;
  }, [blocks, fullContent, applied]);

  return (
    <Dialog open onClose={onClose} maxWidth="xl" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        <Typography component="div" variant="body2" sx={{ fontFamily: "monospace", fontWeight: 600, flex: 1 }}>
          Resolve conflicts
        </Typography>
        <IconButton size="small" onClick={onClose} aria-label="close">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 1, overflow: "hidden", display: "flex", flexDirection: "column", gap: 1 }}>
        {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

        {loading && <Typography sx={{ textAlign: "center", py: 4 }}>Loading...</Typography>}

        {!loading && currentFile && (
          <>
            {/* File selector + block navigation */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
              <TextField select size="small" value={fileIndex} onChange={e => setFileIndex(Number(e.target.value))}
                sx={{ minWidth: 250 }}
              >
                {conflictedFiles.map((f, i) => (
                  <MenuItem key={f} value={i}>{f} {i === fileIndex ? "(active)" : ""}</MenuItem>
                ))}
              </TextField>
              <Chip label={`Block ${blocks.length > 0 ? blockIndex + 1 : 0}/${blocks.length}`} size="small" />
              <Button size="small" onClick={handlePrevBlock} disabled={blockIndex <= 0 || blocks.length === 0}>Prev</Button>
              <Button size="small" onClick={handleNextBlock} disabled={blockIndex >= blocks.length - 1 || blocks.length === 0}>Next</Button>
              <Box sx={{ flex: 1 }} />
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {blocks.length > 0 ? `Block ${blockIndex + 1} — lines ${blockLineRanges[blockIndex]?.startLine || "?"}-${blockLineRanges[blockIndex]?.endLine || "?"}` : "No blocks"}
              </Typography>
            </Box>

            {/* Three CodeEditors */}
            <Box sx={{ display: "flex", gap: 0.5, flex: 1, minHeight: 0, overflow: "hidden" }}>
              {/* OUR */}
              <Box sx={{ flex: 1, display: "flex", flexDirection: "column", border: "1px solid", borderColor: "divider", borderRadius: 1, overflow: "hidden" }}>
                <Typography variant="caption" sx={{ px: 1, py: 0.25, bgcolor: "rgba(244,67,54,0.08)", fontWeight: 600, color: "error.main", flexShrink: 0 }}>
                  OUR
                </Typography>
                <Box sx={{ flex: 1, minHeight: 0 }}>
                  <CodeEditor value={ourContent} filename={currentFile} readOnly height="100%" highlightRanges={ourHighlights} onScroll={(st) => handleScroll(0, st)} scrollContainerRef={ourScrollRef} />
                </Box>
              </Box>

              {/* MERGED */}
              <Box sx={{ flex: 1, display: "flex", flexDirection: "column", border: "2px solid", borderColor: "primary.main", borderRadius: 1, overflow: "hidden" }}>
                <Typography variant="caption" sx={{ px: 1, py: 0.25, bgcolor: "primary.main", fontWeight: 600, color: "#fff", flexShrink: 0 }}>
                  MERGED (editável)
                </Typography>
                <Box sx={{ flex: 1, minHeight: 0 }}>
                  <CodeEditor value={mergedContent} filename={currentFile} readOnly={false} height="100%" highlightRanges={mergedHighlights} onChange={setMergedContent} onScroll={(st) => handleScroll(1, st)} scrollContainerRef={mergedScrollRef} />
                </Box>
              </Box>

              {/* THEIR */}
              <Box sx={{ flex: 1, display: "flex", flexDirection: "column", border: "1px solid", borderColor: "divider", borderRadius: 1, overflow: "hidden" }}>
                <Typography variant="caption" sx={{ px: 1, py: 0.25, bgcolor: "rgba(76,175,80,0.08)", fontWeight: 600, color: "success.main", flexShrink: 0 }}>
                  THEIR
                </Typography>
                <Box sx={{ flex: 1, minHeight: 0 }}>
                  <CodeEditor value={theirContent} filename={currentFile} readOnly height="100%" highlightRanges={theirHighlights} onScroll={(st) => handleScroll(2, st)} scrollContainerRef={theirScrollRef} />
                </Box>
              </Box>
            </Box>

            {/* Block action buttons */}
            {currentBlock && (
              <Box sx={{ display: "flex", gap: 1, justifyContent: "center", flexWrap: "wrap" }}>
                <Button size="small" variant="contained" color="error" onClick={acceptOurs} disabled={applied[blockIndex]}>
                  Accept Ours
                </Button>
                <Button size="small" variant="contained" color="success" onClick={acceptTheirs} disabled={applied[blockIndex]}>
                  Accept Theirs
                </Button>
                <Button size="small" variant="contained" color="warning" onClick={acceptBoth} disabled={applied[blockIndex]}>
                  Accept Both
                </Button>
              </Box>
            )}
          </>
        )}

        {!loading && !currentFile && (
          <Typography sx={{ textAlign: "center", py: 4, color: "text.secondary" }}>
            No conflicted files
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleSkip}>Skip</Button>
        <Button variant="contained" onClick={handleSave} disabled={!currentFile || saving}>
          {saving ? "Saving..." : "Resolve & advance"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
