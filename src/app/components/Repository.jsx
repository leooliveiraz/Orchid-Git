import React, { useEffect, useState } from "react";
import "./Repository.css";
import CommitTable from "./CommitTable.jsx";
import SearchText from "./SearchText.jsx";

export default function Repository({ repositoryDirectory }) {
  const [commitList, setCommitList] = useState([]);

  useEffect(() => {
    const useTopoOrder = true;
    const allBranches = true;
    const commitLimit = 10000;
    if (window.api)
      window.api
        .getRepositoryCommits(repositoryDirectory, useTopoOrder, allBranches, commitLimit)
        .then((result) => {
          setCommitList(configureCommitList(result));
        });
  }, [repositoryDirectory]);

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
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "var(--bg-primary, white)", padding: "8px 16px", zIndex: 100, borderTop: "1px solid var(--border-color, #ccc)" }}>
        <SearchText></SearchText>
      </div>
      <div style={{ height: "60px" }}></div>
      <CommitTable commitList={commitList}></CommitTable>
    </>
  );
}
