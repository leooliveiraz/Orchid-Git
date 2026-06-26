import React from "react";
import { LANE_WIDTH, ROW_HEIGHT } from "./constants.js";
import { LANE_LINE_X } from "./utils.js";

const half = ROW_HEIGHT / 2;
export default function LaneLine({ lane, color }) {
  const x = LANE_LINE_X(lane);

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
