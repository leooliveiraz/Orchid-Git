import React from "react";
import { Diff, Hunk, parseDiff } from "react-diff-view";

export default function DiffViewer({ fileName, diffText, onClose }) {
  const files = parseDiff(diffText || "");
  const hasContent = files.some(f => f.hunks?.length > 0);

  return (
    <div className="cd-overlay" onClick={onClose}>
      <div className="dv-modal" onClick={e => e.stopPropagation()}>
        <div className="cd-header">
          <h3 className="cd-title">{fileName}</h3>
          <button className="cd-close" onClick={onClose}>✕</button>
        </div>
        <div className="dv-body">
          {!hasContent && <div className="dv-empty">No changes</div>}
          {hasContent && files.map(file => (
            <div key={file.newPath || file.oldPath} className="dv-file">
              <div className="dv-file-path">{file.newPath || file.oldPath}</div>
              <Diff
                className="dv-diff"
                diffType={file.type}
                hunks={file.hunks}
                viewType="unified"
              >
                {hunks => hunks.map(hunk => (
                  <Hunk key={hunk.content} hunk={hunk} />
                ))}
              </Diff>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
