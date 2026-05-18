import React from "react";
import GitGraph from "./GitGraph.jsx";
import Graphline from "./Graphline.jsx";
export default function CommitTable({ commitList }) {
  return (
    <>
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
                <td style={{ color: commit.merge ? "red" : "inherit", fontWeight: commit.merge ? "bold" : "inherit"}}>{index}</td>
                <GitGraph commit={commit} index={index} commitList={commitList} />
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
    </>
  );
}
