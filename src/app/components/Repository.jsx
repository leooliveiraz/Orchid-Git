import React, { useEffect, useState, useContext } from "react";
import "./Repository.css";
import CommitTable, { formatDate } from "./CommitTable.jsx";
import ChangesPanel from "./ChangesPanel.jsx";
import DiffViewer from "./DiffViewer.jsx";
import MetricsPanel from "./MetricsPanel.jsx";
import FileExplorer from "./FileExplorer.jsx";
import SuccessSnackbar from "./SuccessSnackbar.jsx";
import CommitSearch from "./CommitSearch.jsx";
import {
  Typography, Box, Tabs, Tab, FormControlLabel, Checkbox,
  TextField, Paper,
  Menu, MenuItem, ListItemIcon, ListItemText, Chip, Divider, Alert, Badge,
} from "@mui/material";
import { OrchidContext } from "../OrchidContext.jsx";

export default function Repository({ repositoryDirectory }) {
  const { refreshKey, setNotRepo, tabSignal, setTabSignal, refresh, isMerging, isReverting, scrollToCommitHash, setScrollToCommitHash, dateFormat } = useContext(OrchidContext);
  const [commitList, setCommitList] = useState([]);
  const [filteredCommitList, setFilteredCommitList] = useState([]);
  const [tab, setTab] = useState("graph");
  const [commitFiles, setCommitFiles] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [selectedCommit, setSelectedCommit] = useState(null);
  const [commitFileDiff, setCommitFileDiff] = useState(null);
  const [allBranches, setAllBranches] = useState(() => JSON.parse(localStorage.getItem("orchid-all-branches") ?? "true"));
  const [useTopoOrder, setUseTopoOrder] = useState(() => JSON.parse(localStorage.getItem("orchid-topo-order") ?? "true"));
  const [commitLimit, setCommitLimit] = useState(() => JSON.parse(localStorage.getItem("orchid-commit-limit") ?? "10000"));
  const [showSearch, setShowSearch] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(null);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (tabSignal) {
      setTab(tabSignal);
      setTimeout(() => { setTabSignal(null) }, 1000);
    }
  }, [tabSignal]);

  useEffect(() => {
    if (!scrollToCommitHash || commitList.length === 0) return;
    const idx = commitList.findIndex(c => scrollToCommitHash.startsWith(c.hash));
    if (idx >= 0) {
      setTab("graph");
      setHighlightIndex(idx);
      setTimeout(() => setHighlightIndex(null), 3000);
    }
    setScrollToCommitHash(null);
  }, [scrollToCommitHash, commitList, setScrollToCommitHash]);

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

          window.api?.saveRepoLog?.(result).catch(() => { });

          setCommitList(commits);
          setFilteredCommitList(commits);

          const fallbackHeadIdx = commits.findIndex(c => c.decoration && c.decoration.split(", ").some(r => r === "HEAD" || r.startsWith("HEAD ->")));
          setHighlightIndex(fallbackHeadIdx >= 0 ? fallbackHeadIdx : null);
          setSelectedCommit(null);
          setCommitFiles(null);
          setCommitFileDiff(null);
          setMenuAnchor(null);

          if (window.api) {
            const target = fallbackHeadIdx >= 0 ? commits[fallbackHeadIdx] : null;
            if (target) {
              window.api.getCommitFiles(repositoryDirectory, target.hash)
                .then(files => {
                  setSelectedCommit(target);
                  setCommitFiles(files || []);
                })
                .catch(() => { });
            }
          }
        }).catch(er => {
          er.message.includes("not a git repository") && setNotRepo(true)
        });
    }
  }, [repositoryDirectory, useTopoOrder, allBranches, commitLimit, refreshKey]);

  useEffect(() => {
    let mounted = true;
    async function checkChanges() {
      if (!window.api) return;
      try {
        const status = await window.api.getStatus(repositoryDirectory);
        if (mounted) setHasChanges(status.length > 0);
      } catch (e) { /* ignore */ }
    }
    checkChanges();
    const interval = setInterval(checkChanges, 10000);
    return () => { mounted = false; clearInterval(interval); };
  }, [repositoryDirectory, refreshKey]);

  function configureCommitList(result) {
    const commitList = [];
    const blocks = result.split("\0").filter(Boolean);
    blocks.forEach((block, index) => {
      const lines = block.trimStart().split("\n");
      commitList.push({
        index: index,
        hash: lines[0] || "",
        parent: lines[1] || "",
        parentList: [],
        author: lines[2] || "",
        date: lines[3] || "",
        message: lines[4] || "",
        decoration: (lines[5] || "").trim(),
      });
    });
    return configureGraphData(commitList);
  }

  function configureGraphData(commitList) {
    const commitHashMap = {};
    for (const commit of commitList) {
      commitHashMap[commit.hash] = commit;
    }
    for (const commit of commitList) {
      commit.parentList = extractParentList(commit, commitHashMap);
    }

    const columns = [];
    const columnsList = []
    for (let index = 0; index < commitList.length; index++) {
      const c = commitList[index];
      let colIdx = columns.findIndex(col => col.hashCommit === c.hash);
      if (colIdx === -1) {
        columns.push({ hashCommit: c.hash, hashOriginCommit: c.hash });
        colIdx = columns.length - 1;
      }
      c.lane = columns.map((col, i) => {
        const sameIndex = (i === colIdx)
        if (sameIndex) {
          c.laneIndex = i;
          return { type: "commit", lane: i, commit: c }
        } else {
          return { type: "line", lane: i, sourceCommit: commitHashMap[col.hashOriginCommit] || null, destCommit: commitHashMap[col.hashCommit] }
        }
      }

      );

      columns.splice(colIdx, 1);

      for (let p = c.parentList.length - 1; p >= 0; p--) {
        const parentHash = c.parentList[p].hash;
        if (!columns.some(col => col.hashCommit === parentHash)) {
          columns.splice(colIdx, 0, { hashCommit: parentHash, hashOriginCommit: c.hash });
        }
      }

      columnsList.push([...columns])
      c.connections = [];

      for (let p = 0; p < c.parentList.length; p++) {
        const parentLane = columns.findIndex(col => col.hashCommit === c.parentList[p].hash);
        if (parentLane !== -1 && parentLane !== colIdx) {
          c.connections.push({ fromLane: colIdx, toLane: parentLane, fromHash: c.hash, toHash: c.parentList[p].hash });
        }
      }

      c.hasParentInLane = !!columns[colIdx] && c.parentList.some(p => p.hash === columns[colIdx]?.hashCommit);

      c.lineConnections = []
      if (index > 0) {
        const commitBefore = commitList[index - 1]
        commitBefore.lane.forEach((lane) => {
          if (lane.type === "line") {
            if (lane.destCommit.hash === c.hash) {
              c.lineConnections.push({ fromLane: colIdx, toLane: lane.lane, fromHash: c.hash, toHash: lane.sourceCommit?.hash });
              lane.finalLane = true;
            }
          }
        })

      }
    }

    for (let i = 1; i < commitList.length; i++) {
      const curr = commitList[i];
      const prev = commitList[i - 1];
      curr.diagonalConnections = [];
      for (const entry of curr.lane) {
        if (entry.type === "line" && entry.sourceCommit) {
          const prevEntry = prev.lane.find(
            e => e.type === "line" && e.sourceCommit?.hash === entry.sourceCommit?.hash
          );
          if (prevEntry && prevEntry.lane !== entry.lane) {
            prevEntry.finalLane = true
            curr.diagonalConnections.push({ fromLane: prevEntry.lane, toLane: entry.lane, fromHash: entry.sourceCommit?.hash, toHash: entry.destCommit?.hash });
          }
        }
      }
    }
    commitList.forEach(commit => {
      console.log(commit.index, commit);
    })

    return commitList;
  }

  function getCommitIndex(hash, commitHashMap) {
    if (!hash || !commitHashMap) return -1;
    const commit = commitHashMap[hash];
    return commit ? commit.index : -1;
  }

  function extractParentList(commit, commitHashMap) {
    if (!commit.parent) return [];
    return commit.parent.split(" ").filter(Boolean).map(h => commitHashMap[h]).filter(Boolean);
  }

  function getCommitDistance(hashA, hashB, commitList) {
    const a = commitList.find(c => c.hash.startsWith(hashA));
    const b = commitList.find(c => c.hash.startsWith(hashB));
    if (!a || !b) return -1;
    return Math.abs(b.index - a.index);
  }

  const handleCommitClick = async (commit, event) => {
    if (!window.api) return;
    try {
      const files = await window.api.getCommitFiles(repositoryDirectory, commit.hash);
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
      const diff = await window.api.getCommitFileDiff(repositoryDirectory, selectedCommit.hash, file.path);
      if (diff && diff.trim()) {
        setCommitFileDiff({ fileName: `${file.path} (${selectedCommit.hash})`, diffText: diff });
      }
    } catch (e) {
      // silently ignore
    }
  };

  const handleCheckout = async (commitHash) => {
    if (isMerging) { setError("Resolva o merge antes de continuar"); return; }
    if (isReverting) { setError("Resolva o revert antes de continuar"); return; }
    if (!window.api) return;
    try {
      await window.api.checkoutCommit(repositoryDirectory, commitHash);
      setSuccess("Checked out " + commitHash);
      refresh();
    } catch (e) {
      setError(e.message || String(e));
    }
  };

  const handleCherryPick = async (commitHashes) => {
    if (isMerging) { setError("Resolva o merge antes de continuar"); return; }
    if (isReverting) { setError("Resolva o revert antes de continuar"); return; }
    if (!window.api) return;
    const hashes = Array.isArray(commitHashes) ? commitHashes : [commitHashes];
    try {
      await window.api.cherryPick(repositoryDirectory, hashes);
      setSuccess(`Cherry-picked ${hashes.length} commit(s)`);
      refresh();
      setTabSignal("graph");
    } catch (e) {
      setError(e.message || String(e));
    }
  };

  const handleRevert = async (commitHash) => {
    if (isMerging) { setError("Resolva o merge antes de continuar"); return; }
    if (isReverting) { setError("Resolva o revert antes de continuar"); return; }
    if (!window.api) return;
    try {
      await window.api.revertCommit(repositoryDirectory, commitHash);
      setSuccess("Reverted " + commitHash);
      refresh();
      setTabSignal("graph");
    } catch (e) {
      setError(e.message || String(e));
    }
  };

  const handleReset = async (commitHash, resetMode) => {
    if (isMerging) { setError("Resolva o merge antes de continuar"); return; }
    if (isReverting) { setError("Resolva o revert antes de continuar"); return; }
    if (!window.api) return;
    try {
      await window.api.resetCommit(repositoryDirectory, commitHash, resetMode);
      setSuccess(`Reset (${resetMode}) to ${commitHash}`);
      refresh();
    } catch (e) {
      setError(e.message || String(e));
    }
  };

  const STATUS_COLORS = {
    M: "#e6a817", A: "#28a745", D: "#d73a49", R: "#6f42c1",
  };

  return (
    <Box sx={{ p: 2, height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }} id="repository">
      <Box sx={{ mb: 2, borderBottom: "1px solid", borderColor: "divider", pb: 1.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 400, letterSpacing: "-0.02em", color: "text.primary", lineHeight: 1.3 }}>
          {repositoryDirectory.split(/[/\\]/).pop()}
        </Typography>
        <Typography variant="caption" sx={{ color: "text.secondary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block", mt: 0.25 }}>
          {repositoryDirectory}
        </Typography>
      </Box>

      <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 1 }}>
        <Tab label="Graph" value="graph" />
        <Tab label={<Badge color="error" variant="dot" invisible={!hasChanges}>Changes</Badge>} value="changes" />
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
          </Box>

          {showSearch && (
            <Paper sx={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 1300, p: 1, borderTop: 1, borderColor: "divider", borderRadius: 0 }}>
              <CommitSearch commitList={commitList} visible={showSearch} onFilter={setFilteredCommitList} />
            </Paper>
          )}

          <Box sx={{ flex: 1, minHeight: 0 }}>
            <CommitTable commitList={filteredCommitList} onCommitClick={handleCommitClick} highlightIndex={highlightIndex} onCherryPick={handleCherryPick} onCheckout={handleCheckout} onRevert={handleRevert} onReset={handleReset} dateFormat={dateFormat} />
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
              {selectedCommit.hash}
            </Typography>
            <Typography variant="body2" sx={{ mb: 0.5, fontSize: "0.8125rem", wordBreak: "break-word" }}>
              {selectedCommit.message}
            </Typography>
            <Box sx={{ display: "flex", gap: 2, fontSize: "0.75rem", color: "text.secondary" }}>
              <span>{selectedCommit.author}</span>
              <span>{formatDate(selectedCommit.date, dateFormat)}</span>
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
