import React from "react";
import "./GitGraph.css";

const LANE_WIDTH = 14;
const ROW_HEIGHT = 24;
const CIRCLE_R = 5;

const COLORS = [
  "#2D3AC9", "#B041FD", "#FD63CE", "#FD3C2F",
  "#FC9E25", "#FAFF90", "#3B8C33", "#00BCD4",
  "#FF5722", "#607D8B", "#795548", "#9C27B0",
];

export default function GitGraph({ commit, index }) {
  const color = COLORS[(commit.depth ?? 0) % COLORS.length];

  return (
    <svg
      width={40}
      height={ROW_HEIGHT}
      className="git-graph-svg"
      style={{ overflow: "visible", display: "block" }}
    >
      <circle
        cx={(commit.depth ?? 0) * LANE_WIDTH + 6}
        cy={ROW_HEIGHT / 2}
        r={CIRCLE_R}
        fill={color}
        stroke="white"
        strokeWidth={2}
      />
    </svg>
  );
}
