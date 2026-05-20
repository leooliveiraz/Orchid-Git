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

  function parseLabels(decoration) {
    if (!decoration) return [];
    const rawLabels = [];
    const parts = decoration.split(", ");
    for (const part of parts) {
      const t = part.trim();
      if (!t) continue;
      if (t.startsWith("HEAD -> ")) { rawLabels.push({ type: "head", name: t.slice(8) }); }
      else if (t.startsWith("tag: ")) { rawLabels.push({ type: "tag", name: t.slice(5) }); }
      else if (t.startsWith("HEAD")) { /* skip */ }
      else if (t.startsWith("origin/")) { rawLabels.push({ type: "remote", name: t.slice(7) }); }
      else { rawLabels.push({ type: "branch", name: t }); }
    }
    const remoteNames = new Set(
      rawLabels.filter(l => l.type === "remote").map(l => l.name)
    );
    const merged = [];
    const seen = new Set();
    for (const label of rawLabels) {
      if (label.type === "remote") {
        if (remoteNames.has(label.name) && rawLabels.some(l => l.type !== "remote" && l.name === label.name)) continue;
        const key = `remote:${label.name}`;
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(label);
      } else {
        const key = `${label.type}:${label.name}`;
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push({ ...label, hasRemote: remoteNames.has(label.name) });
      }
    }
    return merged;
  }

  const labels = parseLabels(commit?.decoration);
  const maxLabels = 2;
  const labelWidths = labels.slice(0, maxLabels).map(l => (l.name.length + (l.hasRemote ? 2 : 0)) * 6 + 16);
  const totalLabelWidth = labelWidths.reduce((s, w) => s + w + 6, 0) - 6;
  const svgWidth = totalWidth + (labels.length ? totalLabelWidth + 10 : 0);
  const labelStart = totalWidth + 2;

  return (
    <svg
      width={svgWidth}
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

      {labels.slice(0, maxLabels).map((label, i) => {
        const hasIcon = label.hasRemote;
        const labelWidth = (label.name.length + (hasIcon ? 2 : 0)) * 6 + 16;
        const cx = labelStart + (i * (labelWidth + 6)) + labelWidth / 2;
        return (
          <g key={i}>
            <rect
              x={cx - labelWidth / 2}
              y={ROW_HEIGHT / 2 - 7}
              width={labelWidth}
              height={14}
              rx={7}
              fill={color}
            />
            <text
              x={cx - (hasIcon ? 4 : 0)}
              y={ROW_HEIGHT / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={9}
              fill="#fff"
              fontFamily="monospace"
              fontWeight={label.type === "head" ? 700 : 400}
            >
              {label.name}
            </text>
            {hasIcon && (
              <text
                x={cx + label.name.length * 3 + 3}
                y={(ROW_HEIGHT / 2) + 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={13}
                fill="#fff"
                opacity={0.85}
              >
                ☁
              </text>
            )}
          </g>
        );
      })}
      {labels.length > maxLabels && (
        <g>
          <title>{labels.slice(maxLabels).map(l => l.name).join(", ")}</title>
          <rect
            x={labelStart + labelWidths.reduce((s, w) => s + w + 6, 0)}
            y={ROW_HEIGHT / 2 - 7}
            width={labels.length > maxLabels ? 24 : 0}
            height={14}
            rx={7}
            fill={color}
            opacity={0.7}
            style={{ cursor: "pointer" }}
          />
          <text
            x={labelStart + labelWidths.reduce((s, w) => s + w + 6, 0) + 12}
            y={ROW_HEIGHT / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={9}
            fill="#fff"
            fontFamily="monospace"
            style={{ cursor: "pointer" }}
            pointerEvents="none"
          >
            +{labels.length - maxLabels}
          </text>
        </g>
      )}
    </svg>
  );
}
