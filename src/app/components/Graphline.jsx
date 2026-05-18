import React from "react";
export default function Graphline({ commit, index }) {
  return (
    <td className="table-collumn-graph" key={"td-" + commit.commit}
    >
      <span className="circle" style={{ "--commit-depth": commit.depth }} />

      {commit.dad?.parentDistance && (
        <span
          className="vertical-line"
          style={{
            "--commit-lines": commit.dad.parentDistance,
            "--commit-depth": commit.depth ? commit.depth : "",
          }}
        />
      )}

      {commit.sons.map((son) => {
        return son.depth === commit.depth ? null :
          <React.Fragment key={"s" + son.commit + son.index}>
            {console.log("son", index)}
            <span
              className="horizontal-line"
              style={{
                "--commit-depth": commit.depth,
                "--commit-depth-distance": son.depth - commit.depth
              }}
            ></span>
            <span
              className="opening-branch"
              style={{ "--commit-depth": son.depth - 1 }}
            ></span>
          </React.Fragment>
      })}

      {commit.sonsMerge?.map((son) => {
        return son.depth > commit.depth ?
          <React.Fragment key={"s" + son.commit + son.index}>
            {console.log("sonMerge", index)}
            <span
              className="horizontal-line"
              style={{
                "--commit-depth": commit.depth,
                "--commit-line-color": "green",
                "--commit-depth-distance": son.depth - commit.depth + 1
              }}
            ></span>
            <span
              className="opening-branch"
              style={{
                "--commit-depth": son.depth,
                "--commit-line-color": "green",
                "--adjustment-vertical": "-10px"
              }}
            ></span>
          </React.Fragment> : null
      })}

      {commit.merge && (
        <>
          {console.log("merge", index)}
          <span
            className={"closing-branch"}
            style={{
              "--commit-line-color": "green",
              "--commit-lines": commit.merge.parentDistance,
              "--commit-depth": commit.depth ? commit.depth : "",
              "--adjustment": commit.merge.parentDistance === 1 ? "-5px" : "0px"
            }}
          />
        </>
      )}

      {/* {commit.sonsNumber > 1 &&
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
        })} */}

      {/* {commit.sonsMergeNumber > 1 &&
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
        })} */}
    </td>
  );
}
