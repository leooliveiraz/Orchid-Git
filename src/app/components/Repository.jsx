import React, { useEffect, useState, useContext } from "react";
import "./Repository.css";
import CommitTable from "./CommitTable.jsx";
import ChangesPanel from "./ChangesPanel.jsx";
import SearchText from "./SearchText.jsx";
import {
  Typography, Box, Tabs, Tab, FormControlLabel, Checkbox,
  TextField, ToggleButtonGroup, ToggleButton, Paper,
} from "@mui/material";
import { OrchidContext } from "../OrchidContext.jsx";

export default function Repository({ repositoryDirectory }) {
  const { refreshKey } = useContext(OrchidContext);
  const [commitList, setCommitList] = useState([]);
  const [tab, setTab] = useState("graph");
  const [allBranches, setAllBranches] = useState(() => JSON.parse(localStorage.getItem("orchid-all-branches") ?? "true"));
  const [useTopoOrder, setUseTopoOrder] = useState(() => JSON.parse(localStorage.getItem("orchid-topo-order") ?? "true"));
  const [commitLimit, setCommitLimit] = useState(() => JSON.parse(localStorage.getItem("orchid-commit-limit") ?? "10000"));
  const [showSearch, setShowSearch] = useState(false);
  const [connectionStyle, setConnectionStyle] = useState(() => localStorage.getItem("orchid-connection-style") || "bezier");

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
    if (window.api)
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
        });
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
            <CommitTable commitList={commitList} connectionStyle={connectionStyle} />
          </Box>
        </>
      )}

      {tab === "changes" && (
        <Box sx={{ flex: 1, overflow: "auto" }}>
          <ChangesPanel directory={repositoryDirectory} />
        </Box>
      )}
    </Box>
  );
}
