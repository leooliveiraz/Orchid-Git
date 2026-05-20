import React, { useState } from "react";

export default function CloneDialog({ onClose }) {
  const [url, setUrl] = useState("");
  const [destPath, setDestPath] = useState("");
  const [cloning, setCloning] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleBrowse = async () => {
    if (!window.api) return;
    const data = await window.api.selectDirectory("");
    if (!data.canceled) {
      setDestPath(data.filePaths[0]);
    }
  };

  const handleClone = async () => {
    if (!url.trim() || !destPath.trim()) return;
    setCloning(true);
    setError(null);
    setSuccess(null);
    try {
      await window.api.clone(url.trim(), destPath);
      setSuccess(`Repository cloned to ${destPath}`);
    } catch (e) {
      setError(e.message || String(e));
    }
    setCloning(false);
  };

  return (
    <div className="cd-overlay" onClick={() => !cloning && onClose()}>
      <div className="cd-modal" onClick={e => e.stopPropagation()}>
        <div className="cd-header">
          <h3 className="cd-title">Clone Repository</h3>
          <button className="cd-close" onClick={() => onClose()} disabled={cloning}>✕</button>
        </div>

        <div className="cd-body">
          <div className="cl-field">
            <label className="cl-label">Repository URL</label>
            <input
              className="cl-input"
              type="text"
              placeholder="https://github.com/user/repo.git"
              value={url}
              onChange={e => setUrl(e.target.value)}
              disabled={cloning}
              autoFocus
            />
          </div>

          <div className="cl-field">
            <label className="cl-label">Destination directory</label>
            <div className="cl-row">
              <input
                className="cl-input cl-input-flex"
                type="text"
                placeholder="/path/to/destination"
                value={destPath}
                onChange={e => setDestPath(e.target.value)}
                disabled={cloning}
              />
              <button className="cp-btn" onClick={handleBrowse} disabled={cloning}>Browse</button>
            </div>
          </div>

          {error && <div className="cd-error">{error}</div>}
          {success && <div className="cl-success">{success}</div>}
        </div>

        <div className="cd-footer">
          <button className="cd-btn" onClick={() => onClose()} disabled={cloning}>Cancel</button>
          <button
            className="cd-btn cd-btn-primary"
            onClick={handleClone}
            disabled={!url.trim() || !destPath.trim() || cloning}
          >
            {cloning ? "Cloning..." : "Clone"}
          </button>
        </div>
      </div>
    </div>
  );
}
