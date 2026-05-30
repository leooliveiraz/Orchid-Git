import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog, DialogTitle, DialogContent,
  Typography, Box, Button, ToggleButtonGroup, ToggleButton, IconButton, Alert,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CodeEditor from "./CodeEditor.jsx";
import FileHistoryDialog from "./FileHistoryDialog.jsx";

export default function FileViewDialog({ directory, fileName, commitHash, onClose }) {
  const [tab, setTab] = useState("view");
  const [content, setContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [diffContent, setDiffContent] = useState("");
  const [historyDialog, setHistoryDialog] = useState(false);
  const [gitDiffLines, setGitDiffLines] = useState([]);

  useEffect(() => {
    if (commitHash || !window.api) return;
    window.api.getDiffLines(directory, fileName)
      .then(lines => setGitDiffLines(lines || []))
      .catch(() => { });
  }, [directory, fileName, commitHash]);

  const highlightLines = useMemo(() => {
    const set = new Set(gitDiffLines || []);
    if (originalContent !== content) {
      const orig = originalContent.split("\n");
      const curr = content.split("\n");
      const max = Math.max(orig.length, curr.length);
      for (let i = 0; i < max; i++) {
        if (orig[i] !== curr[i]) set.add(i + 1);
      }
    }
    return [...set].sort((a, b) => a - b);
  }, [originalContent, content, gitDiffLines]);

  useEffect(() => {
    if (!directory || !window.api) return;
    setLoading(true);
    (commitHash
      ? window.api.getFileAtCommit(directory, commitHash, fileName)
      : window.api.getFileContent(directory, fileName)
    ).then(text => {
      setContent(text || "");
      setOriginalContent(text || "");
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [directory, fileName, commitHash]);

  useEffect(() => {
    if (tab === "diff" && !diffContent && !commitHash && window.api) {
      window.api.getDiff(directory, fileName)
        .then(d => setDiffContent(d || "No changes"))
        .catch(() => setDiffContent("No changes"));
    }
  }, [tab, directory, fileName, commitHash, diffContent]);

  const handleSave = async () => {
    if (!window.api) return;
    try {
      await window.api.saveFileContent(directory, fileName, content);
      setSuccess("File saved");
      setOriginalContent(content);
      setDirty(false);
    } catch (e) {
      setError(e.message || String(e));
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Typography component="div" variant="body2" sx={{ fontFamily: "monospace", flex: 1, fontWeight: 600 }}>
          {fileName}{commitHash ? ` @ ${commitHash}` : ""}
        </Typography>
        <ToggleButtonGroup size="small" value={tab} exclusive onChange={(e, v) => v && setTab(v)}>
          <ToggleButton value="view" sx={{ fontSize: "0.7rem" }}>View</ToggleButton>
          {!commitHash && <ToggleButton value="edit" sx={{ fontSize: "0.7rem" }}>Edit</ToggleButton>}
          {!commitHash && <ToggleButton value="diff" sx={{ fontSize: "0.7rem" }}>Diff</ToggleButton>}
          <ToggleButton value="history" sx={{ fontSize: "0.7rem" }} onClick={() => setHistoryDialog(true)}>History</ToggleButton>
        </ToggleButtonGroup>
        <IconButton size="small" onClick={onClose} aria-label="close">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ overflow: "auto", maxHeight: "75vh", p: tab === "diff" ? 0 : 1 }}>
        {loading && <Typography sx={{ color: "text.secondary", textAlign: "center", py: 4 }}>Loading...</Typography>}

        {!loading && tab === "view" && (
          <CodeEditor value={content} filename={fileName} readOnly height="65vh" highlightLines={highlightLines} />
        )}

        {!loading && tab === "edit" && (
          <>
            <CodeEditor value={content} onChange={v => { setContent(v); setDirty(v !== originalContent); }} filename={fileName} readOnly={false} height="55vh" highlightLines={highlightLines} />
            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1, gap: 1 }}>
              {dirty && <Button onClick={() => { setContent(originalContent); setDirty(false); }}>Revert</Button>}
              <Button variant="contained" onClick={handleSave} disabled={!dirty}>Save</Button>
            </Box>
          </>
        )}

        {tab === "diff" && diffContent && (
          <Box sx={{ fontFamily: "monospace", fontSize: "13px", lineHeight: 1.5 }}>
            {(() => {
              const lines = diffContent.split("\n");
              const result = [];
              let oldLine = 0, newLine = 0;
              for (const line of lines) {
                if (line.startsWith("@@")) {
                  const m = line.match(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
                  if (m) { oldLine = parseInt(m[1], 10); newLine = parseInt(m[3], 10); }
                  continue;
                }
                if (line.startsWith("diff") || line.startsWith("index") || line.startsWith("---") || line.startsWith("+++")) continue;
                const isDel = line.startsWith("-");
                const isAdd = line.startsWith("+");
                const content = isDel || isAdd || line.startsWith(" ") ? line.slice(1) : line;
                const oNum = isDel ? oldLine++ : (!isAdd ? oldLine++ : null);
                const nNum = isAdd ? newLine++ : (!isDel ? newLine++ : null);
                let bg = "transparent", color = "inherit";
                if (isAdd) { bg = "rgba(76,175,80,0.35)"; color = "var(--diff-add-text)"; }
                else if (isDel) { bg = "rgba(244,67,54,0.35)"; color = "var(--diff-del-text)"; }
                result.push(
                  <div key={result.length} style={{ display: "flex", background: bg, color }}>
                    <div style={{ textAlign: "right", padding: "0 4px", minWidth: 36, userSelect: "none", color: oNum != null ? "var(--text-secondary)" : "transparent" }}>
                      {oNum != null ? oNum : ""}
                    </div>
                    <div style={{ textAlign: "right", padding: "0 4px", minWidth: 36, userSelect: "none", color: nNum != null ? "var(--text-secondary)" : "transparent" }}>
                      {nNum != null ? nNum : ""}
                    </div>
                    <div style={{ flex: 1, padding: "0 8px", whiteSpace: "pre-wrap" }}>{content || "\u00A0"}</div>
                  </div>
                );
              }
              return result;
            })()}
          </Box>
        )}

        {tab === "history" && historyDialog && (
          <FileHistoryDialog directory={directory} fileName={fileName} onClose={() => setHistoryDialog(false)} />
        )}

        {error && <Alert severity="error" sx={{ mt: 1 }} onClose={() => setError(null)}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mt: 1 }} onClose={() => setSuccess(null)}>{success}</Alert>}
      </DialogContent>
    </Dialog>
  );
}
