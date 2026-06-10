import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  Box, Typography, LinearProgress, TextField, Paper, Chip, ToggleButtonGroup, ToggleButton, Button,
  List, ListItem, ListItemIcon, ListItemText, Menu, MenuItem,
} from "@mui/material";
import FolderIcon from "@mui/icons-material/Folder";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import SearchIcon from "@mui/icons-material/Search";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import UnfoldLessIcon from "@mui/icons-material/UnfoldLess";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import FileViewDialog from "./FileViewDialog.jsx";
import SuccessSnackbar from "./SuccessSnackbar.jsx";

function buildTree(files) {
  const root = { name: "", children: {}, files: [] };
  files.forEach(path => {
    const parts = path.replace(/\\/g, "/").split("/");
    let node = root;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!node.children[parts[i]]) node.children[parts[i]] = { name: parts[i], children: {}, files: [] };
      node = node.children[parts[i]];
    }
    node.files.push(parts[parts.length - 1]);
  });
  return root;
}

function getAllDirPaths(node, prefix) {
  let paths = [];
  for (const [name, child] of Object.entries(node.children)) {
    const p = prefix ? `${prefix}/${name}` : name;
    paths.push(p);
    paths = paths.concat(getAllDirPaths(child, p));
  }
  return paths;
}

function getDirAndSubPaths(node, prefix, target) {
  let paths = [];
  for (const [name, child] of Object.entries(node.children)) {
    const p = prefix ? `${prefix}/${name}` : name;
    if (p === target || p.startsWith(target + "/")) {
      paths.push(p);
      paths = paths.concat(getAllDirPaths(child, p));
    } else {
      paths = paths.concat(getDirAndSubPaths(child, p, target));
    }
  }
  return paths;
}

export default function FileExplorer({ directory }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("tree");
  const [compact, setCompact] = useState(true);
  const [search, setSearch] = useState("");
  const [viewFile, setViewFile] = useState(null);
  const [expanded, setExpanded] = useState(new Set());
  const [contextMenu, setContextMenu] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (!directory || !window.api) return;
    setLoading(true);
    window.api.getRepoFiles(directory).then(list => {
      setFiles(list || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [directory]);

  const filtered = useMemo(() => {
    if (!search.trim()) return files;
    const q = search.toLowerCase();
    return files.filter(f => f.toLowerCase().includes(q));
  }, [files, search]);

  const tree = useMemo(() => buildTree(filtered), [filtered]);

  const toggleDir = useCallback((path) => {
    setExpanded(prev => {
      const next = new Set(prev);
      const allPaths = getAllDirPaths(tree, "");
      const affected = allPaths.filter(p => p === path || p.startsWith(path + "/"));
      const allExpanded = affected.every(p => next.has(p));
      if (allExpanded) {
        affected.forEach(p => next.delete(p));
      } else {
        affected.forEach(p => next.add(p));
      }
      return next;
    });
  }, [tree]);

  const expandAll = useCallback(() => {
    const allPaths = getAllDirPaths(tree, "");
    setExpanded(new Set(allPaths));
  }, [tree]);

  const collapseAll = useCallback(() => {
    setExpanded(new Set());
  }, []);

  const handleContextMenu = useCallback((e, entryPath) => {
    e.preventDefault();
    setContextMenu({ left: e.clientX, top: e.clientY, entryPath });
  }, []);

  const handleAddToGitignore = useCallback(async () => {
    if (!contextMenu || !directory || !window.api?.addGitignoreEntry) return;
    try {
      const result = await window.api.addGitignoreEntry(directory, contextMenu.entryPath);
      if (result.status === "added") {
        setSuccess(`Added "${contextMenu.entryPath}" to .gitignore`);
      } else if (result.status === "already-present") {
        setSuccess(`"${contextMenu.entryPath}" is already in .gitignore`);
      }
    } catch (e) {
      console.error(e);
    }
    setContextMenu(null);
  }, [contextMenu, directory]);

  const handleRemoveFromGitignore = useCallback(async () => {
    if (!contextMenu || !directory || !window.api?.removeGitignoreEntry) return;
    try {
      const result = await window.api.removeGitignoreEntry(directory, contextMenu.entryPath);
      if (result.status === "removed") {
        setSuccess(`Removed "${contextMenu.entryPath}" from .gitignore`);
      } else if (result.status === "not-found") {
        setSuccess(`"${contextMenu.entryPath}" not found in .gitignore`);
      }
    } catch (e) {
      console.error(e);
    }
    setContextMenu(null);
  }, [contextMenu, directory]);

  function resolveCompact(node, prefix) {
    let current = node;
    let path = prefix;
    let chain = [];
    while (current) {
      const dirs = Object.values(current.children);
      if (dirs.length === 1 && current.files.length === 0) {
        chain.push(dirs[0].name);
        path = path ? `${path}/${dirs[0].name}` : dirs[0].name;
        current = dirs[0];
      } else {
        break;
      }
    }
    return { node: current, path, chain };
  }

  function renderTree(node, prefix, depth) {
    const dirs = Object.values(node.children).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    const sortedFiles = [...node.files].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

    return (
      <Box>
        {dirs.map(d => {
          let p = prefix ? `${prefix}/${d.name}` : d.name;
          let displayNode = d;
          let displayPath = p;
          let chain = [];

          if (compact) {
            const resolved = resolveCompact(d, p);
            displayNode = resolved.node;
            displayPath = resolved.path;
            chain = resolved.chain;
          }

          const isOpen = expanded.has(displayPath);
          const subCount = getAllDirPaths(displayNode, displayPath).length + displayNode.files.length;
          const label = chain.length > 0 ? `${d.name}/.../${chain[chain.length - 1]}` : d.name;
          return (
            <Box key={d.name}>
              <ListItem dense disablePadding
                onClick={() => toggleDir(displayPath)}
                onContextMenu={(e) => handleContextMenu(e, displayPath + "/")}
                sx={{ pl: 1, py: 0.15, cursor: "pointer", borderRadius: 1, opacity: chain.length > 0 ? 0.85 : 1 }}
                title={displayPath}
              >
                <ListItemIcon sx={{ minWidth: 28 }}>
                  {isOpen ? <FolderOpenIcon sx={{ fontSize: 18, color: "warning.main" }} /> : <FolderIcon sx={{ fontSize: 18, color: "warning.main" }} />}
                </ListItemIcon>
                <ListItemText
                  primary={label}
                  primaryTypographyProps={{ variant: "body2", sx: { fontWeight: 600, fontSize: "0.8125rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }}
                />
                {chain.length > 0 && (
                  <Typography variant="caption" sx={{ color: "text.disabled", fontSize: "0.6rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 120, mr: 0.5 }}>
                    {chain.slice(0, -1).join("/")}
                  </Typography>
                )}
                <Typography variant="caption" sx={{ color: "text.disabled", minWidth: 20, textAlign: "right", mr: 1 }}>{subCount}</Typography>
              </ListItem>
              {isOpen && <Box sx={{ pl: 2 }}>{renderTree(displayNode, displayPath, depth + 1)}</Box>}
            </Box>
          );
        })}
        {sortedFiles.map(f => {
          const fullPath = prefix ? `${prefix}/${f}` : f;
          return (
            <ListItem dense disablePadding key={f} onClick={() => setViewFile(fullPath)}
              onContextMenu={(e) => handleContextMenu(e, fullPath)}
              sx={{ pl: 1, py: 0.15, cursor: "pointer", borderRadius: 1 }}
            >
              <ListItemIcon sx={{ minWidth: 28 }}>
                <InsertDriveFileIcon sx={{ fontSize: 16, color: "text.disabled" }} />
              </ListItemIcon>
              <ListItemText
                primary={f}
                primaryTypographyProps={{
                  variant: "body2",
                  sx: { fontSize: "0.75rem", cursor: "pointer", "&:hover": { textDecoration: "underline" } },
                }}
              />
            </ListItem>
          );
        })}
      </Box>
    );
  }

  if (loading) return <LinearProgress sx={{ mt: 2 }} />;

  return (
    <Box sx={{ py: 1 }}>
      <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 1, flexWrap: "wrap" }}>
        <TextField
          size="small"
          placeholder="Search files..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{ startAdornment: <SearchIcon sx={{ fontSize: 16, mr: 0.5, color: "text.secondary" }} /> }}
          sx={{ flex: 1, minWidth: 200 }}
        />
        <ToggleButtonGroup size="small" value={view} exclusive onChange={(e, v) => v && setView(v)}>
          <ToggleButton value="tree" sx={{ fontSize: "0.75rem" }}>Tree</ToggleButton>
          <ToggleButton value="flat" sx={{ fontSize: "0.75rem" }}>Flat</ToggleButton>
        </ToggleButtonGroup>
        {view === "tree" && (
          <>
            <Button size="small" variant={compact ? "contained" : "outlined"} 
              onClick={() => setCompact(!compact)}
              startIcon={<AccountTreeIcon />} sx={{ fontSize: "0.7rem" }}>
              Compact
            </Button>
            <Button size="small" startIcon={<UnfoldMoreIcon />} onClick={expandAll} sx={{ fontSize: "0.7rem" }}>
              Expand all
            </Button>
            <Button size="small" startIcon={<UnfoldLessIcon />} onClick={collapseAll} sx={{ fontSize: "0.7rem" }}>
              Collapse all
            </Button>
          </>
        )}
        <Chip label={`${files.length} files`} size="small" variant="outlined" sx={{ fontSize: "0.7rem" }} />
      </Box>

      <Paper variant="outlined" sx={{ p: 0.5, maxHeight: "65vh", overflow: "auto" }}>
        {view === "tree" && (
          <List dense disablePadding>
            {renderTree(tree, "", 0)}
          </List>
        )}

        {view === "flat" && (
          <List dense disablePadding>
            {filtered.map(f => (
              <ListItem key={f} onClick={() => setViewFile(f)}
                onContextMenu={(e) => handleContextMenu(e, f)}
                sx={{ py: 0.15, cursor: "pointer", borderRadius: 1 }}
              >
                <ListItemIcon sx={{ minWidth: 28 }}>
                  <InsertDriveFileIcon sx={{ fontSize: 16, color: "text.disabled" }} />
                </ListItemIcon>
                <ListItemText
                  primary={f}
                  primaryTypographyProps={{
                    variant: "body2",
                    sx: { fontSize: "0.75rem", cursor: "pointer", "&:hover": { textDecoration: "underline" } },
                  }}
                />
              </ListItem>
            ))}
          </List>
        )}

        {filtered.length === 0 && (
          <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center", py: 4 }}>
            No files found
          </Typography>
        )}
      </Paper>

      {viewFile && (
        <FileViewDialog
          directory={directory}
          fileName={viewFile}
          onClose={() => setViewFile(null)}
        />
      )}

      <Menu open={!!contextMenu} onClose={() => setContextMenu(null)}
        anchorReference="anchorPosition"
        anchorPosition={contextMenu ? { left: contextMenu.left, top: contextMenu.top } : undefined}>
        <MenuItem onClick={handleAddToGitignore} dense>
          Add to .gitignore
        </MenuItem>
        <MenuItem onClick={handleRemoveFromGitignore} dense>
          Remove from .gitignore
        </MenuItem>
      </Menu>

      <SuccessSnackbar message={success} onClose={() => setSuccess(null)} />
    </Box>
  );
}
