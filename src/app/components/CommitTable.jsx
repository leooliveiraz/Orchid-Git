import React from "react";
import Graphline from "./Graphline.jsx";
export default function CommitTable({ commitList, longestDepth }) {
  return (
    <>
      <table>
        <thead className="table-header-title">
          <tr>
            <th>Index</th>
            <th>Graph</th>
            <th>DI</th>
            <th>DD</th>
            <th>De</th>
            <th>Sons</th> 
            <th>MD</th>
            <th>Hash</th>
            <th>Parent</th>
            <th>Decoration</th>
            <th>Author</th>
            <th>Date</th>
            <th>Message</th>
          </tr>
        </thead>
        <tbody>
          {commitList.map((commit, index) => {
            return (
              <tr
                key={'tr'+commit.commit}
                className="table-row-commit"
                style={{
                  "--max-commit-depth": longestDepth ? longestDepth : "",
                }}
              >
                <td>{index}</td>
                <Graphline commit={commit} index={index} ></Graphline>
                <td>
                  {commit.parentIndex}
                  {commit.merge ? `-${commit.merge?.parentIndex}` : ""}
                </td>
                <td>
                  {commit.parentDistance}
                  {commit.merge ? ` - ${commit.merge?.parentDistance}` : ""}
                </td>
                <td>{commit.depth + ""}</td>
                <td>{commit.sonsNumber} {commit.sonsMergeNumber ? `- ${commit.sonsMergeNumber}` : ""}</td>
                <td>{!isNaN(commit.maxDepth) ? commit.maxDepth + 1 :""}</td>
                <td>{commit.commit}</td>
                <td>{commit.parent}</td>
                <td>{commit.decoration}</td>
                <td>{commit.author}</td>
                <td>{commit.date}</td>
                <td>{commit.message}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}
