import React, { useRef, useCallback, useEffect, useState } from "react";

export default function CodeEditor({ value, onChange, filename, readOnly = false, height = "60vh" }) {
  const textareaRef = useRef(null);
  const gutterRef = useRef(null);
  const [lineCount, setLineCount] = useState(1);

  const updateLineCount = useCallback(() => {
    const lines = (value || "").split("\n").length;
    setLineCount(Math.max(lines, 1));
  }, [value]);

  useEffect(() => {
    updateLineCount();
  }, [updateLineCount]);

  const handleScroll = useCallback(() => {
    if (gutterRef.current && textareaRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  return (
    <div style={{ display: "flex", height, overflow: "hidden", fontFamily: "monospace", fontSize: "13px", lineHeight: 1.5 }}>
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
          <div key={i}>{i + 1}</div>
        ))}
      </div>
      <textarea
        ref={textareaRef}
        value={value || ""}
        onChange={e => { onChange?.(e.target.value); updateLineCount(); }}
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
        }}
      />
    </div>
  );
}
