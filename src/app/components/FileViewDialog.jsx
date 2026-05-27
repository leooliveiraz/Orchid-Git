import React, { useState, useEffect } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Typography, Box, Button, ToggleButtonGroup, ToggleButton, IconButton, Alert, Paper,
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
          <CodeEditor value={content} filename={fileName} readOnly height="65vh" />
        )}

        {!loading && tab === "edit" && (
          <>
            <CodeEditor value={content} onChange={v => { setContent(v); setDirty(v !== originalContent); }} filename={fileName} readOnly={false} height="55vh" />
            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1, gap: 1 }}>
              {dirty && <Button onClick={() => { setContent(originalContent); setDirty(false); }}>Revert</Button>}
              <Button variant="contained" onClick={handleSave} disabled={!dirty}>Save</Button>
            </Box>
          </>
        )}

        {tab === "diff" && diffContent && (
          <Paper variant="outlined" sx={{ p: 1, m: 1 }}>
            <Typography variant="caption" sx={{ fontFamily: "monospace", whiteSpace: "pre-wrap", display: "block", fontSize: "0.75rem", lineHeight: 1.5 }}>
              {diffContent}
            </Typography>
          </Paper>
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
