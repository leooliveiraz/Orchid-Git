import React, { useContext, useState, useCallback, useEffect } from "react";
import {
  Drawer, Snackbar, Alert, Accordion, AccordionSummary, AccordionDetails,
  List, ListItem, ListItemIcon, ListItemText,
  Typography, Box, Button, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions,
  FormControlLabel, Checkbox,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
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

function Item({ label, active, onDoubleClick, onClick, onDelete }) {
  return (
    <ListItem
      dense
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      secondaryAction={onDelete ? (
        <Box component="span" onClick={(e) => { e.stopPropagation(); onDelete(); }}
          sx={{ display: "flex", lineHeight: 1, cursor: "pointer", color: "text.disabled", "&:hover": { color: "error.main" }, mr: 0.5 }}
        >
          <DeleteIcon sx={{ fontSize: 16 }} />
        </Box>
      ) : null}
      sx={{
        cursor: "pointer", py: 0.25, pr: onDelete ? 6 : 2,
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
  const { directory, repoData, refresh, recentDirs, setDirectory } = useContext(OrchidContext);
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState("error");
  const [showNewBranch, setShowNewBranch] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const [creating, setCreating] = useState(false);
  const [showNewTag, setShowNewTag] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [creatingTag, setCreatingTag] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showNewStash, setShowNewStash] = useState(false);
  const [stashMessage, setStashMessage] = useState("");
  const [creatingStash, setCreatingStash] = useState(false);
  const [pendingRecentDir, setPendingRecentDir] = useState(null);
  const [skipRecentConfirm, setSkipRecentConfirm] = useState(() => localStorage.getItem("orchid-skip-repo-switch") === "true");

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

  const handleCreateTag = async () => {
    if (!newTagName.trim() || !directory || !window.api) return;
    setCreatingTag(true);
    setMessage(null);
    try {
      await window.api.createTag(directory, newTagName.trim());
      setMessageType("success");
      setMessage(`Tag created: ${newTagName.trim()}`);
      setShowNewTag(false);
      setNewTagName("");
      refresh();
    } catch (e) {
      setMessageType("error");
      setMessage(e.message || String(e));
    }
    setCreatingTag(false);
  };

  const openNewTagDialog = useCallback(() => {
    setNewTagName("");
    setShowNewTag(true);
  }, []);

  const handleCreateStash = async () => {
    if (!stashMessage.trim() || !directory || !window.api) return;
    setCreatingStash(true);
    setMessage(null);
    try {
      await window.api.stashPush(directory, stashMessage.trim());
      setMessageType("success");
      setMessage("Stash created");
      setShowNewStash(false);
      setStashMessage("");
      refresh();
    } catch (e) {
      setMessageType("error");
      setMessage(e.message || String(e));
    }
    setCreatingStash(false);
  };

  const openNewStashDialog = useCallback(() => {
    setStashMessage("");
    setShowNewStash(true);
  }, []);

  const handleDeleteBranch = useCallback(async (branch) => {
    if (!directory || !window.api) return;
    setMessage(null);
    try {
      await window.api.deleteBranch(directory, branch);
      setMessageType("success");
      setMessage(`Branch deleted: ${branch}`);
      refresh();
    } catch (e) {
      setMessageType("error");
      setMessage(e.message || String(e));
    }
  }, [directory, refresh]);

  const confirmDeleteBranch = useCallback((branch) => {
    setConfirmDelete({ type: "branch", name: branch, action: () => handleDeleteBranch(branch) });
  }, [handleDeleteBranch]);

  const handleDeleteTag = useCallback(async (tag) => {
    if (!directory || !window.api) return;
    setMessage(null);
    try {
      await window.api.deleteTag(directory, tag);
      setMessageType("success");
      setMessage(`Tag deleted: ${tag}`);
      refresh();
    } catch (e) {
      setMessageType("error");
      setMessage(e.message || String(e));
    }
  }, [directory, refresh]);

  const confirmDeleteTag = useCallback((tag) => {
    setConfirmDelete({ type: "tag", name: tag, action: () => handleDeleteTag(tag) });
  }, [handleDeleteTag]);

  const handleDropStash = useCallback(async (stashId) => {
    if (!directory || !window.api) return;
    setMessage(null);
    try {
      await window.api.stashDrop(directory, stashId);
      setMessageType("success");
      setMessage("Stash dropped");
      refresh();
    } catch (e) {
      setMessageType("error");
      setMessage(e.message || String(e));
    }
  }, [directory, refresh]);

  const confirmDropStash = useCallback((stashId) => {
    setConfirmDelete({ type: "stash", name: stashId, action: () => handleDropStash(stashId) });
  }, [handleDropStash]);

  const handleDeleteRemoteBranch = useCallback(async (remoteName) => {
    if (!directory || !window.api) return;
    setMessage(null);
    try {
      await window.api.deleteRemoteBranch(directory, remoteName);
      setMessageType("success");
      setMessage(`Remote branch deleted: ${remoteName}`);
      refresh();
    } catch (e) {
      setMessageType("error");
      setMessage(e.message || String(e));
    }
  }, [directory, refresh]);

  const confirmDeleteRemoteBranch = useCallback((remoteName) => {
    setConfirmDelete({ type: "remote branch", name: remoteName, action: () => handleDeleteRemoteBranch(remoteName) });
  }, [handleDeleteRemoteBranch]);

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
        {recentDirs?.length > 0 && (
          <Section title="Recent" count={recentDirs.length} defaultOpen={!repoData}>
            {recentDirs.map(dir => (
              <Item key={dir} label={dir.split(/[/\\]/).pop()}
                title={dir}
                onClick={() => {
                  if (skipRecentConfirm) { setDirectory(dir); }
                  else { setPendingRecentDir(dir); }
                }}
              />
            ))}
          </Section>
        )}
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
                  onDelete={b !== repoData.currentBranch ? () => confirmDeleteBranch(b) : undefined}
                />
              ))}
            </Section>

            <Section title="Remote" count={repoData.remoteBranches?.length ?? 0} defaultOpen={false}>
              {repoData.remoteBranches?.map(b => (
                <Item key={b} label={b} onClick={() => handleBranchClick(b)} onDoubleClick={() => handleBranchDblClick(b)} onDelete={() => confirmDeleteRemoteBranch(b)} />
              ))}
            </Section>

            <Section title="Tags" count={repoData.tags?.length ?? 0} defaultOpen={false} onAdd={openNewTagDialog}>
              {repoData.tags?.map(t => (
                <Item key={t} label={t} onDelete={() => confirmDeleteTag(t)} />
              ))}
            </Section>

            <Section title="Stash" count={repoData.stashList?.length ?? 0} defaultOpen={false} onAdd={openNewStashDialog}>
              {repoData.stashList?.map(s => (
                <Item key={s.id} label={`${s.id}: ${s.message}`} onDoubleClick={() => handleStashDblClick(s.id)} onDelete={() => confirmDropStash(s.id)} />
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

      <Dialog open={showNewTag} onClose={() => setShowNewTag(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Create tag</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Tag name"
            placeholder="e.g. v1.0.0"
            value={newTagName}
            onChange={e => setNewTagName(e.target.value)}
            disabled={creatingTag}
            onKeyDown={e => { if (e.key === "Enter") handleCreateTag(); }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowNewTag(false)} disabled={creatingTag}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateTag} disabled={!newTagName.trim() || creatingTag}>
            {creatingTag ? "Creating..." : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showNewStash} onClose={() => setShowNewStash(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Create stash</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Stash message"
            placeholder="e.g. WIP: working on feature"
            value={stashMessage}
            onChange={e => setStashMessage(e.target.value)}
            disabled={creatingStash}
            onKeyDown={e => { if (e.key === "Enter") handleCreateStash(); }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowNewStash(false)} disabled={creatingStash}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateStash} disabled={!stashMessage.trim() || creatingStash}>
            {creatingStash ? "Creating..." : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!pendingRecentDir} onClose={() => setPendingRecentDir(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Switch repository</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Open <strong>{pendingRecentDir}</strong>?
          </Typography>
          <FormControlLabel
            control={<Checkbox size="small" checked={skipRecentConfirm}
              onChange={e => {
                setSkipRecentConfirm(e.target.checked);
                localStorage.setItem("orchid-skip-repo-switch", e.target.checked ? "true" : "false");
              }}
            />}
            label={<Typography variant="body2">Don't ask again</Typography>}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingRecentDir(null)}>Cancel</Button>
          <Button variant="contained" onClick={() => { setDirectory(pendingRecentDir); setPendingRecentDir(null); }}>
            Open
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Confirm deletion</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Delete {confirmDelete?.type} <strong>{confirmDelete?.name}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => { confirmDelete?.action(); setConfirmDelete(null); }}>
            Delete
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
