import React, { useMemo } from "react";
import GitGraph from "./GitGraph.jsx";
import Graphline from "./Graphline.jsx";
export default function CommitTable({ commitList, connectionStyle }) {
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
    const maxDepth = commitList.reduce((m, c) => Math.max(m, c.depth ?? 0), 0);
    return { lanesAtRow: sorted, maxDepth };
  }, [commitList]);
  return (
    <>
      <div style={{ overflow: "auto", height: "calc(74vh)", width:"100vw" }}>
        <table>
          <thead className="table-header-title">
            <tr>
              <th title="INDEX">I.</th>
              <th>Graph</th>
              <th>Hash</th>
              <th>Parent</th>
              <th title="DAD INDEX">DI</th>
              <th title="DAD DISTANCE">DD</th>
              <th title="DEPTH">De</th>
              <th title="NUMBER OF SONS">Sons</th>
              <th title="MAX DEPTH">MD</th>
              <th>Message</th>
              <th>Decoration</th>
              <th>Author</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {commitList.map((commit, index) => {
              return (
                <tr
                  key={'tr' + commit.commit}
                  className="table-row-commit"
                >
                  <td style={{ color: commit.merge ? "red" : "inherit", fontWeight: commit.merge ? "bold" : "inherit" }}>{index}</td>
                  <td className="table-collumn-graph">
                    <GitGraph commit={commit} index={index} commitList={commitList} connectionStyle={connectionStyle} lanesAtRow={lanesAtRow} maxDepth={maxDepth} />
                  </td>
                  <td>{commit.commit}</td>
                  <td>{commit.parent}</td>
                  <td>
                    {commit.dad?.parentIndex}
                    {commit.merge ? `-${commit.merge?.parentIndex}` : ""}
                  </td>
                  <td>
                    {commit.dad?.parentDistance}
                    {commit.merge ? ` - ${commit.merge?.parentDistance}` : ""}
                  </td>
                  <td>{commit.depth + ""}</td>
                  <td>{commit.sonsNumber} {commit.sonsMergeNumber ? `- ${commit.sonsMergeNumber}` : ""}</td>
                  <td>{!isNaN(commit.maxDepth) ? commit.maxDepth + 1 : ""}</td>
                  <td>{commit.message}</td>
                  <td>{commit.decoration}</td>
                  <td>{commit.author}</td>
                  <td>{commit.date}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
