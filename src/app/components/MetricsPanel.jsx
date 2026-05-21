import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  Box, Typography, Paper, LinearProgress, Chip, TextField, Button, ToggleButtonGroup, ToggleButton,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
} from "@mui/material";
import MergeIcon from "@mui/icons-material/Merge";
import CloseIcon from "@mui/icons-material/Close";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Legend,
  ComposedChart, PieChart, Pie, Cell,
} from "recharts";

function formatDayTooltip(v) {
  try { const d = new Date(v + "T00:00:00"); return `${v} (${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()]})`; }
  catch(e) { return v; }
}

const COLORS = [
  "#1976d2", "#d32f2f", "#388e3c", "#f57c00", "#7b1fa2",
  "#00bcd4", "#607d8b", "#e91e63", "#4caf50", "#ff9800",
  "#3f51b5", "#009688", "#795548", "#9c27b0", "#cddc39",
  "#03a9f4", "#8bc34a", "#ff5722", "#673ab7", "#2196f3",
];
const GROUPS = [
  { label: "Day", value: "day" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
  { label: "Year", value: "year" },
];

function getWeek(dateStr) {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

function getGroupKey(date, groupBy) {
  const d = date.slice(0, 10);
  if (groupBy === "day") return d;
  if (groupBy === "week") return getWeek(d);
  if (groupBy === "month") return d.slice(0, 7);
  if (groupBy === "year") return d.slice(0, 4);
  return d;
}

export default function MetricsPanel({ directory }) {
  const [rawData, setRawData] = useState([]);
  const [extraData, setExtraData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState("day");
  const defaultFrom = (() => { const d = new Date(); d.setMonth(d.getMonth() - 3); return d.toISOString().slice(0, 10); })();
  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo, setDateTo] = useState("");
  const [appliedFrom, setAppliedFrom] = useState(defaultFrom);
  const [appliedTo, setAppliedTo] = useState("");
  const [authorMerge, setAuthorMerge] = useState(() => {
    try { return JSON.parse(localStorage.getItem("orchid-author-merge") || "{}"); }
    catch (e) { return {}; }
  });
  const [pendingMerge, setPendingMerge] = useState({});
  const [mergeOpen, setMergeOpen] = useState(false);
  const [hiddenAuthors, setHiddenAuthors] = useState(new Set());
  const [uniqueAuthors, setUniqueAuthors] = useState([]);

  useEffect(() => {
    localStorage.setItem("orchid-author-merge", JSON.stringify(authorMerge));
  }, [authorMerge]);

  const applyMergeRule = (from, to) => {
    setPendingMerge(prev => {
      const next = { ...prev };
      if (to && to !== from) {
        next[from] = to;
      } else {
        delete next[from];
      }
      return next;
    });
  };

  const openMergeDialog = () => {
    setPendingMerge({ ...authorMerge });
    setMergeOpen(true);
  };

  const closeMergeDialog = () => {
    setAuthorMerge(pendingMerge);
    setMergeOpen(false);
  };

  const cancelMergeDialog = () => {
    setMergeOpen(false);
  };

  const getMergedName = useCallback((name) => {
    return authorMerge[name] || name;
  }, [authorMerge]);

  useEffect(() => {
    if (!directory || !window.api) return;
    setLoading(true);
    Promise.all([
      window.api.getRepoMetrics(directory),
      window.api.getRepoMetricsExtra(directory),
    ]).then(([metrics, extra]) => {
      const list = metrics || [];
      setRawData(list);
      setExtraData(extra || {});
      const authors = [...new Set(list.map(d => d.author))].sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: "base" })
      );
      setUniqueAuthors(authors);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [directory]);

  const applyFilter = () => {
    setAppliedFrom(dateFrom);
    setAppliedTo(dateTo);
  };

  const clearFilter = () => {
    setDateFrom("");
    setDateTo("");
    setAppliedFrom("");
    setAppliedTo("");
  };

  const handleLegendClick = useCallback((e) => {
    const key = e.dataKey;
    setHiddenAuthors(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const { dailyTotals, dailyByAuthor, topAuthors, colors, pieData, dayOfWeek } = useMemo(() => {
    const totals = {};
    const byAuthor = {};
    const authorCounts = {};

    rawData.forEach(({ date, author }) => {
      const merged = getMergedName(author);
      const key = getGroupKey(date, groupBy);
      if (appliedFrom && date.slice(0, 10) < appliedFrom) return;
      if (appliedTo && date.slice(0, 10) > appliedTo) return;
      totals[key] = (totals[key] || 0) + 1;
      authorCounts[merged] = (authorCounts[merged] || 0) + 1;
      if (!byAuthor[key]) byAuthor[key] = {};
      byAuthor[key][merged] = (byAuthor[key][merged] || 0) + 1;
    });

    const sortedKeys = Object.keys(totals).sort();
    const dailyTotals = sortedKeys.map(key => ({ date: key, count: totals[key] }));

    const sortedAuthors = Object.entries(authorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .sort((a, b) => a[0].localeCompare(b[0], undefined, { sensitivity: "base" }))
      .map(([name]) => name);

    const colors = {};
    sortedAuthors.forEach((n, i) => { colors[n] = COLORS[i % COLORS.length]; });

    const dailyByAuthor = sortedKeys.map(key => {
      const entry = { date: key, total: totals[key] };
      sortedAuthors.forEach(a => { entry[a] = byAuthor[key]?.[a] || 0; });
      return entry;
    });

    const pieData = sortedAuthors.slice(0, 10).map(name => ({
      name,
      value: authorCounts[name],
      color: colors[name],
    }));

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];
    rawData.forEach(({ date }) => {
      if (appliedFrom && date < appliedFrom) return;
      if (appliedTo && date > appliedTo) return;
      const d = new Date(date);
      dayCounts[d.getDay()]++;
    });
    const dayOfWeek = dayNames.map((name, i) => ({ name, count: dayCounts[i] }));

    return { dailyTotals, dailyByAuthor, topAuthors: sortedAuthors, colors, pieData, dayOfWeek };
  }, [rawData, appliedFrom, appliedTo, groupBy, getMergedName]);

  if (loading) return (
    <Box sx={{ py: 4, textAlign: "center" }}>
      <LinearProgress sx={{ mb: 1 }} />
      <Typography variant="body2" sx={{ color: "text.secondary" }}>Loading metrics...</Typography>
    </Box>
  );
  if (!rawData.length) return <Typography variant="body2" sx={{ color: "text.secondary", p: 2 }}>No data available</Typography>;

  return (
    <Box sx={{ py: 2 }}>
      <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>Repository Metrics</Typography>

      <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap", mb: 2 }}>
        <TextField type="date" label="From" size="small"
          value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 160 }}
        />
        <TextField type="date" label="To" size="small"
          value={dateTo} onChange={e => setDateTo(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 160 }}
        />
        <Button variant="contained" size="small" onClick={applyFilter} disabled={!dateFrom && !dateTo}>
          Apply
        </Button>
        <Button variant="text" size="small" onClick={clearFilter}>
          All
        </Button>
      </Box>

      <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap", mb: 2 }}>
        <ToggleButtonGroup size="small" value={groupBy} exclusive onChange={(e, v) => v && setGroupBy(v)}>
          {GROUPS.map(g => <ToggleButton key={g.value} value={g.value} sx={{ fontSize: "0.75rem", px: 2 }}>{g.label}</ToggleButton>)}
        </ToggleButtonGroup>
        <Button size="small" startIcon={<MergeIcon />} onClick={openMergeDialog}>
          Merge authors
        </Button>
      </Box>

      <Dialog open={mergeOpen} onClose={cancelMergeDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          Merge authors
          <IconButton size="small" onClick={cancelMergeDialog} sx={{ ml: "auto" }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {uniqueAuthors.map(author => (
            <Box key={author} sx={{ display: "flex", gap: 1, alignItems: "center", mb: 1 }}>
              <Typography variant="body2" sx={{ minWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {author}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>→</Typography>
              <TextField
                size="small"
                placeholder="Merge into..."
                value={pendingMerge[author] || ""}
                onChange={e => applyMergeRule(author, e.target.value.trim())}
                sx={{ flex: 1 }}
              />
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelMergeDialog}>Cancel</Button>
          <Button variant="contained" onClick={closeMergeDialog}>Save & apply</Button>
        </DialogActions>
      </Dialog>

      <Typography variant="overline" sx={{ display: "block", color: "text.secondary", mb: 0.5 }}>
        Total commits per {groupBy}
      </Typography>
      <Paper variant="outlined" sx={{ p: 2, mb: 3, overflow: "visible" }}>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={dailyTotals} margin={{ top: 20, bottom: 60 }}>
            <XAxis dataKey="date" angle={-45} textAnchor="end" fontSize={11} tickMargin={8} />
            <YAxis allowDecimals={false} />
            <Tooltip wrapperStyle={{ zIndex: 1500 }} labelFormatter={formatDayTooltip} />
            <Bar dataKey="count" fill="#1976d2" radius={[2, 2, 0, 0]} maxBarSize={20} label={{ position: "top", fontSize: 10, fill: "var(--text-secondary)" }} />
          </BarChart>
        </ResponsiveContainer>
      </Paper>

      <Typography variant="overline" sx={{ display: "block", color: "text.secondary", mb: 0.5 }}>
        Commits per user per {groupBy}
      </Typography>
      {topAuthors.length > 0 && (
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 1 }}>
          {topAuthors.map(name => (
            <Chip key={name} label={name} size="small" variant={hiddenAuthors.has(name) ? "filled" : "outlined"}
              onClick={() => handleLegendClick({ dataKey: name })}
              sx={{
                fontSize: "0.65rem", fontWeight: 600, cursor: "pointer",
                color: hiddenAuthors.has(name) ? "text.disabled" : colors[name] || "#888",
                borderColor: colors[name] || "#888",
                bgcolor: hiddenAuthors.has(name) ? "action.hover" : "transparent",
              }}
            />
          ))}
        </Box>
      )}
      <Paper variant="outlined" sx={{ p: 2, mb: 3, overflow: "visible" }}>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={dailyByAuthor} margin={{ bottom: 60 }}>
            <XAxis dataKey="date" angle={-45} textAnchor="end" fontSize={11} tickMargin={8} />
            <YAxis allowDecimals={false} />
            <Tooltip wrapperStyle={{ zIndex: 1500 }} />
            {topAuthors.map(name => {
              if (hiddenAuthors.has(name)) return null;
              return (
                <Line key={name} type="monotone" dataKey={name} stroke={colors[name] || "#888"} strokeWidth={2} dot={false} />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </Paper>

      <Typography variant="overline" sx={{ display: "block", color: "text.secondary", mb: 0.5 }}>
        Combined (total + per user)
      </Typography>
      <Paper variant="outlined" sx={{ p: 2, mb: 3, overflow: "visible" }}>
        <ResponsiveContainer width="100%" height={250}>
          <ComposedChart data={dailyByAuthor} margin={{ bottom: 60 }}>
            <XAxis dataKey="date" angle={-45} textAnchor="end" fontSize={11} tickMargin={8} />
            <YAxis allowDecimals={false} />
            <Tooltip wrapperStyle={{ zIndex: 1500 }} />
            <Bar dataKey="total" fill="#1976d2" opacity={0.2} radius={[2, 2, 0, 0]} maxBarSize={20} />
            {topAuthors.map(name => (
              <Line key={name} type="monotone" dataKey={name} stroke={colors[name] || "#888"} strokeWidth={2} dot={false} />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </Paper>

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 3 }}>
        <Box sx={{ flex: "1 1 300px" }}>
          <Typography variant="overline" sx={{ display: "block", color: "text.secondary", mb: 0.5 }}>
            Commits by day of week
          </Typography>
          <Paper variant="outlined" sx={{ p: 1 }}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dayOfWeek} margin={{ top: 20 }}>
                <XAxis dataKey="name" fontSize={11} />
                <YAxis allowDecimals={false} />
                <Bar dataKey="count" fill="#1976d2" radius={[2, 2, 0, 0]} maxBarSize={30} label={{ position: "top", fontSize: 10, fill: "var(--text-secondary)" }} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Box>

        <Box sx={{ flex: "1 1 300px" }}>
          <Typography variant="overline" sx={{ display: "block", color: "text.secondary", mb: 0.5 }}>
            Author distribution
          </Typography>
          <Paper variant="outlined" sx={{ p: 1 }}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40} label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}>
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color || COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip wrapperStyle={{ zIndex: 1500 }} />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Box>
      </Box>

      {extraData?.hourData && (
        <Typography variant="overline" sx={{ display: "block", color: "text.secondary", mb: 0.5 }}>
          Commits by hour
        </Typography>
      )}
      {extraData?.hourData && (
        <Paper variant="outlined" sx={{ p: 1, mb: 3 }}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={extraData.hourData} margin={{ top: 20 }}>
              <XAxis dataKey="hour" fontSize={10} />
              <YAxis allowDecimals={false} />
              <Tooltip wrapperStyle={{ zIndex: 1500 }} />
              <Bar dataKey="count" fill="#1976d2" radius={[2, 2, 0, 0]} maxBarSize={20} label={{ position: "top", fontSize: 9, fill: "var(--text-secondary)" }} />
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      )}

      {extraData?.topFiles?.length > 0 && (
        <>
          <Typography variant="overline" sx={{ display: "block", color: "text.secondary", mb: 0.5 }}>
            Most changed files
          </Typography>
          <Paper variant="outlined" sx={{ p: 1, mb: 3 }}>
            <ResponsiveContainer width="100%" height={Math.min(extraData.topFiles.length * 28, 400)}>
              <BarChart data={extraData.topFiles} layout="vertical" margin={{ left: 20, right: 20 }}>
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="path" width={200} fontSize={9} tickFormatter={v => { const parts = v.replace(/\\/g, "/").split("/"); return parts[parts.length - 1]; }} />
                <Tooltip wrapperStyle={{ zIndex: 1500 }} />
                <Bar dataKey="count" fill="#1976d2" radius={[0, 2, 2, 0]} maxBarSize={16} label={{ position: "right", fontSize: 9, fill: "var(--text-secondary)" }} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </>
      )}
    </Box>
  );
}
