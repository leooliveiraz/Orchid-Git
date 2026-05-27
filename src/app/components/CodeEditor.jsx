import React, { useEffect, useRef } from "react";
import { EditorView, lineNumbers, highlightActiveLineGutter, keymap } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { defaultHighlightStyle, syntaxHighlighting, indentOnInput, bracketMatching } from "@codemirror/language";
import { defaultKeymap, history, indentWithTab } from "@codemirror/commands";
import { javascript } from "@codemirror/lang-javascript";

function getLanguage(filename) {
  if (/\.(js|jsx|ts|tsx|mjs|cjs)$/.test(filename)) return javascript();
  return [];
}

const monokaiTheme = EditorView.theme({
  "&": { backgroundColor: "#272822", color: "#f8f8f2", fontSize: "13px", fontFamily: "Consolas, monospace" },
  ".cm-cursor": { borderLeftColor: "#f8f8f2" },
  ".cm-activeLine": { backgroundColor: "#3e3d32" },
  ".cm-activeLineGutter": { backgroundColor: "#3e3d32" },
  ".cm-gutters": { backgroundColor: "#272822", color: "#888", border: "none" },
  ".cm-lineNumbers .cm-gutterElement": { color: "#888", padding: "0 3px 0 6px", fontSize: "12px" },
  ".cm-selectionBackground, .cm-focused .cm-selectionBackground": { backgroundColor: "#49483e" },
  ".cm-matchingBracket": { backgroundColor: "#49483e", outline: "1px solid #f8f8f2" },
  ".cm-foldPlaceholder": { backgroundColor: "#49483e", color: "#f8f8f2", border: "none" },
}, { dark: true });

export default function CodeEditor({ value, onChange, filename, readOnly = false, height = "60vh" }) {
  const containerRef = useRef(null);
  const viewRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const extensions = [
      lineNumbers(),
      highlightActiveLineGutter(),
      history(),
      indentOnInput(),
      bracketMatching(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      monokaiTheme,
      keymap.of([...defaultKeymap, indentWithTab]),
      EditorView.editable.of(!readOnly),
      EditorView.updateListener.of(update => {
        if (update.docChanged && onChange) {
          onChange(update.state.doc.toString());
        }
      }),
    ];

    const lang = getLanguage(filename);
    if (lang) extensions.push(lang);

    const state = EditorState.create({ doc: value || "", extensions });
    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    return () => view.destroy();
  }, [filename, readOnly]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || readOnly) return;
    const current = view.state.doc.toString();
    if (value !== current) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value || "" },
      });
    }
  }, [value, readOnly]);

  return <div ref={containerRef} style={{ height, overflow: "auto", textAlign: "left" }} />;
}
