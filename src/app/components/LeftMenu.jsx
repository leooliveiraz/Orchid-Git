import React, { useContext, useState, useCallback, useEffect } from "react";
import {
  Drawer, Snackbar, Alert, Accordion, AccordionSummary, AccordionDetails,
  List, ListItem, ListItemIcon, ListItemText,
  Typography, Box,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import "./LeftMenu.css";
import { OrchidContext } from "../OrchidContext.jsx";

function Section({ title, count, children, defaultOpen }) {
  return (
    <Accordion defaultExpanded={defaultOpen !== false} disableGutters>
      <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 16, color: "text.secondary" }} />}>
        <Typography variant="body2" sx={{ fontWeight: 600, flex: 1 }}>{title}</Typography>
        <Box component="span" sx={{
          fontSize: "0.6875rem", color: "text.secondary",
          bgcolor: "action.selected", px: 0.75, borderRadius: 2,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          minWidth: 20, lineHeight: 1,
        }}>
          {count}
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ p: 0 }}>
        <List dense>
          {children}
        </List>
      </AccordionDetails>
    </Accordion>
  );
}

function Item({ label, active, onDoubleClick }) {
  return (
    <ListItem
      dense
      onDoubleClick={onDoubleClick}
      sx={{
        cursor: "pointer", py: 0.25,
        "&:hover": { bgcolor: "action.hover", borderRadius: 1 },
        ...(active ? { fontWeight: 700 } : {}),
      }}
      title={label}
    >
      <ListItemIcon sx={{ minWidth: 24 }}>
        {active ? (
          <FiberManualRecordIcon sx={{ fontSize: 10, color: "success.main" }} />
        ) : (
          <RadioButtonUncheckedIcon sx={{ fontSize: 10, color: "text.secondary" }} />
        )}
      </ListItemIcon>
      <ListItemText
        primary={label}
        primaryTypographyProps={{
          variant: "body2",
          noWrap: true,
          sx: { fontSize: "0.75rem", ...(active ? { fontWeight: 700 } : {}) },
        }}
      />
    </ListItem>
  );
}

export default function LeftMenu({ open, onRefresh }) {
  const { directory, repoData } = useContext(OrchidContext);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState("error");

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleBranchDblClick = useCallback(async (branch) => {
    if (!directory || !window.api) return;
    if (branch === repoData?.currentBranch) {
      setMessageType("info");
      setMessage("This branch is already selected");
      return;
    }
    setChecking(true);
    setMessage(null);
    try {
      await window.api.checkoutBranch(directory, branch);
      setMessageType("success");
      setMessage(`Switched to ${branch}`);
      if (onRefresh) onRefresh();
    } catch (e) {
      setMessageType("error");
      setMessage(e.message || String(e));
    }
    setChecking(false);
  }, [directory, repoData, onRefresh]);

  const handleStashDblClick = useCallback(async (stashId) => {
    if (!directory || !window.api) return;
    setChecking(true);
    setMessage(null);
    try {
      await window.api.stashApply(directory, stashId);
      setMessageType("success");
      setMessage("Stash applied");
      if (onRefresh) onRefresh();
    } catch (e) {
      setMessageType("error");
      setMessage(e.message || String(e));
    }
    setChecking(false);
  }, [directory, onRefresh]);

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: open ? 240 : 0,
        flexShrink: 0,
        transition: "width 0.2s",
        "& .MuiDrawer-paper": {
          width: 240,
          boxSizing: "border-box",
          position: "relative",
          overflow: "auto",
          transform: open ? "translateX(0)" : "translateX(-240px)",
          transition: "transform 0.2s",
          bgcolor: "var(--bg-primary)",
          color: "var(--text-primary)",
          borderRight: "1px solid var(--border-color)",
        },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", p: 1, borderBottom: 1, borderColor: "divider", cursor: "pointer" }} onClick={onRefresh}>
        <RefreshIcon fontSize="small" sx={{ mr: 0.5, color: "text.secondary" }} />
        <Typography variant="body2" sx={{ flex: 1, color: "text.secondary" }}>
          Refresh branches
        </Typography>
        <Typography variant="caption" sx={{ color: "text.disabled" }}>F5</Typography>
        {checking && (
          <Typography variant="caption" sx={{ color: "text.secondary", animation: "pulse 1s infinite", ml: 1 }}>
            Working...
          </Typography>
        )}
      </Box>

      {repoData ? (
        <>
          <Section title="Branches" count={repoData.branches?.length ?? 0}>
            {repoData.branches?.map(b => (
              <Item
                key={b}
                label={b}
                active={b === repoData.currentBranch}
                onDoubleClick={() => handleBranchDblClick(b)}
              />
            ))}
          </Section>

          <Section title="Remote" count={repoData.remoteBranches?.length ?? 0} defaultOpen={false}>
            {repoData.remoteBranches?.map(b => (
              <Item key={b} label={b} onDoubleClick={() => handleBranchDblClick(b)} />
            ))}
          </Section>

          <Section title="Tags" count={repoData.tags?.length ?? 0} defaultOpen={false}>
            {repoData.tags?.map(t => (
              <Item key={t} label={t} />
            ))}
          </Section>

          <Section title="Stash" count={repoData.stashList?.length ?? 0} defaultOpen={false}>
            {repoData.stashList?.map(s => (
              <Item key={s.id} label={`${s.id}: ${s.message}`} onDoubleClick={() => handleStashDblClick(s.id)} />
            ))}
          </Section>
        </>
      ) : (
        <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center", py: 4, px: 2 }}>
          Select a directory to view branches
        </Typography>
      )}

      <Snackbar open={!!message} autoHideDuration={4000} onClose={() => setMessage(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={() => setMessage(null)}
          severity={messageType === "error" ? "error" : messageType === "success" ? "success" : "info"}
          variant="filled" sx={{ width: "100%" }}
        >
          {message}
        </Alert>
      </Snackbar>
    </Drawer>
  );
}
