import React from "react";
import { LANE_WIDTH, ROW_HEIGHT } from "./constants.js";
import { LANE_LINE_X } from "./utils.js";

export default function LaneLine({ lane, color }) {
  const x = LANE_LINE_X(lane);
  const half = ROW_HEIGHT / 2;

  return (
    <rect
      x={x}
      y={half}
      width={2}
      height={half + ROW_HEIGHT / 2}
      fill={color}
      opacity={1}
    />
  );
}
