import React, { useContext, useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  Drawer, Snackbar, Alert, Accordion, AccordionSummary, AccordionDetails,
  List, ListItem, ListItemIcon, ListItemText,
  Typography, Box, Button, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions,
  FormControlLabel, Checkbox, Menu, MenuItem, Chip, InputAdornment,
  ToggleButtonGroup, ToggleButton,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AddIcon from "@mui/icons-material/Add";
import MergeIcon from "@mui/icons-material/Merge";
import DeleteIcon from "@mui/icons-material/Delete";
import SwapVertIcon from "@mui/icons-material/SwapVert";
import ArrowRightIcon from "@mui/icons-material/ArrowRight";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import SearchIcon from "@mui/icons-material/Search";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import Tooltip from "@mui/material/Tooltip";
import { OrchidContext } from "../OrchidContext.jsx";
import MergeDialog from "./MergeDialog.jsx";

function Section({ title, count, children, expanded, onToggle, onAdd, onMerge, onSort, filter, onFilterChange, viewMode, onViewModeChange }) {
  return (
    <Accordion expanded={expanded} onChange={onToggle} disableGutters>
      <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 16, color: "text.secondary" }} />}>
        <Typography variant="body2" sx={{ fontWeight: 600, flex: 1 }}>{title}</Typography>
        {onAdd && (
          <Tooltip title={title === "Branches" ? "Create branch" : title === "Stash" ? "Create stash" : "Create"} arrow>
            <Box component="span" onClick={(e) => { e.stopPropagation(); onAdd(); }}
              sx={{ mr: 0.5, p: 0.25, lineHeight: 1, cursor: "pointer", borderRadius: 1, "&:hover": { bgcolor: "action.hover" } }}
            >
              <AddIcon sx={{ fontSize: 16, color: "text.secondary", display: "block" }} />
            </Box>
          </Tooltip>
        )}
        {onMerge && (
          <Tooltip title="Merge branch into current" arrow>
            <Box component="span" onClick={(e) => { e.stopPropagation(); onMerge(); }}
              sx={{ mr: 0.5, p: 0.25, lineHeight: 1, cursor: "pointer", borderRadius: 1, "&:hover": { bgcolor: "action.hover" } }}
            >
              <MergeIcon sx={{ fontSize: 16, color: "text.secondary", display: "block" }} />
            </Box>
          </Tooltip>
        )}
        {onSort && (
          <Tooltip title="Sort recent directories" arrow>
            <Box component="span" onClick={(e) => { e.stopPropagation(); onSort(); }}
              sx={{ mr: 0.5, p: 0.25, lineHeight: 1, cursor: "pointer", borderRadius: 1, "&:hover": { bgcolor: "action.hover" } }}
            >
              <SwapVertIcon sx={{ fontSize: 16, color: "text.secondary", display: "block" }} />
            </Box>
          </Tooltip>
        )}
        <Box component="span" sx={{
          fontSize: "0.6875rem", color: "text.secondary",
          bgcolor: "action.selected", px: 0.75, borderRadius: 2,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          minWidth: 20, lineHeight: 1,
        }}>
          {count}
        </Box>
        {viewMode && onViewModeChange && (
          <Box component="span" onClick={e => e.stopPropagation()} sx={{ ml: 0.5, display: "inline-flex", alignItems: "center" }}>
            <ToggleButtonGroup size="small" value={viewMode} exclusive onChange={(e, v) => v && onViewModeChange(v)}
              sx={{ "& .MuiToggleButton-root": { border: 0, p: 0.25, lineHeight: 1, fontSize: "0.7rem", minWidth: 32, minHeight: 22, borderRadius: 0.5 } }}
            >
              <ToggleButton value="flat">Flat</ToggleButton>
              <ToggleButton value="tree">Tree</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        )}
      </AccordionSummary>
      <AccordionDetails sx={{ p: 0 }}>
        {onFilterChange && (
          <TextField
            size="small"
            placeholder={`Filter ${title.toLowerCase()}...`}
            value={filter || ""}
            onChange={e => onFilterChange(e.target.value)}
            variant="standard"
            onClick={e => e.stopPropagation()}
            sx={{ px: 1, pt: 0.5, pb: 0.5, display: "flex" }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 14, color: "text.secondary" }} /></InputAdornment>,
              sx: { fontSize: "0.75rem" },
              disableUnderline: true,
            }}
          />
        )}
        <List dense>
          {children}
        </List>
      </AccordionDetails>
    </Accordion>
  );
}

function Item({ label, active, badge, onDoubleClick, onClick, onDelete, onOpen, onContextMenu, sx: sxProp }) {
  return (
    <ListItem
      dense
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      secondaryAction={(onDelete || onOpen) ? (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
          {onOpen && (
            <Tooltip title="Abrir pasta no explorador de arquivos" arrow>
              <Box component="span" onClick={(e) => { e.stopPropagation(); onOpen(); }}
                sx={{ display: "flex", lineHeight: 1, cursor: "pointer", color: "text.disabled", "&:hover": { color: "text.primary" } }}
              >
                <FolderOpenIcon sx={{ fontSize: 16 }} />
              </Box>
            </Tooltip>
          )}
          {onDelete ? (
            <Box component="span" onClick={(e) => { e.stopPropagation(); onDelete(); }}
              sx={{ display: "flex", lineHeight: 1, cursor: "pointer", color: "text.disabled", "&:hover": { color: "error.main" }, mr: 0.5 }}
            >
              <DeleteIcon sx={{ fontSize: 16 }} />
            </Box>
          ) : null}
        </Box>
      ) : null}
      sx={{
        cursor: "pointer", py: 0.25, pr: (onDelete || onOpen) ? 10.5 : 2,
        "&:hover": { bgcolor: "action.hover", borderRadius: 1 },
        ...(active ? { fontWeight: 700 } : {}),
        ...(sxProp || {}),
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
      {badge && (
        <Chip id={`branch-status-${label}`}
          label={`↑${badge.ahead} ↓${badge.behind}`}
          size="small"
          sx={{
            height: 16,
            fontSize: "0.55rem",
            fontWeight: 600,
            mr: 0.5,
            color: badge.behind > 0 ? "#fff" : badge.ahead > 0 ? "#fff" : "text.secondary",
            bgcolor: badge.behind > 0 ? "rgba(239,83,80,0.8)" : badge.ahead > 0 ? "rgba(66,165,245,0.8)" : "transparent",
            "& .MuiChip-label": { px: 0.5 },
          }}
        />
      )}
    </ListItem>
  );
}

function buildTree(items) {
  const tree = {};
  for (const item of items) {
    const parts = item.split('/');
    let current = tree;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        current[part] = item;
      } else {
        if (!current[part] || typeof current[part] === 'string') {
          current[part] = {};
        }
        current = current[part];
      }
    }
  }
  return tree;
}

export default function LeftMenu({ open }) {
  const { directory, repoData, refresh, recentDirs, setDirectory, removeRecentDir, recentSort, setRecentSort, isMerging, isReverting, setScrollToCommitHash, setViewCommit, setIsLoading } = useContext(OrchidContext);
  const branchStatusMap = useMemo(() => {
    if (!repoData?.branchesStatus) return {};
    const map = {};
    repoData.branchesStatus.forEach(b => { map[b.name] = { ahead: b.ahead, behind: b.behind }; });
    return map;
  }, [repoData?.branchesStatus]);
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState("error");
  const [showNewBranch, setShowNewBranch] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const [creating, setCreating] = useState(false);
  const [showNewTag, setShowNewTag] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [creatingTag, setCreatingTag] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [renameBranchName, setRenameBranchName] = useState(null);
  const [renameNewName, setRenameNewName] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [showNewStash, setShowNewStash] = useState(false);
  const [stashMessage, setStashMessage] = useState("");
  const [creatingStash, setCreatingStash] = useState(false);
  const [showMerge, setShowMerge] = useState(false);
  const [mergeBranch, setMergeBranch] = useState(null);
  const [branchContext, setBranchContext] = useState(null);
  const [stashContext, setStashContext] = useState(null);
  const [pendingRecentDir, setPendingRecentDir] = useState(null);
  const [skipRecentConfirm, setSkipRecentConfirm] = useState(() => localStorage.getItem("orchid-skip-repo-switch") === "true");
  const [showAllRecent, setShowAllRecent] = useState(false);
  const [expandedSections, setExpandedSections] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("orchid-left-menu-sections")) || {};
    } catch {
      return {};
    }
  });

  const [branchView, setBranchView] = useState(() => localStorage.getItem("orchid-branch-view") || "flat");
  const [remoteView, setRemoteView] = useState(() => localStorage.getItem("orchid-remote-view") || "flat");
  const [branchExpandedFolders, setBranchExpandedFolders] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem("orchid-branch-folders-expanded")) || []); }
    catch { return new Set(); }
  });
  const [remoteExpandedFolders, setRemoteExpandedFolders] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem("orchid-remote-folders-expanded")) || []); }
    catch { return new Set(); }
  });

  const toggleBranchFolder = useCallback((path) => {
    setBranchExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path); else next.add(path);
      localStorage.setItem("orchid-branch-folders-expanded", JSON.stringify([...next]));
      return next;
    });
  }, []);

  const toggleRemoteFolder = useCallback((path) => {
    setRemoteExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path); else next.add(path);
      localStorage.setItem("orchid-remote-folders-expanded", JSON.stringify([...next]));
      return next;
    });
  }, []);

  const renderTreeItems = useCallback((nodes, depth, leafRenderer, expandedFolders, onToggleFolder) => {
    return Object.entries(nodes)
      .sort(([a, valA], [b, valB]) => {
        const aIsDir = typeof valA !== 'string';
        const bIsDir = typeof valB !== 'string';
        if (aIsDir && !bIsDir) return -1;
        if (!aIsDir && bIsDir) return 1;
        return a.localeCompare(b);
      })
      .map(([key, value]) => {
        if (typeof value === 'string') {
          return leafRenderer(value, depth);
        }
        const isOpen = expandedFolders.has(key);
        const hasChildren = Object.keys(value).length > 0;
        return (
          <React.Fragment key={key}>
            <ListItem dense sx={{ pl: depth > 0 ? 2 + depth * 2 : 1, cursor: 'pointer', py: 0.25, '&:hover': { bgcolor: 'action.hover', borderRadius: 1 } }} onClick={() => onToggleFolder(key)}>
              <ListItemIcon sx={{ minWidth: 18 }}>
                {hasChildren ? (
                  <ArrowRightIcon sx={{ fontSize: 16, color: 'text.secondary', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }} />
                ) : (
                  <Box sx={{ width: 16 }} />
                )}
              </ListItemIcon>
              <ListItemText primary={key} primaryTypographyProps={{ variant: 'body2', sx: { fontSize: '0.8rem', fontWeight: 600, color: 'text.secondary' } }} />
            </ListItem>
            {isOpen && <List dense disablePadding>{renderTreeItems(value, depth + 1, leafRenderer, expandedFolders, onToggleFolder)}</List>}
          </React.Fragment>
        );
      });
  }, []);

  useEffect(() => { localStorage.setItem("orchid-branch-view", branchView); }, [branchView]);
  useEffect(() => { localStorage.setItem("orchid-remote-view", remoteView); }, [remoteView]);

  const initialExpandDone = useRef(false);

  useEffect(() => {
    if (!initialExpandDone.current && repoData?.currentBranch) {
      const parts = repoData.currentBranch.split('/');
      if (parts.length > 1) {
        setBranchExpandedFolders(prev => {
          const next = new Set(prev);
          let changed = false;
          for (let i = 0; i < parts.length - 1; i++) {
            if (!next.has(parts[i])) {
              next.add(parts[i]);
              changed = true;
            }
          }
          if (changed) {
            localStorage.setItem("orchid-branch-folders-expanded", JSON.stringify([...next]));
          }
          return next;
        });
      }
      initialExpandDone.current = true;
    }
  }, [repoData?.currentBranch]);

  const [filters, setFilters] = useState({ branches: "", remote: "", tags: "", stash: "" });
  const setFilter = useCallback((section) => (value) => {
    setFilters(prev => ({ ...prev, [section]: value }));
  }, []);

  const filteredBranches = useMemo(() => {
    if (!repoData?.branches) return [];
    const f = filters.branches.toLowerCase();
    return f ? repoData.branches.filter(b => b.toLowerCase().includes(f)) : repoData.branches;
  }, [repoData?.branches, filters.branches]);

  const filteredRemote = useMemo(() => {
    if (!repoData?.remoteBranches) return [];
    const f = filters.remote.toLowerCase();
    return f ? repoData.remoteBranches.filter(b => b.toLowerCase().includes(f)) : repoData.remoteBranches;
  }, [repoData?.remoteBranches, filters.remote]);

  const filteredTags = useMemo(() => {
    if (!repoData?.tags) return [];
    const f = filters.tags.toLowerCase();
    return f ? repoData.tags.filter(t => t.toLowerCase().includes(f)) : repoData.tags;
  }, [repoData?.tags, filters.tags]);

  const filteredStash = useMemo(() => {
    if (!repoData?.stashList) return [];
    const f = filters.stash.toLowerCase();
    return f ? repoData.stashList.filter(s => s.id.toLowerCase().includes(f) || s.message.toLowerCase().includes(f)) : repoData.stashList;
  }, [repoData?.stashList, filters.stash]);

  const [menuWidth, setMenuWidth] = useState(() => {
    const saved = localStorage.getItem("orchid-menu-width");
    return saved ? Math.max(180, Math.min(500, parseInt(saved, 10))) : 240;
  });
  const [resizing, setResizing] = useState(false);

  useEffect(() => {
    localStorage.setItem("orchid-menu-width", menuWidth);
  }, [menuWidth]);

  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    setResizing(true);
  }, []);

  useEffect(() => {
    if (!resizing) return;
    const handleMouseMove = (e) => {
      setMenuWidth(Math.max(180, Math.min(500, e.clientX)));
    };
    const handleMouseUp = () => {
      setResizing(false);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [resizing]);

  const handleToggle = useCallback((section) => (_event, isExpanded) => {
    setExpandedSections(prev => {
      const next = { ...prev, [section]: isExpanded };
      localStorage.setItem("orchid-left-menu-sections", JSON.stringify(next));
      return next;
    });
  }, []);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleBranchDblClick = useCallback(async (branch) => {
    if (isMerging) { setMessageType("error"); setMessage("Resolva o merge antes de continuar"); return; }
    if (isReverting) { setMessageType("error"); setMessage("Resolva o revert antes de continuar"); return; }
    if (!directory || !window.api) return;
    if (branch === repoData?.currentBranch) {
      setMessageType("info");
      setMessage("This branch is already selected");
      return;
    }
    setMessage(null);
    setIsLoading(true);
    try {
      await window.api.checkoutBranch(directory, branch);
      setMessageType("success");
      setMessage(`Switched to ${branch}`);
      refresh();
    } catch (e) {
      setMessageType("error");
      setMessage(e.message || String(e));
      setIsLoading(false);
    }
  }, [directory, repoData, refresh, isMerging, isReverting, setIsLoading]);

  const handleRemoteBranchDblClick = useCallback(async (branch) => {
    if (isMerging) { setMessageType("error"); setMessage("Resolva o merge antes de continuar"); return; }
    if (isReverting) { setMessageType("error"); setMessage("Resolva o revert antes de continuar"); return; }
    if (!directory || !window.api) return;
    const localName = branch.replace(/^[^/]+\//, "");
    if (localName === repoData?.currentBranch) {
      setMessageType("info");
      setMessage("This branch is already selected");
      return;
    }
    setMessage(null);
    setIsLoading(true);
    try {
      await window.api.checkoutRemoteBranch(directory, branch);
      setMessageType("success");
      setMessage(`Switched to ${localName}`);
      refresh();
    } catch (e) {
      setMessageType("error");
      setMessage(e.message || String(e));
      setIsLoading(false);
    }
  }, [directory, repoData, refresh, isMerging, isReverting, setIsLoading]);

  const scrollToRef = useCallback(async (ref) => {
    if (!directory || !window.api?.getRefCommit) return;
    try {
      const hash = await window.api.getRefCommit(directory, ref);
      setScrollToCommitHash(hash);
    } catch (e) { }
  }, [directory, setScrollToCommitHash]);

  const handleBranchClick = useCallback((branch) => {
    scrollToRef(`refs/heads/${branch}`);
  }, [scrollToRef]);

  const handleRemoteBranchClick = useCallback((branch) => {
    scrollToRef(branch);
  }, [scrollToRef]);

  const handleTagClick = useCallback((tag) => {
    scrollToRef(`refs/tags/${tag}`);
  }, [scrollToRef]);

  const handleStashClick = useCallback((stashId) => {
    scrollToRef(stashId);
  }, [scrollToRef]);

  const handleBranchContext = useCallback((e, branch) => {
    e.preventDefault();
    setBranchContext({ left: e.clientX, top: e.clientY, branch });
  }, []);

  const handleStashContext = useCallback((e, stashId) => {
    e.preventDefault();
    setStashContext({ left: e.clientX, top: e.clientY, stashId });
  }, []);

  const handleStashShowChanges = useCallback(async () => {
    const stashId = stashContext?.stashId;
    const pos = { left: stashContext?.left || 200, top: stashContext?.top || 200 };
    setStashContext(null);
    if (!stashId || !directory || !window.api?.getRefCommit) return;
    try {
      const hash = await window.api.getRefCommit(directory, stashId);
      setScrollToCommitHash(hash);
      setViewCommit({ hash, ...pos });
    } catch (e) { }
  }, [stashContext, directory, setScrollToCommitHash, setViewCommit]);

  const handleContextCheckout = useCallback(() => {
    const branch = branchContext?.branch;
    setBranchContext(null);
    if (branch) handleBranchDblClick(branch);
  }, [branchContext, handleBranchDblClick]);

  const handleContextMerge = useCallback(() => {
    if (isMerging) { setMessageType("error"); setMessage("Resolva o merge antes de continuar"); return; }
    if (isReverting) { setMessageType("error"); setMessage("Resolva o revert antes de continuar"); return; }
    const branch = branchContext?.branch;
    setBranchContext(null);
    if (branch) {
      setMergeBranch(branch);
      setShowMerge(true);
    }
  }, [branchContext, isMerging, isReverting]);

  const handleStashDblClick = useCallback(async (stashId) => {
    if (isMerging) { setMessageType("error"); setMessage("Resolva o merge antes de continuar"); return; }
    if (isReverting) { setMessageType("error"); setMessage("Resolva o revert antes de continuar"); return; }
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
  }, [directory, refresh, isMerging, isReverting]);

  const handleCreateBranch = async () => {
    if (isMerging) { setMessageType("error"); setMessage("Resolva o merge antes de continuar"); return; }
    if (isReverting) { setMessageType("error"); setMessage("Resolva o revert antes de continuar"); return; }
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
    if (isMerging) { setMessageType("error"); setMessage("Resolva o merge antes de continuar"); return; }
    if (isReverting) { setMessageType("error"); setMessage("Resolva o revert antes de continuar"); return; }
    setNewBranchName("");
    setShowNewBranch(true);
  }, [isMerging, isReverting]);

  const handleCreateTag = async () => {
    if (isMerging) { setMessageType("error"); setMessage("Resolva o merge antes de continuar"); return; }
    if (isReverting) { setMessageType("error"); setMessage("Resolva o revert antes de continuar"); return; }
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
    if (isMerging) { setMessageType("error"); setMessage("Resolva o merge antes de continuar"); return; }
    if (isReverting) { setMessageType("error"); setMessage("Resolva o revert antes de continuar"); return; }
    setNewTagName("");
    setShowNewTag(true);
  }, [isMerging, isReverting]);

  const handleCreateStash = async () => {
    if (isMerging) { setMessageType("error"); setMessage("Resolva o merge antes de continuar"); return; }
    if (isReverting) { setMessageType("error"); setMessage("Resolva o revert antes de continuar"); return; }
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
    if (isMerging) { setMessageType("error"); setMessage("Resolva o merge antes de continuar"); return; }
    if (isReverting) { setMessageType("error"); setMessage("Resolva o revert antes de continuar"); return; }
    setStashMessage("");
    setShowNewStash(true);
  }, [isMerging, isReverting]);

  const handleDeleteBranch = useCallback(async (branch) => {
    if (isMerging) { setMessageType("error"); setMessage("Resolva o merge antes de continuar"); return; }
    if (isReverting) { setMessageType("error"); setMessage("Resolva o revert antes de continuar"); return; }
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
  }, [directory, refresh, isMerging, isReverting]);

  const handleContextRename = useCallback(() => {
    const branch = branchContext?.branch;
    setBranchContext(null);
    if (branch) {
      setRenameBranchName(branch);
    }
  }, [branchContext]);

  const handleRenameBranch = async () => {
    if (!renameBranchName || !directory || !window.api) return;
    const oldName = renameBranchName;
    const newName = renameNewName.trim();
    if (!newName || newName === oldName) return;
    setRenaming(true);
    setMessage(null);
    try {
      await window.api.renameBranch(directory, oldName, newName);
      setMessageType("success");
      setMessage(`Branch renamed: ${oldName} → ${newName}`);
      setRenameBranchName(null);
      setRenameNewName("");
      refresh();
    } catch (e) {
      setMessageType("error");
      setMessage(e.message || String(e));
    }
    setRenaming(false);
  };

  const confirmDeleteBranch = useCallback((branch) => {
    if (isMerging) { setMessageType("error"); setMessage("Resolva o merge antes de continuar"); return; }
    if (isReverting) { setMessageType("error"); setMessage("Resolva o revert antes de continuar"); return; }
    setConfirmDelete({ type: "branch", name: branch, action: () => handleDeleteBranch(branch) });
  }, [handleDeleteBranch, isMerging, isReverting]);

  const handleDeleteTag = useCallback(async (tag) => {
    if (isMerging) { setMessageType("error"); setMessage("Resolva o merge antes de continuar"); return; }
    if (isReverting) { setMessageType("error"); setMessage("Resolva o revert antes de continuar"); return; }
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
  }, [directory, refresh, isMerging, isReverting]);

  const confirmDeleteTag = useCallback((tag) => {
    if (isMerging) { setMessageType("error"); setMessage("Resolva o merge antes de continuar"); return; }
    if (isReverting) { setMessageType("error"); setMessage("Resolva o revert antes de continuar"); return; }
    setConfirmDelete({ type: "tag", name: tag, action: () => handleDeleteTag(tag) });
  }, [handleDeleteTag, isMerging, isReverting]);

  const handleDropStash = useCallback(async (stashId) => {
    if (isMerging) { setMessageType("error"); setMessage("Resolva o merge antes de continuar"); return; }
    if (isReverting) { setMessageType("error"); setMessage("Resolva o revert antes de continuar"); return; }
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
  }, [directory, refresh, isMerging, isReverting]);

  const confirmDropStash = useCallback((stashId) => {
    if (isMerging) { setMessageType("error"); setMessage("Resolva o merge antes de continuar"); return; }
    if (isReverting) { setMessageType("error"); setMessage("Resolva o revert antes de continuar"); return; }
    setConfirmDelete({ type: "stash", name: stashId, action: () => handleDropStash(stashId) });
  }, [handleDropStash, isMerging, isReverting]);

  const handleDeleteRemoteBranch = useCallback(async (remoteName) => {
    if (isMerging) { setMessageType("error"); setMessage("Resolva o merge antes de continuar"); return; }
    if (isReverting) { setMessageType("error"); setMessage("Resolva o revert antes de continuar"); return; }
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

  const confirmRemoveRecent = useCallback((dir) => {
    setConfirmDelete({ type: "recent directory", name: dir, action: () => removeRecentDir(dir) });
  }, [removeRecentDir]);

  return (
    <>
      <Drawer
        variant="permanent"
        sx={{
          width: open ? menuWidth : 0,
          flexShrink: 0,
          transition: resizing ? "none" : "width 0.2s",
          "& .MuiDrawer-paper": {
            width: menuWidth,
            boxSizing: "border-box",
            position: "relative",
            overflow: "auto",
            transform: open ? "translateX(0)" : `translateX(-${menuWidth}px)`,
            transition: resizing ? "none" : "transform 0.2s",
            bgcolor: "var(--bg-primary)",
            color: "var(--text-primary)",
            borderRight: "1px solid var(--border-color)",
          },
        }}
      >
        {open && (
          <Box
            onMouseDown={handleResizeStart}
            sx={{
              position: "absolute",
              right: 0,
              top: 0,
              bottom: 0,
              width: 5,
              cursor: "col-resize",
              zIndex: 10,
              bgcolor: resizing ? "primary.main" : "transparent",
              opacity: resizing ? 1 : 0,
              "&:hover": { opacity: 1, bgcolor: "primary.main" },
              transition: "opacity 0.15s",
            }}
          />
        )}
        {recentDirs?.length > 0 && (
          <Section title="Recent" count={recentDirs.length} expanded={expandedSections.recent !== false} onToggle={handleToggle("recent")}
            onSort={() => {
              const modes = ["recent", "name-asc", "name-desc"];
              const idx = modes.indexOf(recentSort);
              setRecentSort(modes[(idx + 1) % modes.length]);
            }}
          >
            {(() => {
              const sorted = [...recentDirs].sort((a, b) => {
                if (recentSort === "name-asc") return a.localeCompare(b);
                if (recentSort === "name-desc") return b.localeCompare(a);
                return 0;
              });
              const showAll = showAllRecent;
              const items = showAll ? sorted : sorted.slice(0, 6);
              return (
                <>
                  {items.map(dir => (
                    <Item key={dir} label={dir.split(/[/\\]/).pop()}
                      title={dir}
                      active={dir === directory}
                      onClick={() => {
                        if (skipRecentConfirm) { setDirectory(dir); }
                        else { setPendingRecentDir(dir); }
                      }}
                      onOpen={() => window.api?.openInExplorer?.(dir)}
                      onDelete={() => confirmRemoveRecent(dir)}
                    />
                  ))}
                  {sorted.length > 6 && (
                    <Item label={showAll ? "Show less" : `Show more (${sorted.length - 6})`}
                      onClick={() => setShowAllRecent(!showAll)}
                      sx={{ fontStyle: "italic", opacity: 0.7 }}
                    />
                  )}
                </>
              );
            })()}
          </Section>
        )}
        {repoData ? (
          <>
            <Section title="Branches" count={repoData.branches?.length ?? 0} expanded={expandedSections.branches !== false} onToggle={handleToggle("branches")} onAdd={openNewBranchDialog} onMerge={() => { if (isMerging) { setMessageType("error"); setMessage("Resolva o merge antes de continuar"); return; } if (isReverting) { setMessageType("error"); setMessage("Resolva o revert antes de continuar"); return; } setShowMerge(true); }} filter={filters.branches} onFilterChange={setFilter("branches")} viewMode={branchView} onViewModeChange={setBranchView}>
              {branchView === "tree" ? (
                renderTreeItems(buildTree(filteredBranches), 0, (b, d) => {
                  const st = branchStatusMap[b];
                  const badge = st && (st.ahead > 0 || st.behind > 0) ? st : null;
                  return (
                    <Item
                      key={b}
                      label={b.split('/').pop()}
                      badge={badge}
                      active={b === repoData.currentBranch}
                      onClick={() => handleBranchClick(b)}
                      onDoubleClick={() => handleBranchDblClick(b)}
                      onContextMenu={(e) => handleBranchContext(e, b)}
                      onDelete={b !== repoData.currentBranch ? () => confirmDeleteBranch(b) : undefined}
                      sx={d > 0 ? { pl: 2 + d * 2 } : undefined}
                    />
                  );
                }, branchExpandedFolders, toggleBranchFolder)
              ) : (
                filteredBranches.map(b => {
                  const st = branchStatusMap[b];
                  const badge = st && (st.ahead > 0 || st.behind > 0) ? st : null;
                  return (
                    <Item
                      key={b}
                      label={b}
                      badge={badge}
                      active={b === repoData.currentBranch}
                      onClick={() => handleBranchClick(b)}
                      onDoubleClick={() => handleBranchDblClick(b)}
                      onContextMenu={(e) => handleBranchContext(e, b)}
                      onDelete={b !== repoData.currentBranch ? () => confirmDeleteBranch(b) : undefined}
                    />
                  );
                })
              )}
            </Section>

            <Section title="Remote" count={repoData.remoteBranches?.length ?? 0} expanded={expandedSections.remote === true} onToggle={handleToggle("remote")} filter={filters.remote} onFilterChange={setFilter("remote")} viewMode={remoteView} onViewModeChange={setRemoteView}>
              {remoteView === "tree" ? (
                renderTreeItems(buildTree(filteredRemote), 0, (b, d) => (
                  <Item key={b} label={b.split('/').pop()} onClick={() => handleRemoteBranchClick(b)} onDoubleClick={() => handleRemoteBranchDblClick(b)} onDelete={() => confirmDeleteRemoteBranch(b)} sx={d > 0 ? { pl: 2 + d * 2 } : undefined} />
                ), remoteExpandedFolders, toggleRemoteFolder)
              ) : (
                filteredRemote.map(b => (
                  <Item key={b} label={b} onClick={() => handleRemoteBranchClick(b)} onDoubleClick={() => handleRemoteBranchDblClick(b)} onDelete={() => confirmDeleteRemoteBranch(b)} />
                ))
              )}
            </Section>

            <Section title="Tags" count={repoData.tags?.length ?? 0} expanded={expandedSections.tags === true} onToggle={handleToggle("tags")} onAdd={openNewTagDialog} filter={filters.tags} onFilterChange={setFilter("tags")}>
              {filteredTags.map(t => (
                <Item key={t} label={t} onClick={() => handleTagClick(t)} onDelete={() => confirmDeleteTag(t)} />
              ))}
            </Section>

            <Section title="Stash" count={repoData.stashList?.length ?? 0} expanded={expandedSections.stash === true} onToggle={handleToggle("stash")} onAdd={openNewStashDialog} filter={filters.stash} onFilterChange={setFilter("stash")}>
              {filteredStash.map(s => (
                <Item key={s.id} label={`${s.id}: ${s.message}`} onClick={() => handleStashClick(s.id)} onDoubleClick={() => handleStashDblClick(s.id)} onContextMenu={(e) => handleStashContext(e, s.id)} onDelete={() => confirmDropStash(s.id)} />
              ))}
            </Section>
          </>
        ) : (
          <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center", py: 4, px: 2 }}>
            Select a directory to view branches
          </Typography>
        )}
      </Drawer>

      <Dialog open={!!renameBranchName} onClose={() => setRenameBranchName(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Rename branch</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1, color: "text.secondary" }}>
            Rename <strong>{renameBranchName}</strong> to:
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label="New branch name"
            placeholder="e.g. feature/renamed-feature"
            value={renameNewName}
            onChange={e => setRenameNewName(e.target.value)}
            disabled={renaming}
            onKeyDown={e => { if (e.key === "Enter") handleRenameBranch(); }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameBranchName(null)} disabled={renaming}>Cancel</Button>
          <Button variant="contained" onClick={handleRenameBranch} disabled={!renameNewName.trim() || renameNewName.trim() === renameBranchName || renaming}>
            {renaming ? "Renaming..." : "Rename"}
          </Button>
        </DialogActions>
      </Dialog>

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

      <Menu
        open={!!branchContext}
        onClose={() => setBranchContext(null)}
        anchorReference="anchorPosition"
        anchorPosition={branchContext ? { left: branchContext.left, top: branchContext.top } : undefined}
      >
        <MenuItem onClick={handleContextCheckout} dense>
          <ListItemText primary="Checkout" primaryTypographyProps={{ variant: "body2" }} />
        </MenuItem>
        <MenuItem onClick={handleContextRename} dense>
          <ListItemText primary="Rename" primaryTypographyProps={{ variant: "body2" }} />
        </MenuItem>
        <MenuItem onClick={handleContextMerge} dense>
          <ListItemText primary="Merge into current branch" primaryTypographyProps={{ variant: "body2" }} />
        </MenuItem>
      </Menu>

      <Menu
        open={!!stashContext}
        onClose={() => setStashContext(null)}
        anchorReference="anchorPosition"
        anchorPosition={stashContext ? { left: stashContext.left, top: stashContext.top } : undefined}
      >
        <MenuItem onClick={handleStashShowChanges} dense>
          <ListItemText primary="Show changes" primaryTypographyProps={{ variant: "body2" }} />
        </MenuItem>
      </Menu>

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

      {showMerge && <MergeDialog onClose={() => { setShowMerge(false); setMergeBranch(null); }} defaultBranch={mergeBranch} />}

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
