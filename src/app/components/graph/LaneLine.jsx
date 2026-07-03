import React from "react";
import { LANE_WIDTH, ROW_HEIGHT_TOTAL, ROW_HEIGHT, STROKE_W } from "./constants.js";
import { LANE_LINE_X } from "./utils.js";

const half = (ROW_HEIGHT_TOTAL / 2)
const height = ROW_HEIGHT_TOTAL;
export default function LaneLine({ lane, color, sourceCommit, destCommit, modeB, modeA, modeC }) {
  const x = LANE_LINE_X(lane);
  return (
    <rect
      className={modeA ? "LaneLineA" : modeB ? "LaneLineB" : "LaneLineC"}
      x={x}
      y={half}
      width={STROKE_W}
      height={height}
      fill={color}
      opacity={1}
    >
      <title>{sourceCommit?.hash || "?"} → {destCommit?.hash || "?"}</title>
    </rect>
  );
}
