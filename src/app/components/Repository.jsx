import React, { useEffect, useState } from "react";
import "./Repository.css";
import CommitTable from "./CommitTable.jsx";
import SearchText from "./SearchText.jsx";

const COLOR_LIST = [
  "#2D3AC9",
  "#B041FD",
  "#FD63CE",
  "#FD3C2F",
  "#FC9E25",
  "#FAFF90",
  "#3B8C33",
];

export default function Repository({ repositoryDirectory }) {
  const [commitList, setCommitList] = useState([]);
  const [allBranches, setAllBranches] = useState(true);
  const [useTopoOrder, setUseTopoOrder] = useState(true);
  const [commitLimit, setCommitLimit] = useState(10000);

  useEffect(() => {
    if (window.api)
      window.api
        .getRepositoryCommits(
          repositoryDirectory,
          useTopoOrder,
          allBranches,
          commitLimit
        )
        .then((result) => {
          const commits = configureCommitList(result);

          commits.forEach((commit, index) => {
            commit.branchQuantity = 0;
            commit.index = index;
            if (commit.sonsNumber === undefined) commit.sonsNumber = 0;
            if (commit.sons === undefined) commit.sons = [];
            defineDadIndexAndDistance(commit, index, commits);
          });

          commits.forEach((element, index) => {
            // defineBranch(element, index, commits);
            // defineParentBranch(element, index, commits);
            if (element.merge) defineMergeBranch(element, index, commits);
          });

          setCommitList(commits);
        });
    }, [repositoryDirectory, useTopoOrder, allBranches, commitLimit]);

  useEffect(() => {
    if (commitList.length) {
      console.log("commitList", commitList[0]);
    }
  }, [commitList]);

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

  function defineBranch(commit, index, commitList) {
    if (commit.decoration) {
      const decorationArray = commit.decoration
        .replace("(", "")
        .replace(")", "")
        .split(",");

      const branch = decorationArray.find((text) => text.includes("origin"));
      const branchTrimed = branch?.trim();
      commit.branch = branchTrimed;
    }
  }

  function defineParentBranch(commit, index, commitList) {
    const parent = getParentElement(commit, commitList);
    if (parent && !parent.branch) {
      parent.branch = commit.branch;
    }

    if (parent && parent.decoration) {
      const branch = parent.decoration.replace("(", "").replace(")", "").trim();
      parent.branch = branch;
    }
  }

  function defineMergeBranch(commit, index, commitList) {
    const mergeParent = getMergeParentElement(commit, commitList);
    if (mergeParent && !mergeParent.branch) {
      mergeParent.branch = commit.branch;
    }
    if (mergeParent?.decoration) {
      const branch = mergeParent?.decoration
        .replace("(", "")
        .replace(")", "")
        .trim();
      mergeParent.branch = branch;
    }
  }

  function getParentElement(element, commitList) {
    return element.dad ? commitList[element.dad.parentIndex] : null;
  }

  function getMergeParentElement(commit, commitList) {
    if (commit.merge) {
      return commitList[commit.merge.parentIndex];
    } else {
      return null;
    }
  }

  function defineDadIndexAndDistance(commit, index, commitList) {
    if (commit.parent.includes(" ")) {
      defineDadInMerge(commit, index, commitList);
    } else {
      defineDad(commit, index, commitList);
    }
    const parent = getParentElement(commit, commitList);
    const mergeParent = getMergeParentElement(commit, commitList);

    if (parent) {
      addSonToCommit(parent, commit);
    }
    if (mergeParent) {
      addMergeSonToCommit(mergeParent, commit);
    }
  }

  function addSonToCommit(parent, commit) {
    if (parent && !parent.sons) {
      parent.sons = [];
    }
    if (parent && parent.sons) {
      parent.sons.push(commit);
    }
    parent.sonsNumber = parent.sons.length;
  }

  function addMergeSonToCommit(parent, commit) {
    if (parent && !parent.sonsMerge) {
      parent.sonsMerge = [];
    }
    if (parent && parent.sonsMerge) {
      parent.sonsMerge.push(commit);
    }
    parent.sonsMergeNumber = parent.sonsMerge.length;
  }

  function defineDad(commit, index, list) {
    const parentEquals = (item) => item.commit === commit.parent;
    const dadIndex = list.findNextIndex(parentEquals, index);
    commit.dad = {
      dad: list[dadIndex],
      parentIndex: dadIndex,
      parentDistance: dadIndex - index,
    };
  }

  function defineDadInMerge(commit, index, list) {
    const parentList = commit.parent.split(" ");
    let parentEquals = (item) => item.commit === parentList[0];
    let parentEquals2 = (item) => item.commit === parentList[1];
    const parentIndex = list.findNextIndex(parentEquals, index);
    const mergeParentIndex = list.findNextIndex(parentEquals2, index);

    commit.merge = {
      hash: parentList[1],
      parent: list[mergeParentIndex],
      parentIndex: mergeParentIndex,
      parentDistance: mergeParentIndex - index,
    };
    commit.dad = {
      dad: list[parentIndex],
      parentIndex: parentIndex,
      parentDistance: parentIndex - index,
    };
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
      </div>
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "var(--bg-primary, white)", padding: "8px 16px", zIndex: 100, borderTop: "1px solid var(--border-color, #ccc)" }}>
        <SearchText></SearchText>
      </div>
      <div style={{ height: "60px" }}></div>
      <CommitTable
        commitList={commitList}
      ></CommitTable>
    </>
  );
}
