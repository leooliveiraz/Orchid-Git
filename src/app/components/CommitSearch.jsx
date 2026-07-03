import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { TextField, InputAdornment, Select, MenuItem, Typography, Box } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

const SEARCH_FIELDS = [
  { value: "all", label: "All fields" },
  { value: "hash", label: "Hash" },
  { value: "author", label: "Author" },
  { value: "message", label: "Message" },
  { value: "date", label: "Date" },
];

function matchesField(commit, field, query) {
  const q = query.toLowerCase();
  switch (field) {
    case "hash":
      return commit.hash.toLowerCase().includes(q);
    case "author":
      return commit.author.toLowerCase().includes(q);
    case "message":
      return commit.message.toLowerCase().includes(q);
    case "date":
      return commit.date.toLowerCase().includes(q);
    default: {
      if (commit.hash.toLowerCase().includes(q)) return true;
      if (commit.author.toLowerCase().includes(q)) return true;
      if (commit.message.toLowerCase().includes(q)) return true;
      if (commit.date.toLowerCase().includes(q)) return true;
      return false;
    }
  }
}

export default function CommitSearch({ commitList, visible, onFilter }) {
  const [query, setQuery] = useState("");
  const [field, setField] = useState("all");
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (visible) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [visible]);

  const filtered = useMemo(() => {
    if (!query.trim()) return commitList;
    return commitList.filter(c => matchesField(c, field, query.trim()));
  }, [commitList, query, field]);

  useEffect(() => {
    onFilter(filtered);
  }, [filtered, onFilter]);

  const handleQueryChange = useCallback((e) => {
    setQuery(e.target.value);
  }, []);

  return (
    <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
      <TextField
        inputRef={inputRef}
        placeholder="Search commits..."
        variant="outlined"
        size="small"
        value={query}
        onChange={handleQueryChange}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
            </InputAdornment>
          ),
        }}
        sx={{ flex: 1, minWidth: 200 }}
      />
      <Select
        size="small"
        value={field}
        onChange={(e) => setField(e.target.value)}
        sx={{ fontSize: "0.8rem", minWidth: 120 }}
      >
        {SEARCH_FIELDS.map(f => (
          <MenuItem key={f.value} value={f.value} sx={{ fontSize: "0.8rem" }}>
            {f.label}
          </MenuItem>
        ))}
      </Select>
      {query.trim() && (
        <Typography variant="caption" sx={{ color: "text.secondary", whiteSpace: "nowrap" }}>
          {filtered.length} matching commit{filtered.length !== 1 ? "s" : ""}
        </Typography>
      )}
    </Box>
  );
}
