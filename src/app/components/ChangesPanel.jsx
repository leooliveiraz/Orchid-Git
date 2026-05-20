import React, { useEffect, useState, useCallback } from "react";

const STATUS_LABELS = {
  M: "Modified", A: "Added", D: "Deleted", R: "Renamed",
  "??": "Untracked", "!!": "Ignored",
};

const STATUS_COLORS = {
  M: "#e6a817", A: "#28a745", D: "#d73a49", R: "#6f42c1",
  "??": "#6a737d", "!!": "#6a737d",
};

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
    </div>
  );
}
