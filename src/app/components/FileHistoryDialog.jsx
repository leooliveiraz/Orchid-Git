import React, { useState, useEffect } from "react";
import {
  Dialog, DialogTitle, DialogContent,
  Typography, Box, Button, LinearProgress, TableContainer, Table, TableHead, TableBody, TableRow, TableCell, Paper, IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DiffViewer from "./DiffViewer.jsx";
import CodeEditor from "./CodeEditor.jsx";

export default function FileHistoryDialog({ directory, fileName, onClose }) {
  const [history, setHistory] = useState([]);
  const [blameData, setBlameData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("history");
  const [diffViewer, setDiffViewer] = useState(null);
  const [compareLoading, setCompareLoading] = useState(null);
  const [blameContent, setBlameContent] = useState("");

  useEffect(() => {
    if (!directory || !window.api) return;
    setLoading(true);
    Promise.all([
      window.api.getFileHistory(directory, fileName).catch(() => []),
      window.api.getBlame(directory, fileName).catch(() => []),
      window.api.getFileContent(directory, fileName).catch(() => ""),
    ]).then(([hist, blame, fcontent]) => {
      setHistory(hist || []);
      setBlameData(blame || []);
      setBlameContent(fcontent || "");
      setLoading(false);
    });
  }, [directory, fileName]);

  const handleCompare = async (commit) => {
    if (!window.api) return;
    setCompareLoading(commit.hash);
    try {
      const diffText = await window.api.getDiffCommit(directory, commit.hash, fileName);
      setDiffViewer({ fileName: `${commit.hash} - ${commit.message}`, diffText });
    } catch(e) {
      setDiffViewer({ fileName: `${commit.hash} - ${commit.message}`, diffText: `Error: ${e.message}` });
    }
    setCompareLoading(null);
  };

  return (
    <Dialog open onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Typography component="div" variant="body2" sx={{ fontFamily: "monospace", flex: 1, fontWeight: 600 }}>
          {fileName}
        </Typography>
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <Button size="small" variant={tab === "history" ? "contained" : "outlined"} onClick={() => setTab("history")}>
            History
          </Button>
          <Button size="small" variant={tab === "blame" ? "contained" : "outlined"} onClick={() => setTab("blame")}>
            Blame
          </Button>
        </Box>
        <IconButton size="small" onClick={onClose} aria-label="close">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ overflow: "auto", maxHeight: "70vh", p: tab === "blame" ? 0 : 1 }}>
        {loading && <LinearProgress />}

        {tab === "history" && !loading && (
          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: "60vh", overflow: "auto" }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, fontSize: "0.7rem", color: "text.secondary", width: 80, fontFamily: "monospace" }}>Hash</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: "0.7rem", color: "text.secondary" }}>Message</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: "0.7rem", color: "text.secondary", width: 120 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: "0.7rem", color: "text.secondary", width: 140 }}>Author</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: "0.7rem", color: "text.secondary", width: 80 }}>Compare</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.map((row, i) => (
                  <TableRow key={i} hover>
                    <TableCell sx={{ fontFamily: "monospace", fontSize: "0.75rem", color: "primary.main" }}>{row.hash}</TableCell>
                    <TableCell sx={{ fontSize: "0.8125rem" }}>{row.message}</TableCell>
                    <TableCell sx={{ fontSize: "0.75rem", color: "text.secondary" }}>{row.date}</TableCell>
                    <TableCell sx={{ fontSize: "0.75rem" }}>{row.author}</TableCell>
                    <TableCell>
                      <Button size="small" variant="outlined" sx={{ fontSize: "0.65rem", py: 0.25 }}
                        onClick={() => handleCompare(row)}
                        disabled={compareLoading === row.hash}
                      >
                        {compareLoading === row.hash ? "..." : "Diff"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {history.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} sx={{ textAlign: "center", color: "text.secondary", fontSize: "0.75rem" }}>
                      No history available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {tab === "blame" && !loading && (
          <CodeEditor
            value={blameContent}
            filename={fileName}
            readOnly
            height="55vh"
            blameAnnotations={blameData}
          />
        )}
      </DialogContent>

      {diffViewer && (
        <DiffViewer
          fileName={diffViewer.fileName}
          diffText={diffViewer.diffText}
          onClose={() => setDiffViewer(null)}
        />
      )}
    </Dialog>
  );
}
