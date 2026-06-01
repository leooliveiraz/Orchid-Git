import React, { useRef, useCallback, useEffect, useState, useMemo } from "react";
import { Tooltip } from "@mui/material";

export default function CodeEditor({ value, onChange, filename, readOnly = false, height = "60vh", highlightLines, blameAnnotations, highlightRanges, highlightColor, onScroll, scrollContainerRef, scrollToLine, onDoubleClick, gutterActions, actionLines }) {
  const textareaRef = useRef(null);
  const gutterRef = useRef(null);
  const containerRef = useRef(null);
  const [lineCount, setLineCount] = useState(1);
  const internalScroll = useRef(0);
  const syncing = useRef(false);

  const lines = (value || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const lineCountForReal = lines.length;

  useEffect(() => {
    setLineCount(Math.max(lineCountForReal, 1));
  }, [lineCountForReal]);

  // Expose scroll container to parent
  useEffect(() => {
    if (scrollContainerRef) {
      const el = containerRef.current || textareaRef.current;
      if (el) scrollContainerRef(el);
    }
  }, [scrollContainerRef]);

  // Scroll to specific line when scrollToLine changes
  useEffect(() => {
    if (scrollToLine != null) {
      const el = containerRef.current || textareaRef.current;
      if (el) {
        const lineH = 19.5; // 13px * 1.5 lineHeight
        el.scrollTop = (scrollToLine - 1) * lineH;
      }
    }
  }, [scrollToLine]);

  const handleScroll = useCallback(() => {
    if (syncing.current) return;
    syncing.current = true;
    let st = 0;
    if (containerRef.current) st = containerRef.current.scrollTop;
    if (textareaRef.current && textareaRef.current.scrollTop !== st) textareaRef.current.scrollTop = st;
    if (gutterRef.current) gutterRef.current.scrollTop = st;
    if (internalScroll.current !== st) {
      internalScroll.current = st;
      onScroll?.(st);
    }
    requestAnimationFrame(() => { syncing.current = false; });
  }, [onScroll]);

  const highlightSet = new Set(highlightLines || []);
  const blameMap = useMemo(() => {
    const map = {};
    if (blameAnnotations) {
      for (const a of blameAnnotations) {
        if (a.lineNum != null) map[a.lineNum] = a;
      }
    }
    return map;
  }, [blameAnnotations]);

  const hasBlame = blameAnnotations && blameAnnotations.length > 0;

  const rangeBg = useMemo(() => {
    const map = {};
    const defaultColor = highlightColor || "rgba(255,193,7,0.2)";
    if (highlightRanges) {
      for (const r of highlightRanges) {
        if (r.startLine != null && r.endLine != null) {
          const color = r.color || defaultColor;
          for (let i = r.startLine; i <= r.endLine; i++) map[i] = color;
        }
      }
    }
    return map;
  }, [highlightRanges, highlightColor]);

  const displayLines = lines.length > 0 && lines[lines.length - 1] === "" ? lines.slice(0, -1) : lines;

  if (readOnly) {
    if (!hasBlame) {
      return (
        <div ref={containerRef} onScroll={handleScroll} style={{
          display: "flex", height,
          overflow: "auto", fontFamily: "monospace", fontSize: "13px", lineHeight: 1.5, padding: "8px 0"
        }}>
          <div style={{
            textAlign: "right",
            userSelect: "none",
            minWidth: 30,
            lineHeight: 1.5,
            flexShrink: 0,
          }}>
            {displayLines.map((_, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center",
                padding: "0 6px 0 8px",
                background: highlightSet.has(i + 1) ? "rgba(76, 175, 80, 0.45)" : (rangeBg[i + 1] || "transparent"),
                color: highlightSet.has(i + 1) ? "var(--diff-add-text)" : "var(--text-secondary)",
                fontWeight: highlightSet.has(i + 1) ? 600 : 400,
                width: "100%",
              }}>
                <span style={{ flex: 1, textAlign: "right" }}>{i + 1}</span>
                {gutterActions?.[i + 1] && (
                  <span style={{ marginLeft: 2, lineHeight: 1, display: "inline-flex", alignItems: "center" }}>{gutterActions[i + 1]}</span>
                )}
              </div>
            ))}
          </div>
          <div style={{ flex: 1, position: "relative", minWidth: 0 }}>
            <div className="linha-texto" style={{ lineHeight: 1.5 }}>
              {displayLines.map((line, i) => {
                const lineEl = (
                  <div key={i} onDoubleClick={() => onDoubleClick?.(i + 1)}
                    style={{
                    padding: "0 8px",
                    background: highlightSet.has(i + 1) ? "rgba(76, 175, 80, 0.35)" : (rangeBg[i + 1] || "transparent"),
                    whiteSpace: "pre",
                    fontFamily: "monospace",
                    fontSize: "13px",
                    width: "100%",
                    cursor: onDoubleClick ? "pointer" : undefined,
                  }}>
                    {line || "\u00A0"}
                  </div>
                );
                return rangeBg[i + 1] ? (
                  <Tooltip key={i} title="Double-click to accept" arrow placement="bottom">{lineEl}</Tooltip>
                ) : lineEl;
              })}
            </div>
            {actionLines && (
              <div style={{
                position: "absolute", left: 0, right: 0, top: 0, pointerEvents: "none",
                lineHeight: 1.5, zIndex: 2,
              }}>
                {displayLines.map((_, i) => (
                  <div key={i} style={{
                    pointerEvents: actionLines[i + 1] ? "auto" : "none",
                    minHeight: actionLines[i + 1] ? undefined : "1.5em",
                    padding: actionLines[i + 1] ? "0 8px" : undefined,
                  }}>
                    {actionLines[i + 1] || null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div ref={containerRef} onScroll={handleScroll} style={{ display: "flex", height, overflow: "auto", fontFamily: "monospace", fontSize: "13px", lineHeight: 1.5, padding: "8px 0" }}>
        <div style={{ lineHeight: 1.5, flexShrink: 0, fontFamily: "monospace", fontSize: "13px" }}>
          {displayLines.map((_, i) => {
            const anno = blameMap[i + 1];
            return (
              <div key={i} style={{ display: "flex" }}>
                {anno ? (
                  <>
                    <div style={{ padding: "0 4px", minWidth: 56, userSelect: "none", color: "primary.main", textAlign: "center" }}>
                      {(anno.hash || "").slice(0, 7)}
                    </div>
                    <div style={{ padding: "0 6px", minWidth: 90, userSelect: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {anno.author || ""}
                    </div>
                    <div style={{ padding: "0 6px", minWidth: 56, userSelect: "none", whiteSpace: "nowrap", color: "var(--text-secondary)" }}>
                      {anno.date || ""}
                    </div>
                  </>
                ) : (
                  <div style={{ minWidth: 202 }} />
                )}
                <div style={{
                  textAlign: "right", padding: "0 6px 0 8px", minWidth: 32, userSelect: "none",
                  background: highlightSet.has(i + 1) ? "rgba(76, 175, 80, 0.45)" : "transparent",
                  color: highlightSet.has(i + 1) ? "var(--diff-add-text)" : "var(--text-secondary)",
                  fontWeight: highlightSet.has(i + 1) ? 600 : 400,
                }}>
                  {i + 1}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{
          flex: 1,
          lineHeight: 1.5,
          minWidth: 0,
          width: "100%",
          position: "relative",
        }}>
          <div>
            {displayLines.map((line, i) => (
              <div key={i} onDoubleClick={() => onDoubleClick?.(i + 1)} style={{
                padding: "0 8px",
                background: highlightSet.has(i + 1) ? "rgba(76, 175, 80, 0.35)" : "transparent",
                whiteSpace: "pre",
                fontFamily: "monospace",
                fontSize: "13px",
                width: "100%",
                cursor: onDoubleClick ? "pointer" : undefined,
              }}>
                {line || "\u00A0"}
              </div>
            ))}
          </div>
          {actionLines && (
            <div style={{
              position: "absolute", left: 0, right: 0, top: 0, pointerEvents: "none",
              lineHeight: 1.5, zIndex: 2,
            }}>
              {displayLines.map((_, i) => (
                <div key={i} style={{
                  pointerEvents: actionLines[i + 1] ? "auto" : "none",
                  minHeight: actionLines[i + 1] ? undefined : "1.5em",
                  padding: actionLines[i + 1] ? "0 8px" : undefined,
                }}>
                  {actionLines[i + 1] || null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const handleDblClick = useCallback((e) => {
    const textarea = e.currentTarget;
    const pos = textarea.selectionStart;
    const text = textarea.value || "";
    const lineNum = text.substring(0, pos).split("\n").length;
    onDoubleClick?.(lineNum);
  }, [onDoubleClick]);

  const editorId = filename ? `ce-${filename.replace(/[^a-zA-Z0-9]/g, "-")}` : "ce";

  return (
    <div id={editorId} style={{ display: "flex", height, overflow: "hidden", fontFamily: "monospace", fontSize: "13px", lineHeight: 1.5 }}>
      <div id={`${editorId}-gutter`} ref={gutterRef} style={{
        overflow: "hidden",
        padding: "8px 6px 8px 8px",
        color: "var(--text-secondary)",
        userSelect: "none",
        minWidth: 30,
        lineHeight: 1.5,
      }}>
        {Array.from({ length: lineCount }, (_, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center",
            background: highlightSet.has(i + 1) ? "rgba(76, 175, 80, 0.45)" : "transparent",
            color: highlightSet.has(i + 1) ? "var(--diff-add-text)" : "inherit",
            fontWeight: highlightSet.has(i + 1) ? 600 : 400,
          }}>
            <span style={{ flex: 1, textAlign: "right" }}>{i + 1}</span>
            {gutterActions?.[i + 1] && (
              <span style={{ marginLeft: 2, lineHeight: 1, display: "inline-flex", alignItems: "center" }}>{gutterActions[i + 1]}</span>
            )}
          </div>
        ))}
      </div>
      <div id={`${editorId}-scroll`} ref={containerRef} onScroll={handleScroll} style={{
        flex: 1, overflow: "auto", position: "relative", minWidth: 0,
      }}>
        <div id={`${editorId}-lines`} style={{ padding: "8px 8px 8px 4px", lineHeight: 1.5, fontFamily: "inherit", fontSize: "inherit" }}>
          {lines.map((line, i) => (
            <div key={i} id={`${editorId}-L${i + 1}`}
              title={rangeBg[i + 1] ? "Double-click to accept" : undefined}
              style={{
              background: highlightSet.has(i + 1) ? "rgba(76, 175, 80, 0.35)" : (rangeBg[i + 1] || "transparent"),
              whiteSpace: "pre", minHeight: "1.5em", color: "inherit",
            }}>
              {line || "\u00A0"}
            </div>
          ))}
        </div>
        {actionLines && (
          <div id={`${editorId}-actions`} style={{
            position: "absolute", left: 0, right: 0, top: 0, pointerEvents: "none",
            padding: "8px 8px 8px 4px", lineHeight: 1.5, zIndex: 2,
          }}>
            {lines.map((_, i) => (
              <div key={i} id={`${editorId}-A${i + 1}`} style={{
                pointerEvents: actionLines[i + 1] ? "auto" : "none",
                minHeight: actionLines[i + 1] ? undefined : "1.5em",
              }}>
                {actionLines[i + 1] || null}
              </div>
            ))}
          </div>
        )}
        <textarea
          id={`${editorId}-textarea`}
          ref={textareaRef}
          value={value || ""}
          onChange={e => { onChange?.(e.target.value); setLineCount(e.target.value.split("\n").length); }}
          onDoubleClick={handleDblClick}
          readOnly={readOnly}
          spellCheck={false}
          style={{
            position: "absolute", left: 0, top: 0, width: "100%", height: "100%",
            fontFamily: "inherit", fontSize: "inherit", lineHeight: 1.5,
            resize: "none", border: "none", outline: "none",
            padding: "8px 8px 8px 4px", background: "transparent",
            color: "inherit", tabSize: 2, overflow: "hidden", whiteSpace: "pre",
          }}
        />
      </div>
    </div>
  );
}
