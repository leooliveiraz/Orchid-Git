import React, { useContext, useState, useCallback, useEffect } from "react";
import { Drawer, IconButton, Snackbar, Alert } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import "./LeftMenu.css";
import { OrchidContext } from "../OrchidContext.jsx";

function Section({ title, count, children, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen !== false);
  return (
    <div className="lm-section">
      <div className="lm-section-header" onClick={() => setOpen(!open)}>
        <span className="lm-arrow">{open ? "▼" : "▶"}</span>
        <span className="lm-title">{title}</span>
        <span className="lm-count">{count}</span>
      </div>
      {open && <div className="lm-section-body">{children}</div>}
    </div>
  );
}

function Item({ label, active, onDoubleClick }) {
  return (
    <div
      className={`lm-item ${active ? "lm-item-active" : ""}`}
      onDoubleClick={onDoubleClick}
      title={label}
    >
      <span className="lm-bullet">{active ? "●" : "○"}</span>
      <span className="lm-label">{label}</span>
    </div>
  );
}

export default function LeftMenu({ open, onRefresh }) {
  const { directory, repoData } = useContext(OrchidContext);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleBranchDblClick = useCallback(async (branch) => {
    if (!directory || !window.api) return;
    if (branch === repoData?.currentBranch) {
      setError("This branch is already selected");
      return;
    }
    setChecking(true);
    setError(null);
    try {
      await window.api.checkoutBranch(directory, branch);
      if (onRefresh) onRefresh();
    } catch (e) {
      setError(e.message || String(e));
    }
    setChecking(false);
  }, [directory, repoData, onRefresh]);

  const handleStashDblClick = useCallback(async (stashId) => {
    if (!directory || !window.api) return;
    setChecking(true);
    setError(null);
    try {
      await window.api.stashApply(directory, stashId);
      if (onRefresh) onRefresh();
    } catch (e) {
      setError(e.message || String(e));
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
      <div className="lm-header">
        <IconButton size="small" onClick={onRefresh} title="Refresh (F5)">
          <RefreshIcon fontSize="small" />
        </IconButton>
        <span className={checking ? "lm-checking" : ""}>
          {checking ? "Working..." : ""}
        </span>
      </div>

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
        <div className="lm-empty">Select a directory to view branches</div>
      )}

      <Snackbar open={!!error} autoHideDuration={5000} onClose={() => setError(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={() => setError(null)} severity="error" variant="filled" sx={{ width: "100%" }}>
          {error}
        </Alert>
      </Snackbar>
    </Drawer>
  );
}
