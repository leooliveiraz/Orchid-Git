import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Typography, Box, Button, IconButton, MenuItem, TextField, Chip, Alert, Divider, Snackbar, ToggleButton, ToggleButtonGroup,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

function EditableText({ text, onInput, style }) {
  const ref = useCallback((el) => {
    if (el && document.activeElement !== el && el.textContent !== text) el.textContent = text;
  }, [text]);

  return (
    <div
      ref={ref}
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
        ...style,
      }}
      onInput={e => onInput(e.currentTarget.textContent || "")}
      onKeyDown={e => {
        if (e.key === "Enter") {
          e.preventDefault();
          document.execCommand("insertLineBreak");
          onInput(e.currentTarget.textContent || "");
        }
      }}
      onPaste={e => {
        e.preventDefault();
        const text = e.clipboardData.getData("text/plain");
        if (text) {
          document.execCommand("insertText", false, text.replace(/\r\n/g, "\n"));
        }
        onInput(e.currentTarget.textContent || "");
      }}
    />
  );
}

export default function ConflictResolverDialog({ directory, conflictedFiles, onClose, onRefresh, onCommit }) {
  const [fileIndex, setFileIndex] = useState(0);
  const [segments, setSegments] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [blockIndex, setBlockIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmAbort, setConfirmAbort] = useState(false);
  const [viewMode, setViewMode] = useState("unified");
  const [activeConflictId, setActiveConflictId] = useState(null);
  const [oursBranch, setOursBranch] = useState("");
  const [theirsBranch, setTheirsBranch] = useState("");
  const cardRefs = useRef({});
  const paneRefs = useRef([null, null, null]);
  const syncingScroll = useRef(false);

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

  const ourSegments = useMemo(() => {
    let line = 1;
    return segments.map(seg => {
      const startLine = line;
      if (seg.type === "normal") {
        const count = seg.content ? (seg.content.endsWith("\n") ? seg.content.split("\n").length - 1 : seg.content.split("\n").length) : 0;
        line += count;
        return { ...seg, startLine, lineCount: count };
      }
      const content = seg.ours || "";
      const count = (content.match(/\n/g) || []).length + 1;
      line += count;
      return { ...seg, startLine, lineCount: count, _displayContent: content };
    });
  }, [segments]);

  const theirSegments = useMemo(() => {
    let line = 1;
    return segments.map(seg => {
      const startLine = line;
      if (seg.type === "normal") {
        const count = seg.content ? (seg.content.endsWith("\n") ? seg.content.split("\n").length - 1 : seg.content.split("\n").length) : 0;
        line += count;
        return { ...seg, startLine, lineCount: count };
      }
      const content = seg.theirs || "";
      const count = (content.match(/\n/g) || []).length + 1;
      line += count;
      return { ...seg, startLine, lineCount: count, _displayContent: content };
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

  useEffect(() => {
    if (!directory || !window.api) return;
    (async () => {
      try {
        const current = await window.api.getCurrentBranch(directory);
        setOursBranch(current || "");
      } catch {}
      try {
        const msg = await window.api.getMergeMessage(directory);
        if (msg) {
          const m = msg.match(/Merge (?:remote-tracking )?branch\s+['"]([^'"]+)['"]/);
          if (m) setTheirsBranch(m[1]);
        }
      } catch {}
    })();
  }, [directory]);

  const buildMergedContent = useCallback(() => {
    return segments.map(s => {
      if (s.type === "normal") return s.content;
      return `<<<<<<< HEAD\n${s.ours}\n=======\n${s.theirs}\n>>>>>>> branch\n`;
    }).join("");
  }, [segments]);

  const { ourContent, ourHighlights, theirContent, theirHighlights } = useMemo(() => {
    let our = "", their = "";
    const ourHl = [], theirHl = [];
    let ourLine = 1, theirLine = 1;
    for (const seg of segments) {
      if (seg.type === "normal") {
        our += seg.content;
        their += seg.content;
        const count = seg.content ? (seg.content.endsWith("\n") ? seg.content.split("\n").length - 1 : seg.content.split("\n").length) : 0;
        if (seg._choice === "ours" || seg._choice === "both") {
          ourHl.push({ startLine: ourLine, endLine: ourLine + count - 1 });
        }
        if (seg._choice === "theirs" || seg._choice === "both") {
          theirHl.push({ startLine: theirLine, endLine: theirLine + count - 1 });
        }
        ourLine += count;
        theirLine += count;
      } else {
        const oLines = seg.ours ? seg.ours.split("\n").length : 1;
        const tLines = seg.theirs ? seg.theirs.split("\n").length : 1;
        our += seg.ours + "\n";
        their += seg.theirs + "\n";
        ourHl.push({ startLine: ourLine, endLine: ourLine + oLines - 1 });
        theirHl.push({ startLine: theirLine, endLine: theirLine + tLines - 1 });
        ourLine += oLines;
        theirLine += tLines;
      }
    }
    return { ourContent: our, ourHighlights: ourHl, theirContent: their, theirHighlights: theirHl };
  }, [segments]);

  const mergedContent = useMemo(() => buildMergedContent(), [buildMergedContent]);

  const mergedHighlights = useMemo(() => {
    const ours = [], theirs = [];
    let line = 1;
    for (const seg of segments) {
      if (seg.type === "normal") {
        const count = seg.content ? (seg.content.endsWith("\n") ? seg.content.split("\n").length - 1 : seg.content.split("\n").length) : 0;
        if (seg._choice === "ours") {
          ours.push({ startLine: line, endLine: line + count - 1 });
        } else if (seg._choice === "theirs") {
          theirs.push({ startLine: line, endLine: line + count - 1 });
        } else if (seg._choice === "both" && seg._conflict) {
          const oLines = seg._conflict.ours ? seg._conflict.ours.split("\n").length : 1;
          ours.push({ startLine: line, endLine: line + oLines - 1 });
          theirs.push({ startLine: line + oLines, endLine: line + count - 1 });
        }
        line += count;
      } else {
        const oLines = seg.ours ? seg.ours.split("\n").length : 1;
        const tLines = seg.theirs ? seg.theirs.split("\n").length : 1;
        ours.push({ startLine: line + 1, endLine: line + oLines });
        theirs.push({ startLine: line + oLines + 2, endLine: line + oLines + tLines + 1 });
        line += oLines + tLines + 3;
      }
    }
    return { ours, theirs };
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
      next[segmentIdx] = { type: "normal", content: content + "\n", _conflict: { ours: seg.ours, theirs: seg.theirs }, _choice: choice };
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

  const lastScrolledBlockRef = useRef(null);

  useEffect(() => {
    if (conflictIndices.length === 0) return;
    const targetIdx = conflictIndices[Math.min(blockIndex, conflictIndices.length - 1)];
    const seg = segments[targetIdx];
    if (seg?.type === "conflict" && seg.id !== lastScrolledBlockRef.current && cardRefs.current[seg.id]) {
      lastScrolledBlockRef.current = seg.id;
      cardRefs.current[seg.id].scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [blockIndex, conflictIndices, segments]);

  const mergedActionLines = useMemo(() => {
    const actions = {};
    for (const seg of segmentsWithLines) {
      if (seg.type === "conflict") {
        const segIdx = segments.findIndex(s => s.type === "conflict" && s.id === seg.id);
        actions[seg.startLine] = (
          <Box sx={{ display: "flex", gap: 0.25, px: 0.5 }}>
            <Button size="small" variant="contained" color="error" onClick={() => resolveBlock(segIdx, "ours")} sx={{ fontSize: "0.55rem", minWidth: 32, height: 18, py: 0, lineHeight: 1, whiteSpace: "nowrap" }}>Ours</Button>
            <Button size="small" variant="contained" color="success" onClick={() => resolveBlock(segIdx, "theirs")} sx={{ fontSize: "0.55rem", minWidth: 34, height: 18, py: 0, lineHeight: 1, whiteSpace: "nowrap" }}>Theirs</Button>
            <Button size="small" variant="contained" color="warning" onClick={() => resolveBlock(segIdx, "both")} sx={{ fontSize: "0.55rem", minWidth: 28, height: 18, py: 0, lineHeight: 1, whiteSpace: "nowrap" }}>Both</Button>
          </Box>
        );
      }
    }
    return actions;
  }, [segmentsWithLines, segments, resolveBlock]);

  const handlePaneScroll = useCallback((sourceIdx, scrollTop) => {
    if (syncingScroll.current) return;
    syncingScroll.current = true;
    paneRefs.current.forEach((el, i) => {
      if (el && i !== sourceIdx) el.scrollTop = scrollTop;
    });
    requestAnimationFrame(() => { syncingScroll.current = false; });
  }, []);

  const handlePrevBlock = () => setBlockIndex(i => Math.max(0, i - 1));
  const handleNextBlock = () => setBlockIndex(i => Math.min(conflictIndices.length - 1, i + 1));

  const handleSave = async (doCommit) => {
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
      } else if (doCommit) {
        let isMergeCommit = false;
        try {
          const result = await window.api.continueMerge(directory);
          isMergeCommit = result !== null;
          onRefresh?.();
        } catch (e) {
          setError("Merge could not be finalized: " + (e.message || e));
          return;
        }
        if (isMergeCommit) {
          setSuccessMessage("Merge commit concluído com sucesso!");
          onCommit?.();
        } else {
          onClose();
        }
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
    setSegments([]);
    setBlocks([]);
    setConfirmCancel(false);
    setError(null);
    fetchBlocks();
  };

  const handleAbort = async () => {
    if (!window.api) return;
    setConfirmAbort(false);
    try {
      if (await window.api.checkMergeHead(directory)) {
        await window.api.abortMerge(directory);
        setSuccessMessage("Merge aborted successfully!");
      } else {
        setError("No merge in progress");
      }
      onRefresh?.();
    } catch (e) {
      setError("Could not abort merge: " + (e.message || e));
    }
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
        <div style={{ flex: 1, background: seg._choice === "ours" ? "rgba(33,150,243,0.08)" : seg._choice === "theirs" ? "rgba(76,175,80,0.08)" : seg._choice === "both" ? "rgba(255,152,0,0.08)" : "transparent", borderRadius: 2, padding: "0 4px" }}>
          <EditableText
            text={seg.content}
            onInput={newContent => handleNormalEdit(idx, newContent)}
          />
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

  const renderSideSegment = (seg, idx, side) => {
    if (seg.type === "normal") {
      const displayLines = seg.content ? (seg.content.endsWith("\n") ? seg.content.slice(0, -1) : seg.content).split("\n") : [];
      return (
        <Box key={idx} sx={{ display: "flex", px: 1.5, py: 0 }}>
          <Box sx={{ textAlign: "right", userSelect: "none", color: "text.secondary", fontFamily: "monospace", fontSize: "13px", lineHeight: 1.5, py: 0.5, minWidth: seg.lineCount >= 100 ? 44 : seg.lineCount >= 10 ? 36 : 28 }}>
            {displayLines.map((_, i) => (
              <div key={i} style={{ paddingRight: 8 }}>{seg.startLine + i}</div>
            ))}
          </Box>
          <Box sx={{ flex: 1, fontFamily: "monospace", fontSize: "13px", lineHeight: 1.5, py: 0.5, whiteSpace: "pre" }}>
            {displayLines.map((line, i) => (
              <div key={i} style={{ background: seg._choice === "ours" ? "rgba(33,150,243,0.08)" : seg._choice === "theirs" ? "rgba(76,175,80,0.08)" : "transparent" }}>{line || "\u00A0"}</div>
            ))}
          </Box>
        </Box>
      );
    }
    const isActive = activeConflictId === seg.id;
    const isOurs = side === "ours";
    const ourContent = seg.ours || "";
    const theirContent = seg.theirs || "";
    const splitLines = (text) => text ? text.replace(/\n$/, "").split("\n") : [];
    const ourLines = splitLines(ourContent);
    const theirLines = splitLines(theirContent);
    const emptyLine = (key) => <div key={key} style={{ lineHeight: 1.5, minHeight: "1.5em" }}>{"\u00A0"}</div>;
    return (
      <Box key={idx}
        onMouseEnter={() => setActiveConflictId(seg.id)}
        onMouseLeave={() => setActiveConflictId(null)}
        sx={{
          border: isActive ? "2px solid" : "1px solid",
          borderColor: isActive ? "primary.main" : "divider",
          borderRadius: 1, mx: 1, my: 1, overflowX: "auto", overflowY: "hidden",
          transition: "border 0.15s",
        }}
      >
        <Box sx={{ px: 1, py: 0.25, bgcolor: "rgba(33,150,243,0.08)", borderBottom: "1px solid", borderColor: "divider" }}>
          <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", fontFamily: "monospace" }}>
            Lines {seg.startLine}–{seg.startLine + seg.lineCount - 1}
          </Typography>
        </Box>
        <Box sx={{ bgcolor: isOurs ? "rgba(33,150,243,0.08)" : "rgba(33,150,243,0.04)", px: 1.5, py: 0.5 }}>
          <Typography variant="caption" sx={{ color: "primary.main", fontWeight: 600, display: "block", mb: 0.25 }}>OURS{oursBranch ? ` (${oursBranch})` : ""}</Typography>
          <Box sx={{ fontFamily: "monospace", fontSize: "13px", lineHeight: 1.5, whiteSpace: "nowrap" }}>
            {isOurs
              ? ourLines.map((line, i) => (<div key={i} style={{ whiteSpace: "nowrap" }}>{line || "\u00A0"}</div>))
              : ourLines.map((_, i) => emptyLine(i))}
          </Box>
        </Box>
        <Divider />
        <Box sx={{ bgcolor: !isOurs ? "rgba(76,175,80,0.08)" : "rgba(76,175,80,0.04)", px: 1.5, py: 0.5 }}>
          <Typography variant="caption" sx={{ color: "success.main", fontWeight: 600, display: "block", mb: 0.25 }}>THEIRS{theirsBranch ? ` (${theirsBranch})` : ""}</Typography>
          <Box sx={{ fontFamily: "monospace", fontSize: "13px", lineHeight: 1.5, whiteSpace: "nowrap" }}>
            {!isOurs
              ? theirLines.map((line, i) => (<div key={i} style={{ whiteSpace: "nowrap" }}>{line || "\u00A0"}</div>))
              : theirLines.map((_, i) => emptyLine(i))}
          </Box>
        </Box>
      </Box>
    );
  };

  const render3PaneView = () => (
    <Box sx={{ display: "flex", gap: 0.5, flex: 1, minHeight: 400 }}>
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", border: "1px solid", borderColor: "divider", borderRadius: 1, overflow: "hidden" }}>
        <Box sx={{ px: 1, py: 0.25, bgcolor: "rgba(33,150,243,0.08)", borderBottom: "1px solid", borderColor: "divider" }}>
          <Typography variant="caption" sx={{ fontWeight: 600, color: "primary.main" }}>OURS{oursBranch ? ` (${oursBranch})` : ""}</Typography>
        </Box>
        <Box ref={el => paneRefs.current[0] = el} onScroll={e => handlePaneScroll(0, e.target.scrollTop)}
          sx={{ overflow: "auto", flex: 1, fontFamily: "monospace", fontSize: "13px", lineHeight: 1.5, py: 0.5 }}
        >
          <Box sx={{ display: "inline-block", minWidth: "100%" }}>
            {ourSegments.map((seg, idx) => renderSideSegment(seg, idx, "ours"))}
          </Box>
        </Box>
      </Box>
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", border: "2px solid", borderColor: "secondary.main", borderRadius: 1, overflow: "hidden" }}>
        <Box sx={{ px: 1, py: 0.25, bgcolor: "secondary.main" }}>
          <Typography variant="caption" sx={{ fontWeight: 600, color: "#fff" }}>MERGED</Typography>
        </Box>
        <Box ref={el => paneRefs.current[1] = el} onScroll={e => handlePaneScroll(1, e.target.scrollTop)}
          sx={{ overflow: "auto", flex: 1, fontFamily: "monospace", fontSize: "13px", lineHeight: 1.5, py: 0.5 }}
        >
          <Box sx={{ display: "inline-block", minWidth: "100%" }}>
            {segmentsWithLines.map((seg, idx) =>
              seg.type === "normal" ? renderNormalSegment(seg, idx) : renderConflictCard(seg, idx)
            )}
          </Box>
        </Box>
      </Box>
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", border: "1px solid", borderColor: "divider", borderRadius: 1, overflow: "hidden" }}>
        <Box sx={{ px: 1, py: 0.25, bgcolor: "rgba(76,175,80,0.08)", borderBottom: "1px solid", borderColor: "divider" }}>
          <Typography variant="caption" sx={{ fontWeight: 600, color: "success.main" }}>THEIRS{theirsBranch ? ` (${theirsBranch})` : ""}</Typography>
        </Box>
        <Box ref={el => paneRefs.current[2] = el} onScroll={e => handlePaneScroll(2, e.target.scrollTop)}
          sx={{ overflow: "auto", flex: 1, fontFamily: "monospace", fontSize: "13px", lineHeight: 1.5, py: 0.5 }}
        >
          <Box sx={{ display: "inline-block", minWidth: "100%" }}>
            {theirSegments.map((seg, idx) => renderSideSegment(seg, idx, "theirs"))}
          </Box>
        </Box>
      </Box>
    </Box>
  );

  const renderConflictCard = (seg, idx) => {
    const isActive = activeConflictId === seg.id || activeBlockId === seg.id;
    return (
    <Box
      key={idx}
      ref={el => cardRefs.current[seg.id] = el}
      onMouseEnter={() => setActiveConflictId(seg.id)}
      onMouseLeave={() => setActiveConflictId(null)}
      sx={{
        border: isActive ? "2px solid" : "1px solid",
        borderColor: isActive ? "primary.main" : "divider",
        borderRadius: 1,
        mx: 1,
        my: 1,
        overflowX: "auto",
        overflowY: "hidden",
        bgcolor: "background.paper",
        transition: "border 0.15s",
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
          OURS{oursBranch ? ` (${oursBranch})` : ""}
        </Typography>
        <EditableText
          text={seg.ours}
          onInput={text => handleOursEdit(idx, text)}
        />
      </Box>
      <Divider />
      <Box sx={{ bgcolor: "rgba(76,175,80,0.08)", px: 1.5, py: 0.5 }}>
        <Typography variant="caption" sx={{ color: "success.main", fontWeight: 600, display: "block", mb: 0.25 }}>
          THEIRS{theirsBranch ? ` (${theirsBranch})` : ""}
        </Typography>
        <EditableText
          text={seg.theirs}
          onInput={text => handleTheirsEdit(idx, text)}
        />
      </Box>
    </Box>
  );
  };

  return (
    <Dialog id="conflict-resolver-dialog" open onClose={onClose} maxWidth="xl" fullWidth>
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
        <ToggleButtonGroup value={viewMode} exclusive onChange={(_, v) => v && setViewMode(v)} size="small" sx={{ mr: 1 }}>
          <ToggleButton value="unified" sx={{ fontSize: "0.7rem", py: 0.25, px: 1 }}>Unified</ToggleButton>
          <ToggleButton value="3pane" sx={{ fontSize: "0.7rem", py: 0.25, px: 1 }}>3-Pane</ToggleButton>
        </ToggleButtonGroup>
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
        {!loading && currentFile && viewMode === "unified" && (
          <Box sx={{ display: "inline-block", minWidth: "100%" }}>
            {segmentsWithLines.map((seg, idx) =>
              seg.type === "normal" ? renderNormalSegment(seg, idx) : renderConflictCard(seg, idx)
            )}
          </Box>
        )}
        {!loading && currentFile && viewMode === "3pane" && render3PaneView()}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleSkip}>Skip</Button>
        <Button color="error" onClick={() => setConfirmAbort(true)}>Abort merge</Button>
        <Button color="warning" onClick={() => setConfirmCancel(true)}>Cancel changes</Button>
        <Button variant="outlined" onClick={() => handleSave(false)} disabled={!currentFile || saving}>
          {saving ? "Saving..." : "Resolve & stage"}
        </Button>
        <Button variant="contained" onClick={() => handleSave(true)} disabled={!currentFile || saving}>
          {saving ? "Saving..." : "Resolve & commit"}
        </Button>
      </DialogActions>

      {confirmAbort && (
        <Box sx={{ position: "fixed", inset: 0, bgcolor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1400 }}>
          <Box sx={{ bgcolor: "background.paper", borderRadius: 3, width: 360, maxWidth: "90vw", boxShadow: 24, p: 3 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>Abort merge?</Typography>
            <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
              This will abort the current merge/rebase and discard all conflict resolutions. <strong>All changes will be lost!</strong>
            </Typography>
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
              <Button onClick={() => setConfirmAbort(false)}>Keep editing</Button>
              <Button color="error" variant="contained" onClick={handleAbort}>Abort merge</Button>
            </Box>
          </Box>
        </Box>
      )}

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

      <Snackbar open={!!successMessage} autoHideDuration={3000}
        onClose={() => { setSuccessMessage(null); onClose(); }}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity="success" sx={{ width: "100%" }}>
          {successMessage}
        </Alert>
      </Snackbar>
    </Dialog>
  );
}
