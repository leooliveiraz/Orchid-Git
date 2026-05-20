import React, { useState } from "react";

export default function CommitDialog({ directory, stagedFiles, onClose }) {
  const [message, setMessage] = useState("");
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState(null);

  const handleCommit = async () => {
    if (!message.trim()) return;
    setCommitting(true);
    setError(null);
    try {
      await window.api.commit(directory, message.trim());
      onClose(true);
    } catch (e) {
      setError(e.message || String(e));
    }
    setCommitting(false);
  };

  return (
    <div className="cd-overlay" onClick={() => !committing && onClose(false)}>
      <div className="cd-modal" onClick={e => e.stopPropagation()}>
        <div className="cd-header">
          <h3 className="cd-title">Commit changes</h3>
          <button className="cd-close" onClick={() => onClose(false)} disabled={committing}>✕</button>
        </div>

        <div className="cd-body">
          <textarea
            className="cd-textarea"
            placeholder="Commit message"
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleCommit(); }}
            disabled={committing}
            autoFocus
          />

          <div className="cd-section-title">Staged files ({stagedFiles.length})</div>
          <div className="cd-files">
            {stagedFiles.map(f => (
              <div key={f.path} className="cd-file">
                <span className="cd-status" style={{ color: "#28a745" }}>A</span>
                <span className="cd-path">{f.path}</span>
              </div>
            ))}
          </div>

          {error && <div className="cd-error">{error}</div>}
        </div>

        <div className="cd-footer">
          <button className="cd-btn" onClick={() => onClose(false)} disabled={committing}>Cancel</button>
          <button
            className="cd-btn cd-btn-primary"
            onClick={handleCommit}
            disabled={!message.trim() || committing}
          >
            {committing ? "Committing..." : "Commit"}
          </button>
        </div>
      </div>
    </div>
  );
}
