import React from "react";
import { LANE_WIDTH, ROW_HEIGHT } from "./constants.js";
import { LANE_LINE_X } from "./utils.js";

const half = ROW_HEIGHT / 2;
const height = ROW_HEIGHT + 12;
export default function LaneLine({ lane, color }) {
  const x = LANE_LINE_X(lane);

  return (
    <rect
      className="LaneLine"
      x={x}
      y={half}
      width={2}
      height={height}
      fill={color}
      opacity={1}
    />
  );
}
