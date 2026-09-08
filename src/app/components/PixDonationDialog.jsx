import React, { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogTitle, DialogContent, IconButton, Typography, Box, Button, Stack } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import QRCodeScannerIcon from "@mui/icons-material/QRCodeScanner";
import QRCode from "react-qr-code";
import { createPixPayload } from "../utils/pix.js";

const PIX_GREEN = "#32BCAD";

export default function PixDonationDialog({ onClose, pixKey, name, city }) {
  const payload = useMemo(() => {
    try {
      return createPixPayload({ pixKey, name, city });
    } catch {
      return "";
    }
  }, [pixKey, name, city]);

  const [copied, setCopied] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const fallbackCopy = (text, done) => {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      done();
    } catch {
      /* ignore */
    }
    document.body.removeChild(ta);
  };

  const copyText = (text, which) => {
    const done = () => {
      setCopied(which);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(null), 2200);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
    } else {
      fallbackCopy(text, done);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pr: 1 }}>
        <Typography variant="h6">Donate with PIX</Typography>
        <IconButton onClick={onClose} size="small" aria-label="Close">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5 }}>
        <Box
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 0.75,
            px: 1.25,
            py: 0.5,
            borderRadius: 999,
            border: "1px solid",
            borderColor: theme => `${theme.palette.success.main}55`,
            bgcolor: theme => `${theme.palette.success.main}1A`,
            color: "success.main",
            fontWeight: 600,
            fontSize: "0.8125rem",
          }}
        >
          <QRCodeScannerIcon sx={{ fontSize: 16 }} />
          Scan with your payment app
        </Box>
        <Box sx={{ p: 2, bgcolor: "#FFFFFF", borderRadius: 2 }}>
          {payload && <QRCode value={payload} size={200} level="M" fgColor="#000000" />}
        </Box>
        <Button
          fullWidth
          variant="contained"
          disabled={!payload}
          onClick={() => copyText(payload, "code")}
          startIcon={copied === "code" ? <CheckIcon /> : <ContentCopyIcon />}
          sx={{ bgcolor: PIX_GREEN, "&:hover": { bgcolor: "#27a191" }, "&.Mui-disabled": { bgcolor: "#4f6e69" } }}
        >
          {copied === "code" ? "Copied!" : "Copy PIX code"}
        </Button>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
            {pixKey}
          </Typography>
          <Button
            size="small"
            onClick={() => copyText(pixKey, "key")}
            startIcon={copied === "key" ? <CheckIcon sx={{ fontSize: 16 }} /> : <ContentCopyIcon sx={{ fontSize: 16 }} />}
            sx={{ color: "text.secondary", textTransform: "none", fontSize: "0.75rem", p: 0, minWidth: 0 }}
          >
            {copied === "key" ? "Copied!" : "Copy key"}
          </Button>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
