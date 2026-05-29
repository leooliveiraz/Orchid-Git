import React, { useEffect, useState, useContext } from "react";
import "./Repository.css";
import CommitTable from "./CommitTable.jsx";
import ChangesPanel from "./ChangesPanel.jsx";
import DiffViewer from "./DiffViewer.jsx";
import MetricsPanel from "./MetricsPanel.jsx";
import FileExplorer from "./FileExplorer.jsx";
import SuccessSnackbar from "./SuccessSnackbar.jsx";
import SearchText from "./SearchText.jsx";
import {
  Typography, Box, Tabs, Tab, FormControlLabel, Checkbox,
  TextField, ToggleButtonGroup, ToggleButton, Paper,
  Menu, MenuItem, ListItemIcon, ListItemText, Chip, Divider, Alert,
} from "@mui/material";
import { OrchidContext } from "../OrchidContext.jsx";

export default function Repository({ repositoryDirectory }) {
  const { refreshKey, setNotRepo } = useContext(OrchidContext);
  const [commitList, setCommitList] = useState([]);
  const [tab, setTab] = useState("changes");
  const [commitFiles, setCommitFiles] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [selectedCommit, setSelectedCommit] = useState(null);
  const [commitFileDiff, setCommitFileDiff] = useState(null);
  const [allBranches, setAllBranches] = useState(() => JSON.parse(localStorage.getItem("orchid-all-branches") ?? "true"));
  const [useTopoOrder, setUseTopoOrder] = useState(() => JSON.parse(localStorage.getItem("orchid-topo-order") ?? "true"));
  const [commitLimit, setCommitLimit] = useState(() => JSON.parse(localStorage.getItem("orchid-commit-limit") ?? "10000"));
  const [showSearch, setShowSearch] = useState(false);
  const [connectionStyle, setConnectionStyle] = useState(() => localStorage.getItem("orchid-connection-style") || "bezier");
  const [highlightIndex, setHighlightIndex] = useState(null);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    localStorage.setItem("orchid-connection-style", connectionStyle);
  }, [connectionStyle]);

  useEffect(() => {
    function keyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setShowSearch(prev => !prev);
      }
    }
    document.addEventListener("keydown", keyDown);
    return () => document.removeEventListener("keydown", keyDown);
  }, []);

  useEffect(() => {
    localStorage.setItem("orchid-all-branches", JSON.stringify(allBranches));
  }, [allBranches]);

  useEffect(() => {
    localStorage.setItem("orchid-topo-order", JSON.stringify(useTopoOrder));
  }, [useTopoOrder]);

  useEffect(() => {
    localStorage.setItem("orchid-commit-limit", JSON.stringify(commitLimit));
  }, [commitLimit]);

  useEffect(() => {
    if (window.api) {
      setCommitList([]);
      window.api
        .getRepositoryCommits(repositoryDirectory, useTopoOrder, allBranches, commitLimit)
        .then((result) => {
          const commits = configureCommitList(result);

          commits.forEach((commit, index) => {
            commit.index = index;
            commit.sons = [];
            commit.sonsNumber = 0;
          });

          const map = {};
          commits.forEach(c => map[c.commit] = c);

          commits.forEach(commit => {
            const parents = commit.parent.split(" ");
            parents.forEach((p, idx) => {
              const parent = map[p];
              if (!parent) return;
              if (idx === 0) {
                parent.sons.push(commit);
                parent.sonsNumber = parent.sons.length;
              } else {
                if (!parent.sonsMerge) parent.sonsMerge = [];
                parent.sonsMerge.push(commit);
                parent.sonsMergeNumber = parent.sonsMerge.length;
              }
            });
          });

          commits.forEach((commit, index) => {
            const parents = commit.parent.split(" ");
            const firstParent = map[parents[0]];
            if (firstParent) {
              commit.dad = {
                dad: firstParent,
                parentIndex: firstParent.index,
                parentDistance: firstParent.index - index,
              };
            }
            if (parents.length > 1) {
              const secondParent = map[parents[1]];
              if (secondParent) {
                commit.merge = {
                  hash: parents[1],
                  parent: secondParent,
                  parentIndex: secondParent.index,
                  parentDistance: secondParent.index - index,
                };
              }
            }
          });

          const oc = {};
          function occupy(row, depth) {
            if (!oc[row]) oc[row] = new Set();
            oc[row].add(depth);
          }
          function isFree(row, depth) {
            return !oc[row] || !oc[row].has(depth);
          }
          function firstFree(row, prefer) {
            for (let offset = 0; offset <= 50; offset++) {
              for (const d of [prefer + offset, prefer - offset]) {
                if (d >= 0 && isFree(row, d)) return d;
              }
            }
            return prefer;
          }

          commits.forEach((commit, index) => {
            if (index === 0) {
              commit.depth = 0;
              occupy(0, 0);
            } else {
              const prev = commits[index - 1];
              if (prev.dad?.parentIndex === index) {
                let d = prev.depth;
                if (commit.sons?.length) {
                  const vals = commit.sons.filter(s => Number.isFinite(s.depth)).map(s => s.depth);
                  d = vals.length ? Math.min(...vals) : 0;
                }
                commit.depth = d;
                occupy(index, d);
              } else if (commit.sons?.length) {
                const vals = commit.sons.filter(s => Number.isFinite(s.depth)).map(s => s.depth);
                const minDepth = vals.length ? Math.min(...vals) : 0;
                commit.depth = minDepth;
                occupy(index, minDepth);
              } else {
                const d = firstFree(index, 0);
                commit.depth = d;
                occupy(index, d);
              }
            }

            if (commit.dad) {
              for (let r = index + 1; r <= commit.dad.parentIndex; r++) {
                if (!isFree(r, commit.depth)) break;
                occupy(r, commit.depth);
              }
            }
          });

          setCommitList(commits);
        }).catch(er => {
          er.message.includes("not a git repository") && setNoteRepo(true)
        });
    }
  }, [repositoryDirectory, useTopoOrder, allBranches, commitLimit, refreshKey]);

  function configureCommitList(result) {
    const commitList = [];
    const blocks = result.split("\0").filter(Boolean);
    blocks.forEach((block) => {
      const lines = block.trimStart().split("\n");
      commitList.push({
        commit: lines[0] || "",
        parent: lines[1] || "",
        author: lines[2] || "",
        date: lines[3] || "",
        message: lines[4] || "",
        decoration: (lines[5] || "").trim(),
      });
    });
    return commitList;
  }

  const handleCommitClick = async (commit, event) => {
    if (!window.api) return;
    try {
      const files = await window.api.getCommitFiles(repositoryDirectory, commit.commit);
      setSelectedCommit(commit);
      setCommitFiles(files || []);
      setMenuAnchor({ left: event.clientX, top: event.clientY });
    } catch (e) {
      // silently ignore
    }
  };

  const handleCommitFileClick = async (file) => {
    setMenuAnchor(null);
    if (!window.api) return;
    try {
      const diff = await window.api.getCommitFileDiff(repositoryDirectory, selectedCommit.commit, file.path);
      if (diff && diff.trim()) {
        setCommitFileDiff({ fileName: `${file.path} (${selectedCommit.commit})`, diffText: diff });
      }
    } catch (e) {
      // silently ignore
    }
  };

  const handleParentClick = (parentIndex) => {
    setMenuAnchor(null);
    setHighlightIndex(parentIndex);
    setTimeout(() => setHighlightIndex(null), 3000);
  };

  const handleCherryPick = async (commitHash) => {
    if (!window.api) return;
    try {
      await window.api.cherryPick(repositoryDirectory, commitHash);
      setSuccess("Cherry-picked " + commitHash);
      refresh();
    } catch (e) {
      setError(e.message || String(e));
    }
  };

  const getParentCommits = () => {
    if (!selectedCommit || !commitList.length) return [];
    const result = [];
    if (selectedCommit.dad?.parentIndex != null) {
      const parent = commitList[selectedCommit.dad.parentIndex];
      if (parent) result.push({ ...parent, parentIndex: selectedCommit.dad.parentIndex });
    }
    if (selectedCommit.merge?.parentIndex != null) {
      const parent = commitList[selectedCommit.merge.parentIndex];
      if (parent && parent.commit !== result[0]?.commit) result.push({ ...parent, parentIndex: selectedCommit.merge.parentIndex });
    }
    return result;
  };

  const STATUS_COLORS = {
    M: "#e6a817", A: "#28a745", D: "#d73a49", R: "#6f42c1",
  };

  return (
    <Box sx={{ p: 2, height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <Typography variant="h5" sx={{ fontWeight: 600 }}>
        {repositoryDirectory.split(/[/\\]/).pop()}
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", mb: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {repositoryDirectory}
      </Typography>

      <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 1 }}>
        <Tab label="Graph" value="graph" />
        <Tab label="Changes" value="changes" />
        <Tab label="Metrics" value="metrics" />
        <Tab label="Files" value="files" />
      </Tabs>

      {tab === "graph" && (
        <>
          <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap", mb: 1 }}>
            <FormControlLabel
              control={<Checkbox size="small" checked={allBranches} onChange={e => setAllBranches(e.target.checked)} />}
              label={<Typography variant="body2">All branches</Typography>}
            />
            <FormControlLabel
              control={<Checkbox size="small" checked={useTopoOrder} onChange={e => setUseTopoOrder(e.target.checked)} />}
              label={<Typography variant="body2">Topo order</Typography>}
            />
            <TextField
              type="number"
              size="small"
              label="Limit"
              value={commitLimit}
              onChange={e => setCommitLimit(Number(e.target.value))}
              sx={{ width: 100 }}
            />
            <ToggleButtonGroup
              size="small"
              value={connectionStyle}
              exclusive
              onChange={(e, v) => v && setConnectionStyle(v)}
            >
              {["bezier", "angular", "straight", "step", "teardrop", "rounded", "elbow"].map(mode => (
                <ToggleButton key={mode} value={mode}>{mode}</ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>

          {showSearch && (
            <Paper sx={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100, p: 1, borderTop: 1, borderColor: "divider", borderRadius: 0 }}>
              <SearchText visible={showSearch} />
            </Paper>
          )}

          <Box sx={{ flex: 1, minHeight: 0 }}>
            <CommitTable commitList={commitList} connectionStyle={connectionStyle} onCommitClick={handleCommitClick} highlightIndex={highlightIndex} onCherryPick={handleCherryPick} />
          </Box>
        </>
      )}

      {tab === "changes" && (
        <Box sx={{ flex: 1, overflow: "auto" }}>
          <ChangesPanel directory={repositoryDirectory} />
        </Box>
      )}

      {tab === "metrics" && (
        <Box sx={{ flex: 1, overflow: "auto" }}>
          <MetricsPanel directory={repositoryDirectory} />
        </Box>
      )}

      {tab === "files" && (
        <Box sx={{ flex: 1, overflow: "auto" }}>
          <FileExplorer directory={repositoryDirectory} />
        </Box>
      )}

      {commitFileDiff && (
        <DiffViewer
          fileName={commitFileDiff.fileName}
          diffText={commitFileDiff.diffText}
          onClose={() => setCommitFileDiff(null)}
        />
      )}

      <Menu
        open={!!menuAnchor}
        onClose={() => setMenuAnchor(null)}
        anchorReference="anchorPosition"
        anchorPosition={menuAnchor}
        slotProps={{ paper: { sx: { maxHeight: 400, width: 400 } } }}
      >
        {selectedCommit && (
          <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: "divider" }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5, fontFamily: "monospace", fontSize: "0.75rem" }}>
              {selectedCommit.commit}
            </Typography>
            <Typography variant="body2" sx={{ mb: 0.5, fontSize: "0.8125rem", wordBreak: "break-word" }}>
              {selectedCommit.message}
            </Typography>
            <Box sx={{ display: "flex", gap: 2, fontSize: "0.75rem", color: "text.secondary" }}>
              <span>{selectedCommit.author}</span>
              <span>{selectedCommit.date}</span>
            </Box>
          </Box>
        )}
        {selectedCommit?.decoration && (
          <Box sx={{ px: 2, py: 1, borderBottom: 1, borderColor: "divider", display: "flex", gap: 0.5, flexWrap: "wrap" }}>
            {(() => {
              const parts = selectedCommit.decoration.split(", ");
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
                    sx={{ fontSize: "0.65rem", height: 20, color: "#fff", fontWeight: isHead ? 700 : 400, backgroundColor: chipColor }}
                  />
                );
              });
            })()}
          </Box>
        )}
        {getParentCommits().length > 0 && (
          <Box sx={{ px: 2, py: 1, borderBottom: 1, borderColor: "divider", bgcolor: "action.hover" }}>
            <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", mb: 0.5, display: "block" }}>
              Parents
            </Typography>
            {getParentCommits().map(p => (
              <Box
                key={p.commit}
                onClick={() => handleParentClick(p.parentIndex)}
                sx={{ display: "flex", gap: 1, alignItems: "center", cursor: "pointer", py: 0.5, px: 1, borderRadius: 1, "&:hover": { bgcolor: "action.selected" } }}
              >
                <Typography variant="caption" sx={{ fontFamily: "monospace", color: "primary.main", fontSize: "0.7rem" }}>
                  {p.commit}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.7rem" }}>
                  {p.message}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
        <Divider />
        {commitFiles?.map(file => (
          <MenuItem key={file.path} onClick={() => handleCommitFileClick(file)} dense>
            <ListItemIcon sx={{ minWidth: 28 }}>
              <Chip label={file.status} size="small"
                sx={{
                  color: "#fff", fontWeight: 700, fontSize: "0.6rem", minWidth: 24, height: 18,
                  backgroundColor: STATUS_COLORS[file.status] || "#6a737d",
                }}
              />
            </ListItemIcon>
            <ListItemText
              primary={file.path}
              primaryTypographyProps={{ variant: "body2", noWrap: true }}
              secondary={
                <Box component="span" sx={{ display: "flex", gap: 1, mt: 0.25 }}>
                  {file.added > 0 && <Typography variant="caption" sx={{ color: "#28a745" }}>+{file.added}</Typography>}
                  {file.deleted > 0 && <Typography variant="caption" sx={{ color: "#d73a49" }}>-{file.deleted}</Typography>}
                </Box>
              }
            />
          </MenuItem>
        ))}
        {commitFiles?.length === 0 && (
          <MenuItem disabled dense>
            <ListItemText primary="No files changed" />
          </MenuItem>
        )}
      </Menu>
      {error && <Alert severity="error" sx={{ position: "fixed", bottom: 60, left: "50%", transform: "translateX(-50%)", zIndex: 2000 }} onClose={() => setError(null)}>{error}</Alert>}
      <SuccessSnackbar message={success} onClose={() => setSuccess(null)} />
    </Box>
  );
}
