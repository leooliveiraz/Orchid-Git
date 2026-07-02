import React from "react";
import { LANE_WIDTH, ROW_HEIGHT } from "./constants.js";
import { LANE_LINE_X } from "./utils.js";

const half = ROW_HEIGHT / 2;
const height = ROW_HEIGHT;

export default function LaneLineDown({ lane, color, sourceCommit, destCommit }) {
  const x = LANE_LINE_X(lane);

  return (
    <rect
      className="LaneLineDown"
      x={x}
      y={height}
      width={2}
      height={height}
      fill={color}
      opacity={1}
    >
      <title>{sourceCommit?.hash || "?"} → {destCommit?.hash || "?"}</title>
    </rect>
  );
}
