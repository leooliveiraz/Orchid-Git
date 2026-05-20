import React, { useContext, useState, useCallback, useEffect } from "react";
import {
  Drawer, Snackbar, Alert, Accordion, AccordionSummary, AccordionDetails,
  List, ListItem, ListItemIcon, ListItemText,
  Typography, Box, Button, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AddIcon from "@mui/icons-material/Add";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import { OrchidContext } from "../OrchidContext.jsx";

function Section({ title, count, children, defaultOpen, onAdd }) {
  return (
    <Accordion defaultExpanded={defaultOpen !== false} disableGutters>
      <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 16, color: "text.secondary" }} />}>
        <Typography variant="body2" sx={{ fontWeight: 600, flex: 1 }}>{title}</Typography>
        {onAdd && (
          <Box component="span" onClick={(e) => { e.stopPropagation(); onAdd(); }}
            sx={{ mr: 0.5, p: 0.25, lineHeight: 1, cursor: "pointer", borderRadius: 1, "&:hover": { bgcolor: "action.hover" } }}
          >
            <AddIcon sx={{ fontSize: 16, color: "text.secondary", display: "block" }} />
          </Box>
        )}
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

function Item({ label, active, onDoubleClick, onClick }) {
  return (
    <ListItem
      dense
      onClick={onClick}
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

export default function LeftMenu({ open }) {
  const { directory, repoData, refresh } = useContext(OrchidContext);
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState("error");
  const [showNewBranch, setShowNewBranch] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const [creating, setCreating] = useState(false);

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
    setMessage(null);
    try {
      await window.api.checkoutBranch(directory, branch);
      setMessageType("success");
      setMessage(`Switched to ${branch}`);
      refresh();
    } catch (e) {
      setMessageType("error");
      setMessage(e.message || String(e));
    }
  }, [directory, repoData, refresh]);

  const handleBranchClick = useCallback((branch) => {
    if (branch === repoData?.currentBranch) return;
    setMessageType("info");
    setMessage("Double-click to switch branch");
  }, [repoData]);

  const handleStashDblClick = useCallback(async (stashId) => {
    if (!directory || !window.api) return;
    setMessage(null);
    try {
      await window.api.stashApply(directory, stashId);
      setMessageType("success");
      setMessage("Stash applied");
      refresh();
    } catch (e) {
      setMessageType("error");
      setMessage(e.message || String(e));
    }
  }, [directory, refresh]);

  const handleCreateBranch = async () => {
    if (!newBranchName.trim() || !directory || !window.api) return;
    setCreating(true);
    setMessage(null);
    try {
      await window.api.createBranch(directory, newBranchName.trim());
      setMessageType("success");
      setMessage(`Created and switched to ${newBranchName.trim()}`);
      setShowNewBranch(false);
      setNewBranchName("");
      refresh();
    } catch (e) {
      setMessageType("error");
      setMessage(e.message || String(e));
    }
    setCreating(false);
  };

  const openNewBranchDialog = useCallback(() => {
    setNewBranchName("");
    setShowNewBranch(true);
  }, []);

  return (
    <>
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
        {repoData ? (
          <>
            <Section title="Branches" count={repoData.branches?.length ?? 0} onAdd={openNewBranchDialog}>
              {repoData.branches?.map(b => (
                <Item
                  key={b}
                  label={b}
                  active={b === repoData.currentBranch}
                  onClick={() => handleBranchClick(b)}
                  onDoubleClick={() => handleBranchDblClick(b)}
                />
              ))}
            </Section>

            <Section title="Remote" count={repoData.remoteBranches?.length ?? 0} defaultOpen={false}>
              {repoData.remoteBranches?.map(b => (
                <Item key={b} label={b} onClick={() => handleBranchClick(b)} onDoubleClick={() => handleBranchDblClick(b)} />
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
      </Drawer>

      <Dialog open={showNewBranch} onClose={() => setShowNewBranch(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Create branch</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Branch name"
            placeholder="e.g. feature/new-feature"
            value={newBranchName}
            onChange={e => setNewBranchName(e.target.value)}
            disabled={creating}
            onKeyDown={e => { if (e.key === "Enter") handleCreateBranch(); }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowNewBranch(false)} disabled={creating}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateBranch} disabled={!newBranchName.trim() || creating}>
            {creating ? "Creating..." : "Create & switch"}
          </Button>
        </DialogActions>
      </Dialog>

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
    </>
  );
}
