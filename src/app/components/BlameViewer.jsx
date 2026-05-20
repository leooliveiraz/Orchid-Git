import React from "react";
import {
  Dialog, DialogTitle, DialogContent, IconButton, Typography, Box, TableContainer, Table, TableHead, TableBody, TableRow, TableCell, Paper,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

export default function BlameViewer({ fileName, blameData, onClose }) {
  return (
    <Dialog open onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Typography component="div" variant="body2" sx={{ fontFamily: "monospace", flex: 1, fontWeight: 600 }}>
          {fileName}
        </Typography>
        <IconButton size="small" onClick={onClose} aria-label="close">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ overflow: "auto", maxHeight: "70vh", p: 0 }}>
        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: "70vh", overflow: "auto" }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, fontSize: "0.7rem", color: "text.secondary", width: 60, fontFamily: "monospace" }}>Line</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: "0.7rem", color: "text.secondary", width: 74, fontFamily: "monospace" }}>Hash</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: "0.7rem", color: "text.secondary", width: 130 }}>Author</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: "0.7rem", color: "text.secondary", width: 86 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: "0.7rem", color: "text.secondary" }}>Content</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {blameData.map((row, i) => (
                <TableRow key={i} hover>
                  <TableCell sx={{ fontFamily: "monospace", fontSize: "0.75rem", color: "text.secondary" }}>{row.lineNum}</TableCell>
                  <TableCell sx={{ fontFamily: "monospace", fontSize: "0.75rem", color: "primary.main" }}>{row.hash}</TableCell>
                  <TableCell sx={{ fontSize: "0.8125rem" }}>{row.author}</TableCell>
                  <TableCell sx={{ fontSize: "0.75rem", color: "text.secondary" }}>{row.date}</TableCell>
                  <TableCell sx={{ fontFamily: '"Cascadia Code","Fira Code","Consolas",monospace', fontSize: "0.8125rem", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{row.content}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
    </Dialog>
  );
}
