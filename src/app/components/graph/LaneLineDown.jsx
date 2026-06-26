import React from "react";
import { LANE_WIDTH, ROW_HEIGHT } from "./constants.js";
import { LANE_LINE_X } from "./utils.js";

const half = ROW_HEIGHT / 2;
const height = ROW_HEIGHT;

export default function LaneLineDown({ lane, color }) {
  const x = LANE_LINE_X(lane);

  return (
    <rect
      x={x}
      y={height}
      width={2}
      height={height}
      fill={color}
      opacity={1}
    />
  );
}
