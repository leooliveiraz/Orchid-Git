import React from "react";
import CommitCircle from "./CommitCircle.jsx";
import LaneLine from "./LaneLine.jsx";
import ConnectionPath from "./ConnectionPath.jsx";
import ConnectionPathToLine from "./ConnectionPathToLine.jsx";
import DiagonalPath from "./DiagonalPath.jsx";
import { LANE_WIDTH, ROW_HEIGHT } from "./constants.js";

export default function CommitGraph({ commit, commitColorHashMap }) {
  const width = Math.max((commit.lane?.length || 1) * LANE_WIDTH + 10, 24);
  return (
    <svg width={width} height={ROW_HEIGHT} style={{ overflow: "visible", display: "block" }}>
      {commit.diagonalConnections?.map((conn, i) => (
        <DiagonalPath
          key={`d-${i}`}
          fromLane={conn.fromLane}
          toLane={conn.toLane}
          color={commitColorHashMap[conn.toHash]}
          fromHash={conn.fromHash}
          toHash={conn.toHash}
        />
      ))}
      {(commit.lane || []).map(lane =>
        lane.type === "line" &&
        <React.Fragment key={lane.lane}>
          {commit.diagonalConnections.find(conn => conn.toLane === lane.lane && !lane.finalLane) ?
            <LaneLine lane={lane.lane} color={commitColorHashMap[lane.destCommit?.hash]} sourceCommit={lane.sourceCommit} destCommit={lane.destCommit} modeA={true} /> :
            lane.finalLane ?
              null
              : <LaneLine lane={lane.lane} color={commitColorHashMap[lane.destCommit?.hash]} sourceCommit={lane.sourceCommit} destCommit={lane.destCommit} modeB={true} />}
        </React.Fragment>
      )}
      {commit.hasParentInLane && commit.lane?.map(lane =>
        lane.type === "commit" &&
        <LaneLine
          key={`bg-${lane.lane}`}
          lane={lane.lane}
          color={commitColorHashMap[lane.destCommit?.hash]}
          modeC={true}
          sourceCommit={lane.sourceCommit}
          destCommit={lane.destCommit}
        />
      )}
      {commit.connections?.map(conn => (
        <ConnectionPath
          key={`c-${conn.toLane}`}
          fromLane={conn.fromLane}
          toLane={conn.toLane}
          color={commitColorHashMap[conn.toLane > conn.fromLane ? conn.toHash : conn.fromHash]}
          fromHash={conn.fromHash}
          toHash={conn.toHash}
        />
      ))}
      {commit.lineConnections?.map(conn => (
        <ConnectionPathToLine
          key={`c-${conn.toLane}`}
          fromLane={conn.fromLane}
          toLane={conn.toLane}
          color={commitColorHashMap[conn.toLane < conn.fromLane ? conn.toHash : conn.fromHash]}
          fromHash={conn.fromHash}
          toHash={conn.toHash}
        />
      ))}
      {(commit.lane || []).map(entry =>
        entry.type === "commit" && <CommitCircle key={entry.lane} lane={entry.lane} color={commitColorHashMap[commit.hash]} />
      )}
    </svg>
  );
}
