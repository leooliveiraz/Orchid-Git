import React, { useEffect } from "react";

export default function SuccessSnackbar({ message, onClose, duration = 3000 }) {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [message, onClose, duration]);

  if (!message) return null;

  return (
    <div className="snackbar snackbar-success" onClick={onClose}>
      {message}
    </div>
  );
}
