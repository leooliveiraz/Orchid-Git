import React from "react";
import { Snackbar, Alert } from "@mui/material";

export default function SuccessSnackbar({ message, onClose, duration = 3000 }) {
  if (!message) return null;

  return (
    <Snackbar open autoHideDuration={duration} onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
      <Alert onClose={onClose} severity="success" variant="filled" sx={{ width: "100%" }}>
        {message}
      </Alert>
    </Snackbar>
  );
}
