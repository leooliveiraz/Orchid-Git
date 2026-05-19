import React, { useEffect, useState } from "react";
import "./Repository.css";
import CommitTable from "./CommitTable.jsx";
import SearchText from "./SearchText.jsx";

export default function Repository({ repositoryDirectory }) {
  const [commitList, setCommitList] = useState([]);
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
                  d = Math.min(...commit.sons.map(s => s.depth));
                }
                commit.depth = d;
                occupy(index, d);
              } else if (commit.sons?.length) {
                const minDepth = Math.min(...commit.sons.map(s => s.depth));
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

          for (let i = 0; i < commits.length; i++) {
            console.log("  " + i + ": " + commits[i].commit + " depth=" + commits[i].depth);
          }

          setCommitList(commits);
        });
  }, [repositoryDirectory, useTopoOrder, allBranches, commitLimit]);

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
    <>
      <h1>{repositoryDirectory.split(/[/\\]/).pop()}</h1>
      <small style={{ opacity: 0.6 }}>{repositoryDirectory}</small>
      <div style={{ display: "flex", gap: 16, alignItems: "center", margin: "8px 0", flexWrap: "wrap" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, cursor: "pointer" }}>
          <input type="checkbox" checked={allBranches} onChange={e => setAllBranches(e.target.checked)} />
          All branches
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, cursor: "pointer" }}>
          <input type="checkbox" checked={useTopoOrder} onChange={e => setUseTopoOrder(e.target.checked)} />
          Topo order
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
          Limit:
          <input type="number" value={commitLimit} onChange={e => setCommitLimit(Number(e.target.value))}
            style={{ width: 80, padding: "2px 6px", fontSize: 13 }} />
        </label>
        <span style={{ fontSize: 13, display: "flex", gap: 2 }}>
          {["bezier", "angular", "straight", "step", "teardrop", "rounded", "elbow"].map(mode => (
            <span key={mode}
              onClick={() => setConnectionStyle(mode)}
              style={{
                padding: "2px 6px", cursor: "pointer", borderRadius: 3,
                background: connectionStyle === mode ? "#1976d2" : "#e0e0e0",
                color: connectionStyle === mode ? "#fff" : "#333",
                fontSize: 11, userSelect: "none",
              }}
            >{mode}</span>
          ))}
        </span>
      </div>
      {showSearch && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "var(--bg-primary, white)", padding: "8px 16px", zIndex: 100, borderTop: "1px solid var(--border-color, #ccc)" }}>
          <SearchText visible={showSearch}></SearchText>
        </div>
      )}
      <div style={{ height: "60px" }}></div>
      <CommitTable commitList={commitList} connectionStyle={connectionStyle}></CommitTable>
    </>
  );
}
