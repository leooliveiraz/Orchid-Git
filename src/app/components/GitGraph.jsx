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

function bezierPath(x1, y1, x2, y2) {
  const dy = Math.abs(y2 - y1) * 0.4;
  return `M ${x1},${y1} C ${x1},${y1 + dy} ${x2},${y2 - dy} ${x2},${y2}`;
}

function computeLayout(commits) {
  commits.forEach((commit, index) => {
    if (index === 0) {
      commit.depth = 0;
    } else {
      const prev = commits[index - 1];
      if (prev.dad?.parentIndex === index) {
        commit.depth = prev.depth;
        if (commit.sonsNumber > 0 || commit.sonsMergeNumber > 0) {
          const depths = [];
          if (commit.sons) commit.sons.forEach(s => depths.push(s.depth));
          if (commit.sonsMerge) commit.sonsMerge.forEach(s => depths.push(s.depth));
          commit.depth = Math.min(...depths);
        }
      } else if (commit.sonsNumber > 0 || commit.sonsMergeNumber > 0) {
        const depths = [];
        if (commit.sons) commit.sons.forEach(s => depths.push(s.depth));
        if (commit.sonsMerge) commit.sonsMerge.forEach(s => depths.push(s.depth));
        commit.depth = Math.min(...depths);
      } else {
        let max = 0;
        for (let j = 0; j < index; j++) {
          if ((commits[j].depth ?? 0) > max) max = commits[j].depth ?? 0;
        }
        commit.depth = max + 1;
      }
    }
  });

  const lanesAtRow = {};
  commits.forEach((commit, index) => {
    if (commit.dad) {
      for (let r = index; r <= commit.dad.parentIndex; r++) {
        if (!lanesAtRow[r]) lanesAtRow[r] = new Set();
        lanesAtRow[r].add(commit.depth);
      }
    }
    if (commit.merge) {
      for (let r = index; r <= commit.merge.parentIndex; r++) {
        if (!lanesAtRow[r]) lanesAtRow[r] = new Set();
        lanesAtRow[r].add(commit.depth);
      }
    }
  });

  const sorted = {};
  for (const k in lanesAtRow) sorted[k] = [...lanesAtRow[k]].sort((a, b) => a - b);

  const maxDepth = commits.reduce((m, c) => Math.max(m, c.depth ?? 0), 0);

  return { maxDepth, lanesAtRow: sorted };
}

export default function GitGraph({ commit, index, commitList }) {
  const layout = useMemo(() => computeLayout(commitList), [commitList]);
  const activeLanes = layout.lanesAtRow[index] || [];
  const totalWidth = Math.max((layout.maxDepth + 1) * LANE_WIDTH + 10, 60);
  const color = COLORS[commit.depth % COLORS.length];

  function cx(d) { return d * LANE_WIDTH + 6; }

  const parentDepth = commit.dad?.parentIndex != null
    ? (commitList[commit.dad.parentIndex]?.depth ?? commit.depth)
    : null;

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

      {commit.dad && parentDepth != null && parentDepth !== commit.depth && (
        <path
          d={bezierPath(
            cx(commit.depth), ROW_HEIGHT / 2,
            cx(parentDepth), ROW_HEIGHT / 2 + commit.dad.parentDistance * ROW_HEIGHT
          )}
          stroke={color}
          fill="none"
          strokeWidth={2}
          strokeLinecap="round"
        />
      )}

      {commit.merge && commit.merge.parentIndex != null && (
        (() => {
          const mp = commitList[commit.merge.parentIndex];
          if (!mp) return null;
          const mpDepth = mp.depth;
          if (mpDepth == null || mpDepth === commit.depth) return null;
          return (
            <path
              d={bezierPath(
                cx(commit.depth), ROW_HEIGHT / 2,
                cx(mpDepth), ROW_HEIGHT / 2 + commit.merge.parentDistance * ROW_HEIGHT
              )}
              stroke={COLORS[mpDepth % COLORS.length]}
              fill="none"
              strokeWidth={2}
              strokeLinecap="round"
            />
          );
        })()
      )}

      <circle
        cx={cx(commit.depth)}
        cy={ROW_HEIGHT / 2}
        r={CIRCLE_R}
        fill={color}
        stroke="white"
        strokeWidth={2}
      />
    </svg>
  );
}
