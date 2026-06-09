import React, { useMemo, useRef, useEffect, useState, useCallback } from "react";
import GitGraph, { parseLabels } from "./GitGraph.jsx";
import {
  TableContainer, Table, TableHead, TableBody, TableRow, TableCell, Paper,
  Menu, MenuItem, ListItemIcon, ListItemText, Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography,
  Chip, Tooltip, Box, Radio, RadioGroup, FormControlLabel, TextField,
} from "@mui/material";
import ContentPasteIcon from "@mui/icons-material/ContentPaste";
import CheckIcon from "@mui/icons-material/Check";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ReplayIcon from "@mui/icons-material/Replay";

const COLORS = [
  "#2D3AC9", "#B041FD", "#FD63CE", "#FD3C2F",
  "#fc8225", "#3B8C33", "#F9A825", "#00BCD4",
  "#FF5722", "#607D8B", "#795548", "#9C27B0",
];

export default function CommitTable({ commitList, connectionStyle, onCommitClick, highlightIndex, onCherryPick, onCheckout, onRevert, onReset }) {
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
        setSelectedCommits(new Set(commitList.map(c => c.commit)));
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
        if (next.has(commit.commit)) next.delete(commit.commit);
        else next.add(commit.commit);
        return next;
      });
    } else {
      setSelectedCommits(new Set([commit.commit]));
      onCommitClick?.(commit, e);
    }
  }, [onCommitClick]);

  const handleContextMenu = (e, commit) => {
    e.preventDefault();
    if (!selectedCommits.has(commit.commit)) {
      setSelectedCommits(new Set([commit.commit]));
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
      onRevert(contextCommit.commit);
    }
  };

  const handleCheckout = () => {
    setContextMenu(null);
    if (contextCommit && onCheckout) {
      onCheckout(contextCommit.commit);
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
      onReset(contextCommit.commit, resetMode);
    }
  };

  const { lanesAtRow, maxDepth } = useMemo(() => {
    const lanesAtRow = {};
    commitList.forEach((commit, index) => {
      if (!lanesAtRow[index]) lanesAtRow[index] = new Set();
      lanesAtRow[index].add(commit.depth);
      if (commit.merge) {
        const mp = commitList[commit.merge.parentIndex];
        const mpDepth = mp ? mp.depth : null;
        if (mpDepth === commit.depth) {
          for (let r = index; r <= commit.merge.parentIndex; r++) {
            if (!lanesAtRow[r]) lanesAtRow[r] = new Set();
            lanesAtRow[r].add(mpDepth);
          }
        }
      }
    });
    commitList.forEach((commit, index) => {
      if (!commit.dad) return;
      const pDepth = commitList[commit.dad.parentIndex]?.depth;
      const endRow = pDepth === commit.depth ? commit.dad.parentIndex : index;
      for (let r = index; r <= endRow; r++) {
        if (!lanesAtRow[r]) lanesAtRow[r] = new Set();
        lanesAtRow[r].add(commit.depth);
      }
      if (pDepth !== commit.depth && pDepth != null) {
        if (!lanesAtRow[commit.dad.parentIndex]) lanesAtRow[commit.dad.parentIndex] = new Set();
        lanesAtRow[commit.dad.parentIndex].add(pDepth);
      }
    });
    const sorted = {};
    for (const k in lanesAtRow) sorted[k] = [...lanesAtRow[k]].sort((a, b) => a - b);
    const maxDepth = commitList.reduce((m, c) => Math.max(m, Number.isFinite(c.depth) ? c.depth : 0), 0);
    return { lanesAtRow: sorted, maxDepth };
  }, [commitList]);

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
            <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem", color: "text.secondary" }}>
              Graph
            </TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem", color: "text.secondary", minWidth: 140 }}>
              Branches
            </TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem", color: "text.secondary" }}>
              Hash
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
          {commitList.map((commit, index) => (
            <TableRow
              key={commit.commit}
              hover
              onClick={(e) => handleRowClick(e, commit)}
              onContextMenu={(e) => handleContextMenu(e, commit)}
              sx={{
                cursor: "pointer",
                "&:last-child td": { borderBottom: 0 },
                ...(selectedCommits.has(commit.commit) ? {
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
              <TableCell sx={{ textAlign: "center", fontWeight: commit.merge ? 700 : 400, fontSize: "0.75rem", color: commit.merge ? (() => { const md = commit.merge?.parentIndex != null ? commitList[commit.merge.parentIndex]?.depth : null; return Number.isFinite(md) ? COLORS[md % COLORS.length] : "text.secondary"; })() : "text.secondary" }}>
                {index}
              </TableCell>
              <TableCell sx={{ p: 0, verticalAlign: "middle" }}>
                <GitGraph commit={commit} index={index} commitList={commitList} connectionStyle={connectionStyle} lanesAtRow={lanesAtRow} maxDepth={maxDepth} />
              </TableCell>
              <TableCell sx={{ py: 0, px: 1, verticalAlign: "middle" }}>
                {(() => {
                  const labels = parseLabels(commit?.decoration);
                  const maxLabels = 3;
                  const depth = Number.isFinite(commit?.depth) ? commit.depth : 0;
                  const color = COLORS[depth % COLORS.length];
                  return (
                    <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", alignItems: "center" }}>
                      {labels.slice(0, maxLabels).map((label, i) => (
                        <Chip
                          key={i}
                          label={label.name}
                          size="small"
                          icon={label.hasRemote ? <Box component="span" sx={{ fontSize: "0.7rem", ml: 0.5, opacity: 0.85 }}>☁</Box> : undefined}
                          sx={{
                            backgroundColor: color,
                            color: "#fff",
                            fontWeight: label.type === "head" ? 700 : 400,
                            height: 20,
                            fontSize: "0.65rem",
                            "& .MuiChip-label": { px: 0.75 },
                            "& .MuiChip-icon": { ml: 0.5, mr: -0.25 },
                          }}
                        />
                      ))}
                      {labels.length > maxLabels && (
                        <Tooltip title={labels.slice(maxLabels).map(l => l.name).join(", ")} arrow>
                          <Chip
                            label={`+${labels.length - maxLabels}`}
                            size="small"
                            variant="outlined"
                            sx={{ height: 20, fontSize: "0.65rem" }}
                          />
                        </Tooltip>
                      )}
                    </Box>
                  );
                })()}
              </TableCell>
              <TableCell sx={{ fontFamily: "monospace", fontSize: "0.75rem", color: "text.secondary" }}>
                {commit.commit}
              </TableCell>
              <TableCell sx={{ fontSize: "0.8125rem", maxWidth: 400, overflow: "hidden", textOverflow: "ellipsis" }}>
                {commit.message}
              </TableCell>
              <TableCell sx={{ fontSize: "0.75rem" }}>
                {commit.author}
              </TableCell>
              <TableCell sx={{ fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                {commit.date}
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
            Revert <strong>{contextCommit?.commit}</strong> by creating a new commit that undoes its changes?
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
            Reset <strong>{contextCommit?.commit}</strong>?
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
