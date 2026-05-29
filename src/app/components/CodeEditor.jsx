import React, { useRef, useCallback, useEffect, useState } from "react";

export default function CodeEditor({ value, onChange, filename, readOnly = false, height = "60vh", highlightLines }) {
  const textareaRef = useRef(null);
  const gutterRef = useRef(null);
  const [lineCount, setLineCount] = useState(1);

  const lines = (value || "").split("\n");
  const lineCountForReal = lines.length;

  useEffect(() => {
    setLineCount(Math.max(lineCountForReal, 1));
  }, [lineCountForReal]);

  const handleScroll = useCallback(() => {
    if (gutterRef.current && textareaRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  const highlightSet = new Set(highlightLines || []);

  if (readOnly) {
    return (
      <div style={{ display: "flex", height, overflow: "auto", fontFamily: "monospace", fontSize: "13px", lineHeight: 1.5 }}>
        <div style={{
          textAlign: "right",
          userSelect: "none",
          minWidth: 30,
          lineHeight: 1.5,
          flexShrink: 0,
        }}>
          {lines.map((_, i) => (
            <div key={i} style={{
              padding: "0 6px 0 8px",
              background: highlightSet.has(i + 1) ? "rgba(76, 175, 80, 0.35)" : "transparent",
              color: highlightSet.has(i + 1) ? "#81c784" : "var(--text-secondary)",
              fontWeight: highlightSet.has(i + 1) ? 600 : 400,
            }}>
              {i + 1}
            </div>
          ))}
        </div>
        <div style={{
          flex: 1,
          lineHeight: 1.5,
          minWidth: 0,
        }}>
          {lines.map((line, i) => (
            <div key={i} style={{
              padding: "0 8px",
              background: highlightSet.has(i + 1) ? "rgba(76, 175, 80, 0.25)" : "transparent",
              whiteSpace: "pre-wrap",
              fontFamily: "inherit",
              fontSize: "inherit",
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
            background: highlightSet.has(i + 1) ? "rgba(76, 175, 80, 0.35)" : "transparent",
            color: highlightSet.has(i + 1) ? "#81c784" : "inherit",
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
            background: highlightSet.has(i + 1) ? "rgba(76, 175, 80, 0.2)" : "transparent",
            whiteSpace: "pre-wrap",
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
