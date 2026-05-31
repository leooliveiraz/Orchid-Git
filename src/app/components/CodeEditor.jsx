import React, { useRef, useCallback, useEffect, useState, useMemo } from "react";

export default function CodeEditor({ value, onChange, filename, readOnly = false, height = "60vh", highlightLines, blameAnnotations, highlightRanges, onScroll, scrollContainerRef, scrollToLine }) {
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
    if (textareaRef.current) st = textareaRef.current.scrollTop;
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
    if (highlightRanges) {
      for (const r of highlightRanges) {
        if (r.startLine != null && r.endLine != null) {
          for (let i = r.startLine; i <= r.endLine; i++) map[i] = "rgba(255,193,7,0.2)";
        }
      }
    }
    return map;
  }, [highlightRanges]);

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
                padding: "0 6px 0 8px",
                background: highlightSet.has(i + 1) ? "rgba(76, 175, 80, 0.45)" : (rangeBg[i + 1] || "transparent"),
                color: highlightSet.has(i + 1) ? "var(--diff-add-text)" : "var(--text-secondary)",
                fontWeight: highlightSet.has(i + 1) ? 600 : 400,
                width: "100%",
              }}>
                {i + 1}
              </div>
            ))}
          </div>
          <div className="linha-texto" style={{
            flex: 1,
            lineHeight: 1.5,
          }}>
            {displayLines.map((line, i) => (
              <div key={i} style={{
                padding: "0 8px",
                background: highlightSet.has(i + 1) ? "rgba(76, 175, 80, 0.35)" : (rangeBg[i + 1] || "transparent"),
                whiteSpace: "pre",
                fontFamily: "monospace",
                fontSize: "13px",
                width: "100%",
              }}>
                {line || "\u00A0"}
              </div>
            ))}
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
        }}>
          {displayLines.map((line, i) => (
            <div key={i} style={{
              padding: "0 8px",
              background: highlightSet.has(i + 1) ? "rgba(76, 175, 80, 0.35)" : "transparent",
              whiteSpace: "pre",
              fontFamily: "monospace",
              fontSize: "13px",
              width: "100%",
            }}>
              {line || "\u00A0"}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height, overflow: "hidden", fontFamily: "monospace", fontSize: "13px", lineHeight: 1.5, position: "relative" }}>
      <div ref={gutterRef} style={{
        overflow: "hidden",
        textAlign: "right",
        padding: "8px 6px 8px 8px",
        color: "var(--text-secondary)",
        userSelect: "none",
        minWidth: 30,
        lineHeight: 1.5,
      }}>
        {Array.from({ length: lineCount }, (_, i) => (
          <div key={i} style={{
            background: highlightSet.has(i + 1) ? "rgba(76, 175, 80, 0.45)" : "transparent",
            color: highlightSet.has(i + 1) ? "var(--diff-add-text)" : "inherit",
            fontWeight: highlightSet.has(i + 1) ? 600 : 400,
          }}>
            {i + 1}
          </div>
        ))}
      </div>
      <div style={{
        position: "absolute",
        left: 0, right: 0, top: 0, bottom: 0,
        pointerEvents: "none",
        padding: "8px 8px 8px 4px",
        lineHeight: 1.5,
        fontFamily: "inherit",
        fontSize: "inherit",
        color: "transparent",
        overflow: "hidden",
      }}>
        {lines.map((line, i) => (
          <div key={i} style={{
            background: highlightSet.has(i + 1) ? "rgba(76, 175, 80, 0.3)" : "transparent",
            whiteSpace: "pre",
            width: "100%",
          }}>
            {line || "\u00A0"}
          </div>
        ))}
      </div>
      <textarea
        ref={textareaRef}
        value={value || ""}
        onChange={e => { onChange?.(e.target.value); setLineCount(e.target.value.split("\n").length); }}
        onScroll={handleScroll}
        readOnly={readOnly}
        spellCheck={false}
        style={{
          flex: 1,
          height: "100%",
          fontFamily: "inherit",
          fontSize: "inherit",
          lineHeight: 1.5,
          resize: "none",
          border: "none",
          outline: "none",
          padding: "8px 8px 8px 4px",
          background: "transparent",
          color: "inherit",
          tabSize: 2,
          overflow: "auto",
          position: "relative",
        }}
      />
    </div>
  );
}
