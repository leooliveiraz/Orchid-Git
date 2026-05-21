import React, { useMemo, useRef, useEffect, useState } from "react";
import GitGraph from "./GitGraph.jsx";
import {
  TableContainer, Table, TableHead, TableBody, TableRow, TableCell, Paper,
  Menu, MenuItem, ListItemIcon, ListItemText, Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography,
} from "@mui/material";
import ContentPasteIcon from "@mui/icons-material/ContentPaste";

export default function CommitTable({ commitList, connectionStyle, onCommitClick, highlightIndex, onCherryPick }) {
  const containerRef = useRef(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [contextCommit, setContextCommit] = useState(null);
  const [confirmCherry, setConfirmCherry] = useState(false);

  useEffect(() => {
    if (highlightIndex == null || !containerRef.current) return;
    const rowHeight = 24;
    containerRef.current.scrollTo({ top: highlightIndex * rowHeight, behavior: "smooth" });
  }, [highlightIndex]);

  const handleContextMenu = (e, commit) => {
    e.preventDefault();
    setContextMenu({ left: e.clientX, top: e.clientY });
    setContextCommit(commit);
  };

  const handleCherryPick = () => {
    setContextMenu(null);
    setConfirmCherry(true);
  };

  const handleConfirmCherry = () => {
    setConfirmCherry(false);
    if (contextCommit && onCherryPick) {
      onCherryPick(contextCommit.commit);
    }
  };

  const handleCopyHash = () => {
    setContextMenu(null);
    if (contextCommit) {
      navigator.clipboard.writeText(contextCommit.commit);
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

  const headIdx = commitList.findIndex(c => c.decoration && c.decoration.includes("HEAD"));

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
              onClick={(e) => onCommitClick?.(commit, e)}
              onContextMenu={(e) => handleContextMenu(e, commit)}
              sx={{
                cursor: "pointer",
                "&:last-child td": { borderBottom: 0 },
                ...(index === highlightIndex ? {
                  animation: "highlight-pulse 3s ease-out",
                  "@keyframes highlight-pulse": {
                    "0%": { backgroundColor: "var(--bg-table-alt)", outline: "2px solid", outlineColor: "warning.main" },
                    "70%": { backgroundColor: "var(--bg-table-alt)", outline: "2px solid", outlineColor: "warning.main" },
                    "100%": { backgroundColor: "transparent", outline: "none" },
                  },
                } : {}),
                ...(index === headIdx && index !== highlightIndex ? { outline: "2px solid", outlineColor: "primary.main", outlineOffset: -1 } : {}),
              }}
            >
              <TableCell sx={{ textAlign: "center", color: commit.merge ? "error.main" : "text.secondary", fontWeight: commit.merge ? 700 : 400, fontSize: "0.75rem" }}>
                {index}
              </TableCell>
              <TableCell sx={{ p: 0, verticalAlign: "middle" }}>
                <GitGraph commit={commit} index={index} commitList={commitList} connectionStyle={connectionStyle} lanesAtRow={lanesAtRow} maxDepth={maxDepth} />
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

      <Dialog open={confirmCherry} onClose={() => setConfirmCherry(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Cherry-pick commit</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Cherry-pick <strong>{contextCommit?.commit}</strong> into the current branch?
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, color: "text.secondary" }}>
            {contextCommit?.message}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmCherry(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleConfirmCherry}>Cherry-pick</Button>
        </DialogActions>
      </Dialog>

      <Menu
        open={!!contextMenu}
        onClose={() => setContextMenu(null)}
        anchorReference="anchorPosition"
        anchorPosition={contextMenu}
      >
        <MenuItem onClick={handleCherryPick} dense>
          <ListItemIcon sx={{ minWidth: 28 }}>
            <ContentPasteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Cherry-pick this commit" primaryTypographyProps={{ variant: "body2" }} />
        </MenuItem>
        <MenuItem onClick={handleCopyHash} dense>
          <ListItemIcon sx={{ minWidth: 28 }}>
            <ContentPasteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Copy hash" primaryTypographyProps={{ variant: "body2" }} />
        </MenuItem>
      </Menu>
    </>
  );
}
