import React from "react";
import { LANE_WIDTH, ROW_HEIGHT } from "./constants.js";
import { LANE_CENTER_X } from "./utils.js";

export default function DiagonalPath({ fromLane, toLane, color }) {
  const x1 = LANE_CENTER_X(fromLane);
  const y1 = 0;
  const x2 = LANE_CENTER_X(toLane);
  const y2 = ROW_HEIGHT;

  return (
    <path
      d={buildPath(x1, y1, x2, y2)}
      stroke={color}
      fill="none"
      strokeWidth={2}
      strokeLinecap="round"
    />
  );
}

export function buildPath(x1, y1, x2, y2) {
  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);

  if (dy <= 0) {
    return `M ${x1},${y1} L ${x2},${y2}`;
  }

  const midY = y1 + dy * 0.5;
  const cp1X = x1;
  const cp1Y = y1 + dy * 0.35;
  const cp2X = x2;
  const cp2Y = y2 - dy * 0.35;

  return `M ${x1},${y1} C ${cp1X},${cp1Y} ${cp2X},${cp2Y} ${x2},${y2}`;
}
