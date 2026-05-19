import React, { useMemo } from "react";
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

const PATH_FUNCS = { bezier: bezierPath, angular: angularPath, straight: straightPath };

function computeLanes(commits) {
  const lanesAtRow = {};
  commits.forEach((commit, index) => {
    if (!lanesAtRow[index]) lanesAtRow[index] = new Set();
    lanesAtRow[index].add(commit.depth);

    if (commit.merge) {
      const mp = commits[commit.merge.parentIndex];
      const mpDepth = mp ? mp.depth : null;
      if (mpDepth === commit.depth) {
        for (let r = index; r <= commit.merge.parentIndex; r++) {
          if (!lanesAtRow[r]) lanesAtRow[r] = new Set();
          lanesAtRow[r].add(mpDepth);
        }
      }
    }
  });

  commits.forEach((commit, index) => {
    if (!commit.dad) return;
    const pDepth = commits[commit.dad.parentIndex]?.depth;
    const endRow = pDepth === commit.depth ? commit.dad.parentIndex : index;
    for (let r = index; r <= endRow; r++) {
      if (!lanesAtRow[r]) lanesAtRow[r] = new Set();
      lanesAtRow[r].add(commit.depth);
    }
    if (pDepth !== commit.depth && pDepth != null) {
      if (!lanesAtRow[commit.dad.parentIndex]) lanesAtRow[commit.dad.parentIndex] = new Set();
      lanesAtRow[commit.dad.parentIndex].add(pDepth);
    }
  });

  const sorted = {};
  for (const k in lanesAtRow) {
    sorted[k] = [...lanesAtRow[k]].sort((a, b) => a - b);
  }
  return sorted;
}

export default function GitGraph({ commit, index, commitList, connectionStyle }) {
  const lanesAtRow = useMemo(() => computeLanes(commitList), [commitList]);
  const activeLanes = lanesAtRow[index] || [];
  const depth = commit.depth ?? 0;
  const maxDepth = commitList.reduce((m, c) => Math.max(m, c.depth ?? 0), 0);
  const totalWidth = Math.max((maxDepth + 1) * LANE_WIDTH + 10, 40);
  const color = COLORS[depth % COLORS.length];
  const pathFn = PATH_FUNCS[connectionStyle] || PATH_FUNCS.bezier;

  const parentDepth = commit.dad?.parentIndex != null
    ? (commitList[commit.dad.parentIndex]?.depth ?? null)
    : null;

  const mergeDepth = commit.merge?.parentIndex != null
    ? (commitList[commit.merge.parentIndex]?.depth ?? null)
    : null;

  function cx(d) { return d * LANE_WIDTH + 6; }

  return (
    <svg
      width={totalWidth}
      height={ROW_HEIGHT}
      className="git-graph-svg"
      style={{ overflow: "visible", display: "block" }}
    >
      {activeLanes.map(d => (
        <rect
          key={"ln" + d}
          x={d * LANE_WIDTH + 5}
          y={0}
          width={2}
          height={ROW_HEIGHT}
          fill="#d0d0d0"
          rx={1}
        />
      ))}

      {commit.dad && parentDepth != null && parentDepth !== depth && (
        <path
          d={pathFn(
            cx(depth), ROW_HEIGHT / 2,
            (commit.dad.parentDistance - 1) * ROW_HEIGHT,
            cx(parentDepth), ROW_HEIGHT / 2 + commit.dad.parentDistance * ROW_HEIGHT
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
            (commit.merge.parentDistance - 1) * ROW_HEIGHT,
            cx(mergeDepth), ROW_HEIGHT / 2 + commit.merge.parentDistance * ROW_HEIGHT
          )}
          stroke={COLORS[mergeDepth % COLORS.length]}
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
