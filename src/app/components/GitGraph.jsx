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

function bezierPath(x1, y1, vDist, x2, y2) {
  if (vDist <= 0) {
    const dy = Math.abs(y2 - y1) * 0.3;
    return `M ${x1},${y1} C ${x1},${y1 + dy} ${x2},${y2 - dy} ${x2},${y2}`;
  }
  const midY = y1 + vDist;
  const dy = Math.abs(y2 - midY) * 0.3;
  return `M ${x1},${y1} v ${vDist} C ${x1},${midY + dy} ${x2},${y2 - dy} ${x2},${y2}`;
}

function angularPath(x1, y1, vDist, x2, y2) {
  if (vDist <= 0) return `M ${x1},${y1} L ${x2},${y2}`;
  return `M ${x1},${y1} L ${x1},${y1 + vDist} L ${x2},${y2}`;
}

function straightPath(x1, y1, vDist, x2, y2) {
  return `M ${x1},${y1} L ${x2},${y2}`;
}

function stepPath(x1, y1, vDist, x2, y2) {
  if (vDist <= 0) return `M ${x1},${y1} L ${x2},${y2}`;
  const turnY = (y1 + vDist + y2) / 2;
  return `M ${x1},${y1} L ${x1},${turnY} L ${x2},${turnY} L ${x2},${y2}`;
}

function teardropPath(x1, y1, vDist, x2, y2) {
  if (vDist <= 0) {
    const dy = Math.abs(y2 - y1) * 0.15;
    return `M ${x1},${y1} C ${x1},${y1 + dy} ${x2},${y2 - dy} ${x2},${y2}`;
  }
  const midY = y1 + vDist;
  const dy = Math.abs(y2 - midY) * 0.15;
  return `M ${x1},${y1} v ${vDist} C ${x1},${midY + dy} ${x2},${y2 - dy} ${x2},${y2}`;
}

function roundedPath(x1, y1, vDist, x2, y2) {
  if (vDist <= 0) {
    const dy = Math.abs(y2 - y1) * 0.5;
    return `M ${x1},${y1} C ${x1},${y1 + dy} ${x2},${y2 - dy} ${x2},${y2}`;
  }
  const midY = y1 + vDist;
  const dy = Math.abs(y2 - midY) * 0.5;
  return `M ${x1},${y1} v ${vDist} C ${x1},${midY + dy * 1.5} ${x2},${y2 - dy * 0.5} ${x2},${y2}`;
}

function elbowPath(x1, y1, vDist, x2, y2) {
  if (vDist <= 0) return `M ${x1},${y1} L ${x2},${y2}`;
  const turnY = y1 + vDist * 0.3;
  return `M ${x1},${y1} L ${x1},${turnY} L ${x2},${turnY} L ${x2},${y2}`;
}

const PATH_FUNCS = {
  bezier: bezierPath, angular: angularPath, straight: straightPath,
  step: stepPath, teardrop: teardropPath, rounded: roundedPath, elbow: elbowPath
};

export default function GitGraph({ commit, index, commitList, connectionStyle, lanesAtRow, maxDepth }) {
  const activeLanes = lanesAtRow?.[index] || [];
  const depth = Number.isFinite(commit?.depth) ? commit.depth : 0;
  const safeMaxDepth = Number.isFinite(maxDepth) ? maxDepth : 0;
  const totalWidth = Math.max((safeMaxDepth + 1) * LANE_WIDTH + 10, 40);
  const color = COLORS[depth % COLORS.length];
  const pathFn = PATH_FUNCS[connectionStyle] || PATH_FUNCS.bezier;
  const hasSonAtDepth = commit.sons?.some(s => Number.isFinite(s.depth) && s.depth === depth);

  const parentDepth = commit.dad?.parentIndex != null && Number.isFinite(commitList[commit.dad.parentIndex]?.depth)
    ? commitList[commit.dad.parentIndex].depth
    : null;

  const mergeDepth = commit.merge?.parentIndex != null && Number.isFinite(commitList[commit.merge.parentIndex]?.depth)
    ? commitList[commit.merge.parentIndex].depth
    : null;

  function cx(d) { return Number.isFinite(d) ? d * LANE_WIDTH + 6 : 6; }

  const pd = commit.dad?.parentDistance;
  const safePd = Number.isFinite(pd) ? pd : 0;
  const mpd = commit.merge?.parentDistance;
  const safeMpd = Number.isFinite(mpd) ? mpd : 0;

  return (
    <svg
      width={totalWidth}
      height={ROW_HEIGHT}
      className="git-graph-svg"
      style={{ overflow: "visible", display: "block", position: "relative", zIndex: 10 }}
    >
      {activeLanes.map(d => (
        <rect
          key={"ln" + d}
          x={d * LANE_WIDTH + 5}
          y={d === depth ? (hasSonAtDepth ? 0 : ROW_HEIGHT / 2 - CIRCLE_R) : 0}
          width={2}
          height={d === depth ? (hasSonAtDepth ? ROW_HEIGHT + 1 : ROW_HEIGHT / 2 + CIRCLE_R + 1) : ROW_HEIGHT + 1}
          fill={COLORS[d % COLORS.length]}
          opacity={0.5}
        />
      ))}

      {commit.dad && parentDepth != null && parentDepth !== depth && (
        <path
          d={pathFn(
            cx(depth), ROW_HEIGHT / 2,
            (safePd - 1) * ROW_HEIGHT,
            cx(parentDepth), ROW_HEIGHT / 2 + safePd * ROW_HEIGHT
          )}
          stroke={color}
          fill="none"
          strokeWidth={2}
          strokeLinecap="round"
        />
      )}

      {commit.merge && mergeDepth != null && mergeDepth !== depth && (
        <path
          d={pathFn(
            cx(depth), ROW_HEIGHT / 2,
            (safeMpd - 1) * ROW_HEIGHT,
            cx(mergeDepth), ROW_HEIGHT / 2 + safeMpd * ROW_HEIGHT
          )}
          stroke={color}
          fill="none"
          strokeWidth={2}
          strokeLinecap="round"
        />
      )}

      <circle
        cx={cx(depth)}
        cy={ROW_HEIGHT / 2}
        r={CIRCLE_R}
        fill={color}
        stroke="white"
        strokeWidth={2}
      />
    </svg>
  );
}
