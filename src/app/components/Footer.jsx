import React from "react";
import { Typography, Link } from "@mui/material";

const LINKEDIN_URL = "https://www.linkedin.com/in/leorocha-dev";

export default function Footer() {
  return (
    <Typography variant="caption" sx={{ display: "block", textAlign: "center", pt: 1, mt: 1, px: 2, pb: 1, color: "text.secondary", borderTop: "1px solid", borderColor: "divider" }}>
      Made with ❤️ by Leonardo Rocha. Loving the app?{" "}
      <Link
        href={LINKEDIN_URL}
        onClick={(e) => { e.preventDefault(); window.api?.openExternal?.(LINKEDIN_URL); }}
        underline="hover"
        sx={{ fontSize: "inherit" }}
      >
        Drop me a line on LinkedIn!
      </Link>
    </Typography>
  );
}
