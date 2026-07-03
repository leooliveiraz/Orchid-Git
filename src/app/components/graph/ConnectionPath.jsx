import React from "react";
import { LANE_WIDTH, ROW_HEIGHT, ROW_HEIGHT_TOTAL, ROW_BORDER, STROKE_W } from "./constants.js";
import { LANE_CENTER_X } from "./utils.js";

const y1 = ROW_HEIGHT_TOTAL / 2;
const y2 = ROW_HEIGHT_TOTAL + (ROW_HEIGHT_TOTAL / 2);
export default function ConnectionPath({ fromLane, toLane, color, fromHash, toHash }) {
  const x1 = LANE_CENTER_X(fromLane);
  const x2 = LANE_CENTER_X(toLane);

  return (
    <path
      className="ConnectionPath"
      d={buildPath(x1, y1, x2, y2)}
      stroke={color}
      fill="none"
      strokeWidth={STROKE_W}
      strokeLinecap="round"
    >
      <title>{fromHash || "?"} → {toHash || "?"}</title>
    </path>
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

  return `M ${x1},${y1} ${x2},${y2}`;
}
