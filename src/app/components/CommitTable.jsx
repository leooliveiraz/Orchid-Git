import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  TableContainer, Table, TableHead, TableBody, TableRow, TableCell, Paper,
  Menu, MenuItem, ListItemIcon, ListItemText, Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography,
  Box, Radio, RadioGroup, FormControlLabel, TextField, Chip,
} from "@mui/material";
import ContentPasteIcon from "@mui/icons-material/ContentPaste";
import CheckIcon from "@mui/icons-material/Check";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ReplayIcon from "@mui/icons-material/Replay";
import CommitCircle from "./graph/CommitCircle.jsx";
import LaneLine from "./graph/LaneLine.jsx";
import LaneLineDown from "./graph/LaneLineDown.jsx";
import LaneLineUp from "./graph/LaneLineUp.jsx";
import ConnectionPath from "./graph/ConnectionPath.jsx";
import { LANE_COLORS, LANE_WIDTH, ROW_HEIGHT } from "./graph/constants.js";
import ConnectionPathToLine from "./graph/ConnectionPathToLine.jsx";
import DiagonalPath from "./graph/DiagonalPath.jsx";

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
  const [confirmCherry, setConfirmCherry] = useState(false);
  const [confirmRevert, setConfirmRevert] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetMode, setResetMode] = useState("mixed");
  const [selectedCommits, setSelectedCommits] = useState(new Set());
  const [cherryPickHashes, setCherryPickHashes] = useState("");

  useEffect(() => {
    setSelectedCommits(new Set());
  }, [commitList]);

  useEffect(() => {
    if (highlightIndex == null || !containerRef.current) return;
    const rowHeight = 24;
    containerRef.current.scrollTo({ top: highlightIndex * rowHeight, behavior: "smooth" });
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

  return (
    <>
      <TableContainer ref={containerRef} component={Paper} variant="outlined" sx={{ height: "100%", overflow: "auto" }}>
        <Table size="small" stickyHeader sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 40, textAlign: "center", fontWeight: 600, color: "text.secondary", fontSize: "0.75rem" }}>
                #
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem", color: "text.secondary", width: 100 }}>
                Graph
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem", color: "text.secondary" }}>
                Hash
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem", color: "text.secondary" }}>
                Parent
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem", color: "text.secondary" }}>
                Decoration
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem", color: "text.secondary" }}>
                Message
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem", color: "text.secondary" }}>
                Author
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem", color: "text.secondary" }}>
                Date
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {commitList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    No matching commits
                  </Typography>
                </TableCell>
              </TableRow>
            ) : commitList.map((commit, index) => (
              <TableRow
                key={commit.hash}
                hover
                onClick={(e) => handleRowClick(e, commit)}
                onContextMenu={(e) => handleContextMenu(e, commit)}
                sx={{
                  cursor: "pointer",
                  "&:last-child td": { borderBottom: 0 },
                  ...(selectedCommits.has(commit.hash) ? {
                    bgcolor: "rgba(25, 118, 210, 0.12)",
                    "&:hover": { bgcolor: "rgba(25, 118, 210, 0.18)" },
                  } : {}),
                  ...(index === highlightIndex ? {
                    animation: "highlight-pulse 3s ease-out",
                    "@keyframes highlight-pulse": {
                      "0%": { backgroundColor: "var(--bg-table-alt)" },
                      "70%": { backgroundColor: "var(--bg-table-alt)" },
                      "100%": { backgroundColor: "transparent" },
                    },
                  } : {}),
                  ...(index === headIdx ? { outline: "2px solid", outlineColor: "primary.main", outlineOffset: -1 } : {}),
                }}
              >
                <TableCell sx={{ textAlign: "center", fontWeight: 400, fontSize: "0.75rem", color: "text.secondary" }}>
                  {index}
                </TableCell>
                <TableCell sx={{ p: 0, verticalAlign: "middle" }}>
                  <svg width={Math.max((commit.lane?.length || 1) * LANE_WIDTH + 10, 24)} height={ROW_HEIGHT} style={{ overflow: "visible", display: "block" }}>
                    {commit.diagonalConnections?.map((conn, i) => (
                      <DiagonalPath
                        key={`d-${i}`}
                        fromLane={conn.fromLane}
                        toLane={conn.toLane}
                        color={LANE_COLORS[conn.toLane % LANE_COLORS.length]}
                      />
                    ))}
                    {(commit.lane || []).map(entry =>
                      entry.type === "line" &&
                      <>
                        {commit.diagonalConnections.find(conn => conn.toLane === entry.lane && !entry.finalLane) ?
                          <LaneLineDown key={entry.lane} lane={entry.lane} color={LANE_COLORS[entry.lane % LANE_COLORS.length]} /> :
                          entry.finalLane ? <LaneLineUp key={entry.lane} lane={entry.lane} color={LANE_COLORS[entry.lane % LANE_COLORS.length]} />
                            : <LaneLine key={entry.lane} lane={entry.lane} color={LANE_COLORS[entry.lane % LANE_COLORS.length]} />}
                      </>
                    )}
                    {commit.hasParentInLane && commit.lane?.map(entry =>
                      entry.type === "commit" && <LaneLine key={`bg-${entry.lane}`} lane={entry.lane} color={LANE_COLORS[entry.lane % LANE_COLORS.length]} />
                    )}
                    {commit.connections?.map(conn => (
                      <ConnectionPath
                        key={`c-${conn.toLane}`}
                        fromLane={conn.fromLane}
                        toLane={conn.toLane}
                        color={LANE_COLORS[conn.toLane % LANE_COLORS.length]}
                      />
                    ))}

                    {commit.lineConnections?.map(conn => (
                      <ConnectionPathToLine
                        key={`c-${conn.toLane}`}
                        fromLane={conn.fromLane}
                        toLane={conn.toLane}
                        color={LANE_COLORS[conn.toLane % LANE_COLORS.length]}
                      />
                    ))}
                    {(commit.lane || []).map(entry =>
                      entry.type === "commit" && <CommitCircle key={entry.lane} lane={entry.lane} color={LANE_COLORS[entry.lane % LANE_COLORS.length]} />
                    )}
                  </svg>
                </TableCell>
                <TableCell sx={{ fontFamily: "monospace", fontSize: "0.75rem", color: "text.secondary" }}>
                  {commit.hash}
                </TableCell>
                <TableCell sx={{ fontFamily: "monospace", fontSize: "0.75rem", color: "text.secondary" }}>
                  {commit.parent ? commit.parent.split(" ").filter(Boolean).map((p, i) => (
                    <span key={i}>{i > 0 && <span style={{ margin: "0 2px" }}> </span>}{p}</span>
                  )) : ""}
                </TableCell>
                <TableCell sx={{ fontSize: "0.75rem" }}>
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
                </TableCell>
                <TableCell sx={{ fontSize: "0.8125rem", maxWidth: 400, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {commit.message}
                </TableCell>
                <TableCell sx={{ fontSize: "0.75rem" }}>
                  {commit.author}
                </TableCell>
                <TableCell sx={{ fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                  {formatDate(commit.date, dateFormat)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
