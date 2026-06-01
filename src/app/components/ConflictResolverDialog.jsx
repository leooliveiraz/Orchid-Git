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
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [userEditedContent, setUserEditedContent] = useState(null);
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

  // Current block line number (for scrolling when navigating blocks)
  const currentBlockLine = useMemo(() => {
    if (blocks.length === 0 || blockLineRanges.length === 0) return null;
    return blockLineRanges[Math.min(blockIndex, blockLineRanges.length - 1)]?.startLine || null;
  }, [blocks, blockLineRanges, blockIndex]);

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
    const nextApplied = { ...applied, [idx]: replacement };
    setApplied(nextApplied);
    setUserEditedContent(null);
    // Rebuild merged content from fullContent by applying all accepted blocks in reverse order
    let result = fullContent;
    const indices = Object.keys(nextApplied).map(Number).sort((a, b) => b - a);
    for (const i of indices) {
      const b = blocks[i];
      if (!b) continue;
      const r = nextApplied[i];
      result = result.slice(0, b.start) + r + result.slice(b.end);
    }
    setMergedContent(result);
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
    if (blocks.length > 0 && Object.keys(applied).length < blocks.length) {
      setError("Resolve all conflict blocks before advancing.");
      return;
    }
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

  const handleCancel = () => {
    setMergedContent(fullContent);
    setApplied({});
    setUserEditedContent(null);
    setBlockIndex(0);
    setConfirmCancel(false);
    setError(null);
  };

  // Build merged highlight ranges (show which blocks are resolved in merged view)
  const mergedHighlights = useMemo(() => {
    const ranges = [];
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      const before = (fullContent || "").slice(0, b.start);
      const startLine = (before.match(/\n/g) || []).length + 1;
      if (applied[i]) {
        const replacement = applied[i];
        if (replacement === b.ours + "\n" + b.theirs) {
          const ourEnd = startLine + (b.ours.match(/\n/g) || []).length;
          ranges.push({ startLine, endLine: ourEnd, color: "rgba(33,150,243,0.25)" });
          const theirStart = ourEnd + 1;
          const theirEnd = theirStart + (b.theirs.match(/\n/g) || []).length;
          ranges.push({ startLine: theirStart, endLine: theirEnd, color: "rgba(76,175,80,0.25)" });
        } else if (replacement === b.ours) {
          const endLine = startLine + (replacement.match(/\n/g) || []).length;
          ranges.push({ startLine, endLine, color: "rgba(33,150,243,0.25)" });
        } else if (replacement === b.theirs) {
          const endLine = startLine + (replacement.match(/\n/g) || []).length;
          ranges.push({ startLine, endLine, color: "rgba(76,175,80,0.25)" });
        } else {
          const endLine = startLine + (replacement.match(/\n/g) || []).length;
          ranges.push({ startLine, endLine });
        }
      } else {
        const contentStart = startLine + 1;
        const ourLines = (b.ours.match(/\n/g) || []).length;
        const theirLines = (b.theirs.match(/\n/g) || []).length;
        ranges.push({ startLine: contentStart, endLine: contentStart + ourLines, color: "rgba(33,150,243,0.25)" });
        ranges.push({ startLine: contentStart + ourLines + 2, endLine: contentStart + ourLines + theirLines + 2, color: "rgba(76,175,80,0.25)" });
      }
    }
    return ranges;
  }, [blocks, fullContent, applied]);

  const findBlockByLine = (lineNum) => {
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      const before = (fullContent || "").slice(0, b.start);
      const markerLine = (before.match(/\n/g) || []).length + 1;
      const ourLines = (b.ours.match(/\n/g) || []).length;
      const theirLines = (b.theirs.match(/\n/g) || []).length;
      if (applied[i]) {
        const end = markerLine + (applied[i].match(/\n/g) || []).length;
        if (lineNum >= markerLine && lineNum <= end) return { blockIdx: i, section: applied[i] === b.ours ? "ours" : applied[i] === b.theirs ? "theirs" : null };
      } else {
        const ourStart = markerLine + 1;
        const ourEnd = ourStart + ourLines;
        if (lineNum >= ourStart && lineNum <= ourEnd) return { blockIdx: i, section: "ours" };
        const theirStart = ourEnd + 2;
        const theirEnd = theirStart + theirLines;
        if (lineNum >= theirStart && lineNum <= theirEnd) return { blockIdx: i, section: "theirs" };
      }
    }
    return null;
  };

  const handleOurDblClick = useCallback((lineNum) => {
    const found = findBlockByLine(lineNum);
    if (found && !applied[found.blockIdx]) {
      applyBlock(found.blockIdx, blocks[found.blockIdx].ours);
    }
  }, [blocks, fullContent, applied]);

  const handleTheirDblClick = useCallback((lineNum) => {
    const found = findBlockByLine(lineNum);
    if (found && !applied[found.blockIdx]) {
      applyBlock(found.blockIdx, blocks[found.blockIdx].theirs);
    }
  }, [blocks, fullContent, applied]);

  const handleMergedDblClick = useCallback((lineNum) => {
    const found = findBlockByLine(lineNum);
    if (found && !applied[found.blockIdx]) {
      if (found.section === "ours") applyBlock(found.blockIdx, blocks[found.blockIdx].ours);
      else if (found.section === "theirs") applyBlock(found.blockIdx, blocks[found.blockIdx].theirs);
    }
  }, [blocks, fullContent, applied]);

  const mergedButton = useCallback((i, b) => (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, px: 1, minHeight: "1.5em", justifyContent: "flex-end" }}>
      <Button size="small" variant="contained" color="error"
        onClick={() => applyBlock(i, b.ours)}
        sx={{ fontSize: "0.6rem", height: 20, py: 0, textTransform: "none", whiteSpace: "nowrap" }}
      >Ours</Button>
      <Button size="small" variant="contained" color="success"
        onClick={() => applyBlock(i, b.theirs)}
        sx={{ fontSize: "0.6rem", height: 20, py: 0, textTransform: "none", whiteSpace: "nowrap" }}
      >Theirs</Button>
      <Button size="small" variant="contained" color="warning"
        onClick={() => applyBlock(i, b.ours + "\n" + b.theirs)}
        sx={{ fontSize: "0.6rem", height: 20, py: 0, textTransform: "none", whiteSpace: "nowrap" }}
      >Both</Button>
    </Box>
  ), [applyBlock]);

  const mergedActionLines = useMemo(() => {
    const actions = {};
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      if (applied[i]) continue;
      const before = (fullContent || "").slice(0, b.start);
      const markerLine = (before.match(/\n/g) || []).length + 1;
      actions[markerLine] = mergedButton(i, b);
    }
    return actions;
  }, [blocks, fullContent, applied, mergedButton]);

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
                <Box sx={{ display: "flex", alignItems: "center", px: 1, py: 0.25, bgcolor: "rgba(244,67,54,0.08)", flexShrink: 0 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: "error.main", flex: 1 }}>OUR</Typography>
                  {currentBlock && !applied[blockIndex] && (
                    <Button size="small" variant="contained" color="error"
                      onClick={acceptOurs} sx={{ fontSize: "0.6rem", minWidth: 40, height: 20, py: 0 }}>
                      Accept
                    </Button>
                  )}
                </Box>
                <Box sx={{ flex: 1, minHeight: 0 }}>
                  <CodeEditor value={ourContent} filename={`our-${currentFile}`} readOnly height="100%" highlightRanges={ourHighlights} highlightColor="rgba(33,150,243,0.25)" onDoubleClick={handleOurDblClick} onScroll={(st) => handleScroll(0, st)} scrollContainerRef={ourScrollRef} scrollToLine={currentBlockLine} />
                </Box>
              </Box>

              {/* MERGED */}
              <Box sx={{ flex: 1, display: "flex", flexDirection: "column", border: "2px solid", borderColor: "primary.main", borderRadius: 1, overflow: "hidden" }}>
                <Box sx={{ display: "flex", alignItems: "center", px: 1, py: 0.25, bgcolor: "primary.main", flexShrink: 0 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: "#fff", flex: 1 }}>MERGED (editável)</Typography>
                  {currentBlock && !applied[blockIndex] && (
                    <Button size="small" variant="contained" color="warning"
                      onClick={acceptBoth} sx={{ fontSize: "0.6rem", minWidth: 40, height: 20, py: 0 }}>
                      Both
                    </Button>
                  )}
                </Box>
                <Box sx={{ flex: 1, minHeight: 0 }}>
              <CodeEditor value={mergedContent} filename={`merged-${currentFile}`} readOnly={false} height="100%" highlightRanges={mergedHighlights} onDoubleClick={handleMergedDblClick} actionLines={mergedActionLines} onChange={(v) => { setMergedContent(v); setUserEditedContent(v); }} onScroll={(st) => handleScroll(1, st)} scrollContainerRef={mergedScrollRef} scrollToLine={currentBlockLine} />
            </Box>
              </Box>

              {/* THEIR */}
              <Box sx={{ flex: 1, display: "flex", flexDirection: "column", border: "1px solid", borderColor: "divider", borderRadius: 1, overflow: "hidden" }}>
                <Box sx={{ display: "flex", alignItems: "center", px: 1, py: 0.25, bgcolor: "rgba(76,175,80,0.08)", flexShrink: 0 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: "success.main", flex: 1 }}>THEIR</Typography>
                  {currentBlock && !applied[blockIndex] && (
                    <Button size="small" variant="contained" color="success"
                      onClick={acceptTheirs} sx={{ fontSize: "0.6rem", minWidth: 40, height: 20, py: 0 }}>
                      Accept
                    </Button>
                  )}
                </Box>
                <Box sx={{ flex: 1, minHeight: 0 }}>
                  <CodeEditor value={theirContent} filename={`their-${currentFile}`} readOnly height="100%" highlightRanges={theirHighlights} highlightColor="rgba(76,175,80,0.25)" onDoubleClick={handleTheirDblClick} onScroll={(st) => handleScroll(2, st)} scrollContainerRef={theirScrollRef} scrollToLine={currentBlockLine} />
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
    </Dialog>
  );
}
