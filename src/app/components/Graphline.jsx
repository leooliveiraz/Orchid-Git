import React from "react";
export default function Graphline({ commit, index }) {
  return (
    <td className="table-collumn-graph" key={"td-" + commit.commit}>
      <span className="circle" style={{ "--commit-depth": commit.depth }} />
      {commit.parentDistance && (
        <span
          className="vertical-line"
          style={{
            "--commit-lines": commit.parentDistance,
            "--commit-depth": commit.depth ? commit.depth : "",
          }}
        />
      )}
      {commit.merge && (
        <>
          <span
            className="closing-branch"
            style={{
              "--commit-lines": commit.merge.parentDistance,
              "--commit-depth": commit.depth ? commit.depth : "",
            }}
          />
        </>
      )}
      {commit.sonsNumber > 1 &&
        commit.sons.map((son) => {
          return (
            <>
              {son.depth > commit.depth && (
                <>
                  {son.depth - commit.depth > 1 && (
                    <span
                      key={"s1" + son.commit + son.index}
                      className="horizontal-line"
                      style={{
                        borderColor: "red",
                        "--commit-depth": commit.depth,
                        "--commit-depth-distance": son.depth - commit.depth,
                      }}
                    />
                  )}
                  <span
                    key={"s2" + son.commit + son.index}
                    className="opening-branch"
                    style={{
                      "--adjustment": "0px",
                      "--commit-depth": son.depth -1
                    }}
                  />
                </>
              )}
            </>
          );
        })}

      {commit.sonsMergeNumber > 1 &&
        commit.sonsMerge.map((son) => {
          return (
            <>
              {son.depth > commit.depth && (
                <>
                  {son.depth - commit.depth > 1 && (
                    <span
                      key={"sm1" + son.commit + son.index}
                      className="horizontal-line"
                      style={{
                        color: "blue",
                        "--commit-depth": commit.depth,
                        "--commit-depth-distance": son.depth - commit.depth,
                      }}
                    />
                  )}
                  <span
                    key={"sm2" + son.commit + son.index}
                    className="opening-branch"
                    style={{
                      "--adjustment": "0px",
                      "--commit-depth": son.depth - 1 ,
                    }}
                  />
                </>
              )}
            </>
          );
        })}
    </td>
  );
}
