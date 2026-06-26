import React from "react";
import { LANE_WIDTH, ROW_HEIGHT } from "./constants.js";
import { LANE_LINE_X } from "./utils.js";

const height = ROW_HEIGHT / 2;

export default function LaneLineUp({ lane, color }) {
  const x = LANE_LINE_X(lane);

  return (
    <rect
      x={x}
      y={0}
      width={2}
      height={height}
      fill={color}
      opacity={1}
    />
  );
}
