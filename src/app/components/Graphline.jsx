import React from "react";
export default function Graphline({ commit, index }) {
  return (
    <td className="table-collumn-graph">
      <span className="circle" style={{ "--commit-depth": commit.depth }} />
      {!commit.depthDistance && (
        <span
          className="vertical-line"
          style={{
            "--commit-lines": commit.parentDistance,
            "--commit-depth": commit.depth ? commit.depth : "",
          }}
        />
      )}
      {/* <span className="horizontal-line" /> */}
      {commit.merge?.depthDistance < 0 && (
        <span
          className="opening-branch"
          style={{
            "--commit-lines": commit.parentDistance,
            "--commit-depth": commit.depth ? commit.depth : "",
          }}
        />
      )}
      {commit.merge?.depthDistance > 0 && (
        <span
          className="closing-branch"
          style={{
            "--commit-lines": commit.parentDistance,
            "--commit-depth": commit.depth ? commit.depth : "",
          }}
        />
      )}
      {commit.depthDistance < 0 && (
        <span
          className="opening-branch"
          style={{
            "--adjustment": "2px",
          }}
        />
      )}
    </td>
  );
}
