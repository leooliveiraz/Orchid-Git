import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import {
  Paper, TableContainer,
  Menu, MenuItem, ListItemIcon, ListItemText, Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography,
  Box, Radio, RadioGroup, FormControlLabel, TextField, Chip,
} from "@mui/material";
import ContentPasteIcon from "@mui/icons-material/ContentPaste";
import CheckIcon from "@mui/icons-material/Check";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ReplayIcon from "@mui/icons-material/Replay";
import CommitGraph from "./graph/CommitGraph.jsx";
import { LANE_COLORS } from "./graph/constants.js";

export function getRelativeTime(date) {
  const now = new Date();
  const diffSec = Math.round((date - now) / 1000);
  const abs = Math.abs(diffSec);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  if (abs < 60) return rtf.format(0, "second");
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
  if (abs < 2592000) return rtf.format(Math.round(diffSec / 86400), "day");
  if (abs < 31536000) return rtf.format(Math.round(diffSec / 2592000), "month");
  return rtf.format(Math.round(diffSec / 31536000), "year");
}

export function formatDate(dateStr, formatKey) {
  if (!formatKey) return dateStr;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  switch (formatKey) {
    case "locale-date":
      return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(d);
    case "locale-datetime":
      return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(d);
    case "locale-full":
      return new Intl.DateTimeFormat(undefined, { dateStyle: "full", timeStyle: "medium" }).format(d);
    case "relative":
      return getRelativeTime(d);
    case "iso":
      return d.toISOString().replace("T", " ").slice(0, 16);
    default:
      return dateStr;
  }
}

export default function CommitTable({ commitList, onCommitClick, highlightIndex, onCherryPick, onCheckout, onRevert, onReset, dateFormat }) {
  const containerRef = useRef(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [contextCommit, setContextCommit] = useState(null);
  const ROW_HEIGHT = 32;
  const BUFFER = 15;
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);

  const totalHeight = commitList.length * ROW_HEIGHT;
  const visibleStart = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER);
  const visibleEnd = Math.min(commitList.length, Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + BUFFER);
  const visibleCommits = useMemo(() => commitList.slice(visibleStart, visibleEnd), [commitList, visibleStart, visibleEnd]);

  const [confirmCherry, setConfirmCherry] = useState(false);
  const [confirmRevert, setConfirmRevert] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetMode, setResetMode] = useState("mixed");
  const [selectedCommits, setSelectedCommits] = useState(new Set());
  const [cherryPickHashes, setCherryPickHashes] = useState("");
  const [graphWidth, setGraphWidth] = useState(() => {
    const saved = localStorage.getItem("orchid-graph-width");
    return saved ? Math.max(60, Math.min(400, parseInt(saved, 10))) : 100;
  });
  const [graphResizing, setGraphResizing] = useState(false);
  const graphResizeRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("orchid-graph-width", graphWidth);
  }, [graphWidth]);

  const handleGraphResizeStart = useCallback((e) => {
    e.preventDefault();
    graphResizeRef.current = { startX: e.clientX, startWidth: graphWidth };
    setGraphResizing(true);
  }, [graphWidth]);

  useEffect(() => {
    if (!graphResizing) return;
    const handleMouseMove = (e) => {
      const { startX, startWidth } = graphResizeRef.current;
      const delta = e.clientX - startX;
      setGraphWidth(Math.max(60, Math.min(400, startWidth + delta)));
    };
    const handleMouseUp = () => {
      setGraphResizing(false);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [graphResizing]);

  useEffect(() => {
    setSelectedCommits(new Set());
  }, [commitList]);

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });
    ro.observe(el);
    el.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => { ro.disconnect(); el.removeEventListener("scroll", handleScroll); };
  }, [handleScroll]);

  useEffect(() => {
    if (highlightIndex == null || !containerRef.current) return;
    containerRef.current.scrollTo({ top: highlightIndex * ROW_HEIGHT, behavior: "smooth" });
  }, [highlightIndex]);

  useEffect(() => {
    function keyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        const target = e.target;
        if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
        e.preventDefault();
        setSelectedCommits(new Set(commitList.map(c => c.hash)));
      }
    }
    document.addEventListener("keydown", keyDown);
    return () => document.removeEventListener("keydown", keyDown);
  }, [commitList]);

  const handleRowClick = useCallback((e, commit) => {
    if (e.ctrlKey || e.metaKey) {
      e.stopPropagation();
      setSelectedCommits(prev => {
        const next = new Set(prev);
        if (next.has(commit.hash)) next.delete(commit.hash);
        else next.add(commit.hash);
        return next;
      });
    } else {
      setSelectedCommits(new Set([commit.hash]));
      onCommitClick?.(commit, e);
    }
  }, [onCommitClick]);

  const handleContextMenu = (e, commit) => {
    e.preventDefault();
    if (!selectedCommits.has(commit.hash)) {
      setSelectedCommits(new Set([commit.hash]));
    }
    setContextMenu({ left: e.clientX, top: e.clientY });
    setContextCommit(commit);
  };

  const handleCherryPick = () => {
    setContextMenu(null);
    setCherryPickHashes([...selectedCommits].join(" "));
    setConfirmCherry(true);
  };

  const handleConfirmCherry = () => {
    setConfirmCherry(false);
    const typed = cherryPickHashes.split(/\s+/).filter(Boolean);
    if (typed.length > 0 && onCherryPick) {
      onCherryPick(typed);
    }
  };

  const handleRevert = () => {
    setContextMenu(null);
    setConfirmRevert(true);
  };

  const handleConfirmRevert = () => {
    setConfirmRevert(false);
    if (contextCommit && onRevert) {
      onRevert(contextCommit.hash);
    }
  };

  const handleCheckout = () => {
    setContextMenu(null);
    if (contextCommit && onCheckout) {
      onCheckout(contextCommit.hash);
    }
  };

  const handleCopyHash = () => {
    setContextMenu(null);
    const hashes = [...selectedCommits];
    if (hashes.length > 0) {
      navigator.clipboard.writeText(hashes.join("\n"));
    }
  };

  const handleReset = () => {
    setContextMenu(null);
    setResetMode("mixed");
    setConfirmReset(true);
  };

  const handleConfirmReset = () => {
    setConfirmReset(false);
    if (contextCommit && onReset) {
      onReset(contextCommit.hash, resetMode);
    }
  };

  const headIdx = commitList.findIndex(c => c.decoration && c.decoration.split(", ").some(r => r === "HEAD" || r.startsWith("HEAD ->")));
  const commitColorHashMap = {};

  commitList.forEach(commit => {
    commitColorHashMap[commit.hash] = LANE_COLORS[commit.laneIndex % LANE_COLORS.length]
  });

  return (
    <>
      <TableContainer ref={containerRef} component={Paper} variant="outlined" sx={{ height: "100%", overflow: "auto" }}>
        <Box sx={{ minWidth: 650 }}>
          <Box sx={{ display: "flex", position: "sticky", top: 0, zIndex: 9999, bgcolor: "var(--bg-table-alt)", borderBottom: "1px solid var(--border-color)", columnGap: 1 }}>
            <Box sx={{ width: 40, flexShrink: 0, textAlign: "center", fontWeight: 600, color: "text.secondary", fontSize: "0.75rem", py: 1 }}>#</Box>
            <Box sx={{ width: graphWidth, flexShrink: 0, fontWeight: 600, fontSize: "0.75rem", color: "text.secondary", py: 1, position: "relative", userSelect: "none", clipPath: "inset(-100vh 0)" }}>
              Graph
              <Box
                onMouseDown={handleGraphResizeStart}
                sx={{
                  position: "absolute", right: 0, top: 0, bottom: 0, width: 5,
                  cursor: "col-resize", zIndex: 10,
                  bgcolor: graphResizing ? "primary.main" : "transparent",
                  opacity: graphResizing ? 1 : 0,
                  "&:hover": { opacity: 1, bgcolor: "primary.main" },
                  transition: "opacity 0.15s",
                }}
              />
            </Box>
            <Box sx={{ flex: 1, minWidth: 80, fontWeight: 600, fontSize: "0.75rem", color: "text.secondary", py: 1, whiteSpace: "nowrap" }}>Hash</Box>
            <Box sx={{ flex: 2, minWidth: 120, fontWeight: 600, fontSize: "0.75rem", color: "text.secondary", py: 1 }}>Decoration</Box>
            <Box sx={{ flex: 3, minWidth: 150, fontWeight: 600, fontSize: "0.75rem", color: "text.secondary", py: 1 }}>Message</Box>
            <Box sx={{ flex: 1, minWidth: 80, fontWeight: 600, fontSize: "0.75rem", color: "text.secondary", py: 1, whiteSpace: "nowrap" }}>Author</Box>
            <Box sx={{ flex: 1, minWidth: 80, fontWeight: 600, fontSize: "0.75rem", color: "text.secondary", py: 1 }}>Date</Box>
          </Box>

          {commitList.length === 0 ? (
            <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center", py: 6 }}>
              No matching commits
            </Typography>
          ) : (
            <Box sx={{ height: totalHeight, position: "relative" }}>
              {visibleCommits.map((commit, i) => {
                const index = visibleStart + i;
                const isSelected = selectedCommits.has(commit.hash);
                const isHighlighted = index === highlightIndex;
                const isHead = index === headIdx;
                return (
                  <Box
                    key={commit.hash}
                    onClick={(e) => handleRowClick(e, commit)}
                    onContextMenu={(e) => handleContextMenu(e, commit)}
                      sx={{
                        position: "absolute", top: index * ROW_HEIGHT, left: 0, right: 0, height: ROW_HEIGHT,
                        display: "flex", alignItems: "center", cursor: "pointer",
                        borderBottom: "1px solid var(--border-color)",
                        zIndex: commitList.length - index,
                        columnGap: 1,
                      "&:hover": { bgcolor: "color-mix(in srgb, var(--bg-table-alt) 25%, transparent)" },
                      ...(isSelected ? { bgcolor: "rgba(25, 118, 210, 0.12)", "&:hover": { bgcolor: "rgba(25, 118, 210, 0.18)" } } : {}),
                      ...(isHighlighted ? {
                        animation: "highlight-pulse 3s ease-out",
                        "@keyframes highlight-pulse": {
                          "0%": { backgroundColor: "var(--bg-table-alt)" },
                          "70%": { backgroundColor: "var(--bg-table-alt)" },
                          "100%": { backgroundColor: "transparent" },
                        },
                      } : {}),
                      ...(isHead ? { outline: "2px solid", outlineColor: "primary.main", outlineOffset: -1 } : {}),
                    }}
                  >
                    <Box sx={{ width: 40, flexShrink: 0, textAlign: "center", fontWeight: 400, fontSize: "0.75rem", color: "text.secondary" }}>
                      {commit.index}
                    </Box>
                    <Box sx={{ width: graphWidth, flexShrink: 0, p: 0, display: "flex", alignItems: "center", pointerEvents: "none", clipPath: "inset(-100vh 0)" }}>
                      <CommitGraph commit={commit} commitColorHashMap={commitColorHashMap} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 80, fontFamily: "monospace", fontSize: "0.75rem", color: "text.secondary", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {commit.hash}
                    </Box>
                    <Box sx={{ flex: 2, minWidth: 120, fontSize: "0.75rem", overflow: "hidden", textWrap: "nowrap" }}>
                      {commit.decoration ? (() => {
                        const parts = commit.decoration.split(", ");
                        return parts.map((part, i) => {
                          const t = part.trim();
                          if (!t || t === "HEAD") return null;
                          const isHead = t.startsWith("HEAD -> ");
                          const isTag = t.startsWith("tag: ");
                          const isRemote = t.startsWith("origin/");
                          const name = isHead ? t.slice(8) : isTag ? t.slice(5) : t;
                          const chipColor = isHead ? "#e6a817" : isTag ? "#28a745" : isRemote ? "#6a737d" : "#1976d2";
                          return (
                            <Chip
                              key={i}
                              label={name}
                              size="small"
                              sx={{ fontSize: "0.65rem", height: 20, m: 0.25, color: "#fff", fontWeight: isHead ? 700 : 400, backgroundColor: chipColor }}
                            />
                          );
                        });
                      })() : ""}
                    </Box>
                    <Box sx={{ flex: 3, minWidth: 150, fontSize: "0.8125rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {commit.message}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 80, fontSize: "0.75rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {commit.author}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 80, fontSize: "0.75rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {formatDate(commit.date, dateFormat)}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>
      </TableContainer>

      <Dialog open={confirmCherry} onClose={() => setConfirmCherry(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Cherry-pick commits</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Enter commit hashes separated by space:
          </Typography>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={2}
            maxRows={6}
            placeholder="e.g. a1b2c3d e4f5g6h i7j8k9l"
            value={cherryPickHashes}
            onChange={e => setCherryPickHashes(e.target.value)}
            sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}
          />
          <Typography variant="caption" sx={{ mt: 1, display: "block", color: "text.secondary" }}>
            {cherryPickHashes.split(/\s+/).filter(Boolean).length} commit(s) to cherry-pick
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmCherry(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleConfirmCherry} disabled={!cherryPickHashes.split(/\s+/).filter(Boolean).length}>Cherry-pick</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmRevert} onClose={() => setConfirmRevert(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Revert commit</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Revert <strong>{contextCommit?.hash}</strong> by creating a new commit that undoes its changes?
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, color: "text.secondary" }}>
            {contextCommit?.message}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmRevert(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleConfirmRevert}>Revert</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmReset} onClose={() => setConfirmReset(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Reset to this commit</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Reset <strong>{contextCommit?.hash}</strong>?
          </Typography>
          <RadioGroup value={resetMode} onChange={(e) => setResetMode(e.target.value)}>
            <FormControlLabel value="soft" control={<Radio size="small" />} label={<Typography variant="body2">Soft — keep all changes staged</Typography>} />
            <FormControlLabel value="mixed" control={<Radio size="small" />} label={<Typography variant="body2">Mixed — keep changes, unstage them</Typography>} />
            <FormControlLabel value="hard" control={<Radio size="small" />} label={<Typography variant="body2">Hard — discard all changes</Typography>} />
          </RadioGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmReset(false)}>Cancel</Button>
          <Button variant="contained" color={resetMode === "hard" ? "error" : "primary"} onClick={handleConfirmReset}>Reset</Button>
        </DialogActions>
      </Dialog>

      <Menu
        open={!!contextMenu}
        onClose={() => setContextMenu(null)}
        anchorReference="anchorPosition"
        anchorPosition={contextMenu}
      >
        <MenuItem onClick={handleCheckout} dense>
          <ListItemIcon sx={{ minWidth: 28 }}>
            <CheckIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Checkout this commit" primaryTypographyProps={{ variant: "body2" }} />
        </MenuItem>
        <MenuItem onClick={handleCherryPick} dense>
          <ListItemIcon sx={{ minWidth: 28 }}>
            <ContentPasteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary={selectedCommits.size > 1 ? `Cherry-pick ${selectedCommits.size} commits` : "Cherry-pick this commit"} primaryTypographyProps={{ variant: "body2" }} />
        </MenuItem>
        <MenuItem onClick={handleRevert} dense>
          <ListItemIcon sx={{ minWidth: 28 }}>
            <ReplayIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Revert this commit" primaryTypographyProps={{ variant: "body2" }} />
        </MenuItem>
        <MenuItem onClick={handleCopyHash} dense>
          <ListItemIcon sx={{ minWidth: 28 }}>
            <ContentPasteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary={selectedCommits.size > 1 ? `Copy ${selectedCommits.size} hashes` : "Copy hash"} primaryTypographyProps={{ variant: "body2" }} />
        </MenuItem>
        <MenuItem onClick={handleReset} dense>
          <ListItemIcon sx={{ minWidth: 28 }}>
            <ArrowBackIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Reset to this commit" primaryTypographyProps={{ variant: "body2" }} />
        </MenuItem>
      </Menu>
    </>
  );
}
