import React, { useEffect, useState, useCallback } from "react";
import CommitDialog from "./CommitDialog.jsx";

const STATUS_LABELS = {
  M: "Modified", A: "Added", D: "Deleted", R: "Renamed",
  "??": "Untracked", "!!": "Ignored",
};

const STATUS_COLORS = {
  M: "#e6a817", A: "#28a745", D: "#d73a49", R: "#6f42c1",
  "??": "#6a737d", "!!": "#6a737d",
};

function ConfirmModal({ title, message, confirmLabel, onConfirm, onCancel }) {
  return (
    <div className="cd-overlay" onClick={onCancel}>
      <div className="cd-modal" onClick={e => e.stopPropagation()} style={{ width: 400 }}>
        <div className="cd-header">
          <h3 className="cd-title">{title}</h3>
          <button className="cd-close" onClick={onCancel}>✕</button>
        </div>
        <div className="cd-body">
          <p style={{ fontSize: 13, color: "var(--text-primary)", margin: 0 }}>{message}</p>
        </div>
        <div className="cd-footer">
          <button className="cd-btn" onClick={onCancel}>Cancel</button>
          <button className="cd-btn cd-btn-primary" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

function StatusFile({ file, onStage, onUnstage, onViewDiff }) {
  const label = STATUS_LABELS[file.type] || file.type;
  return (
    <div className="cp-file">
      <span className="cp-status" style={{ color: STATUS_COLORS[file.type] || "inherit" }}>
        {file.type}
      </span>
      <span className="cp-path" title={file.path}>{file.path}</span>
      <div className="cp-actions">
        {file.staged ? (
          <button className="cp-btn cp-btn-sm" onClick={() => onUnstage(file.path)}>Unstage</button>
        ) : (
          <button className="cp-btn cp-btn-sm" onClick={() => onStage(file.path)}>Stage</button>
        )}
        <button className="cp-btn cp-btn-sm" onClick={() => onViewDiff(file)}>Diff</button>
      </div>
    </div>
  );
}

export default function ChangesPanel({ directory }) {
  const [statusList, setStatusList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCommit, setShowCommit] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  const refresh = useCallback(async () => {
    if (!directory || !window.api) return;
    setLoading(true);
    setError(null);
    try {
      const data = await window.api.getStatus(directory);
      setStatusList(data);
    } catch (e) {
      setError(e.message || String(e));
    }
    setLoading(false);
  }, [directory]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 10000);
    return () => clearInterval(interval);
  }, [refresh]);

  const handleStage = async (path) => {
    try {
      await window.api.stageFile(directory, path);
      refresh();
    } catch (e) {
      setError(e.message || String(e));
    }
  };

  const handleUnstage = async (path) => {
    try {
      await window.api.unstageFile(directory, path);
      refresh();
    } catch (e) {
      setError(e.message || String(e));
    }
  };

  const handleStageAll = async () => {
    try {
      await window.api.stageAll(directory);
      refresh();
    } catch (e) {
      setError(e.message || String(e));
    }
  };

  const handleViewDiff = async (file) => {
    try {
      const diff = file.staged
        ? await window.api.getStagedDiff(directory, file.path)
        : await window.api.getDiff(directory, file.path);
      if (diff && diff.trim()) {
        alert(diff);
      } else {
        alert("No diff available");
      }
    } catch (e) {
      setError(e.message || String(e));
    }
  };

  const handleCommitClose = (didCommit) => {
    setShowCommit(false);
    if (didCommit) refresh();
  };

  const handlePush = async () => {
    setConfirmAction(null);
    setError(null);
    try {
      await window.api.push(directory);
      refresh();
    } catch (e) {
      setError(e.message || String(e));
    }
  };

  const handlePull = async () => {
    setConfirmAction(null);
    setError(null);
    try {
      await window.api.pull(directory);
      refresh();
    } catch (e) {
      setError(e.message || String(e));
    }
  };

  const staged = statusList.filter(f => f.staged);
  const unstaged = statusList.filter(f => !f.staged);

  return (
    <div className="cp-container">
      <div className="cp-toolbar">
        <span className={loading ? "cp-loading" : ""}>
          {loading ? "Refreshing..." : `${statusList.length} file(s)`}
        </span>
        <button className="cp-btn" onClick={refresh}>Refresh</button>
        <button className="cp-btn" onClick={handleStageAll}>Stage All</button>
        <button className="cp-btn cp-btn-primary" onClick={() => setShowCommit(true)} disabled={staged.length === 0}>
          Commit
        </button>
        <button className="cp-btn" onClick={() => setConfirmAction("push")}>▲ Push</button>
        <button className="cp-btn" onClick={() => setConfirmAction("pull")}>▼ Pull</button>
      </div>

      {error && <div className="cp-error">{error}</div>}

      <div className="cp-section">
        <div className="cp-section-title">Staged ({staged.length})</div>
        {staged.length === 0 && <div className="cp-empty">No staged files</div>}
        {staged.map(f => (
          <StatusFile key={"staged-" + f.path} file={f} onStage={handleStage} onUnstage={handleUnstage} onViewDiff={handleViewDiff} />
        ))}
      </div>

      <div className="cp-section">
        <div className="cp-section-title">Changes ({unstaged.length})</div>
        {unstaged.length === 0 && <div className="cp-empty">No changes</div>}
        {unstaged.map(f => (
          <StatusFile key={"unstaged-" + f.path} file={f} onStage={handleStage} onUnstage={handleUnstage} onViewDiff={handleViewDiff} />
        ))}
      </div>

      {showCommit && (
        <CommitDialog directory={directory} stagedFiles={staged} onClose={handleCommitClose} />
      )}

      {confirmAction === "push" && (
        <ConfirmModal
          title="Push"
          message="Push commits to the remote repository?"
          confirmLabel="Push"
          onConfirm={handlePush}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {confirmAction === "pull" && (
        <ConfirmModal
          title="Pull"
          message="Pull latest changes from the remote repository?"
          confirmLabel="Pull"
          onConfirm={handlePull}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}
