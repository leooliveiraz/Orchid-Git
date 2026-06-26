import React from "react";
import { CIRCLE_R, ROW_HEIGHT, LANE_WIDTH, STROKE_W } from "./constants.js";

const cy = ROW_HEIGHT / 2;
export default function CommitCircle({ lane, color }) {
  const cx = lane * LANE_WIDTH + LANE_WIDTH / 2;

  return (
    <circle
      cx={cx}
      cy={cy}
      r={CIRCLE_R}
      fill={color}
      stroke="var(--graph-bg, #fff)"
      strokeWidth={STROKE_W}
    />
  );
}
