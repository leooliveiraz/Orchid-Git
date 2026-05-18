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

function computeLayout(commits) {
  const oc = {};
  const lines = {};
  let nextLineId = 0;

  function occupy(row, depth) {
    if (!oc[row]) oc[row] = new Set();
    oc[row].add(depth);
  }

  function isFree(row, depth) {
    return !oc[row] || !oc[row].has(depth);
  }

  function firstFree(row, prefer) {
    for (let offset = 0; offset <= 50; offset++) {
      for (const d of [prefer + offset, prefer - offset]) {
        if (d >= 0 && isFree(row, d)) return d;
      }
    }
    return prefer;
  }

  commits.forEach((commit, index) => {
    if (index === 0) {
      const id = nextLineId++;
      lines[id] = { id, path: [{ row: 0, depth: 0 }] };
      commit.depth = 0;
      commit.lineId = id;
      occupy(0, 0);
    } else {
      const prev = commits[index - 1];

      if (prev.dad?.parentIndex === index) {
        commit.lineId = prev.lineId;
        let d = prev.depth;
        if (commit.sons?.length) {
          d = Math.min(...commit.sons.map(s => s.depth));
        }
        commit.depth = d;
        lines[commit.lineId].path.push({ row: index, depth: d });
        occupy(index, d);

      } else if (commit.sons?.length) {
        const minDepth = Math.min(...commit.sons.map(s => s.depth));
        const minSon = commit.sons.find(s => s.depth === minDepth);
        commit.lineId = minSon.lineId;
        commit.depth = minDepth;
        lines[commit.lineId].path.push({ row: index, depth: minDepth });
        occupy(index, minDepth);

      } else {
        const id = nextLineId++;
        const d = firstFree(index, 0);
        lines[id] = { id, path: [{ row: index, depth: d }] };
        commit.lineId = id;
        commit.depth = d;
        occupy(index, d);
      }
    }

    if (commit.dad) {
      for (let r = index + 1; r <= commit.dad.parentIndex; r++) {
        if (!isFree(r, commit.depth)) break;
        occupy(r, commit.depth);
        lines[commit.lineId].path.push({ row: r, depth: commit.depth });
      }
    }
  });

  return { lines };
}

export default function GitGraph({ commit, index, commitList }) {
  const { lines } = useMemo(() => computeLayout(commitList), [commitList]);
  const depth = commit.depth ?? 0;
  const maxDepth = Object.values(lines).reduce((m, l) => {
    const d = l.path.reduce((mx, p) => Math.max(mx, p.depth), 0);
    return Math.max(m, d);
  }, 0);
  const totalWidth = Math.max((Math.ceil(maxDepth) + 1) * LANE_WIDTH + 10, 40);

  return (
    <svg
      width={totalWidth}
      height={ROW_HEIGHT}
      className="git-graph-svg"
      style={{ overflow: "visible", display: "block" }}
    >
      <circle
        cx={depth * LANE_WIDTH + 6}
        cy={ROW_HEIGHT / 2}
        r={CIRCLE_R}
        fill={COLORS[Math.round(depth) % COLORS.length]}
        stroke="white"
        strokeWidth={2}
      />
    </svg>
  );
}
