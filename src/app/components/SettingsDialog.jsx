import React, { useState, useEffect, useContext, useCallback } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Alert, LinearProgress,
  FormControlLabel, Checkbox, Typography, Box, Divider,
  FormControl, InputLabel, Select, MenuItem,
} from "@mui/material";
import { OrchidContext } from "../OrchidContext.jsx";

export default function SettingsDialog({ onClose }) {
  const { directory, dateFormat, setDateFormat } = useContext(OrchidContext);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [originUrl, setOriginUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [skipConfirm, setSkipConfirm] = useState(() => localStorage.getItem("orchid-skip-repo-switch") === "true");
  const [forcePushEnabled, setForcePushEnabled] = useState(() => localStorage.getItem("orchid-force-push-enabled") === "true");

  useEffect(() => {
    if (!directory || !window.api) return;
    setLoading(true);
    Promise.all([
      window.api.getUserConfig(directory),
      window.api.getOriginUrl(directory),
    ]).then(([{ name, email }, origin]) => {
      setName(name || "");
      setEmail(email || "");
      setOriginUrl(origin || "");
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [directory]);

  const openPrivacy = useCallback(() => {
    const w = window.open("", "_blank", "width=750,height=650");
    if (!w) return;
    w.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Privacy Policy</title>
<style>
body{font-family:sans-serif;max-width:750px;margin:40px auto;padding:0 24px;line-height:1.7;color:#222}
h1{color:#111;border-bottom:1px solid #ddd;padding-bottom:8px}
h2{color:#222;margin-top:32px;border-bottom:1px solid #eee;padding-bottom:4px}
li{margin:8px 0}strong{color:#000}
.lang-btn{cursor:pointer;background:#e8e8e8;border:1px solid #aaa;border-radius:4px;padding:6px 18px;font-size:13px}
.lang-btn:hover{background:#d4d4d4}.header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
</style></head><body>
<div class="header">
<h1>Privacy Policy</h1>
<button class="lang-btn" id="langBtn">Portugu\u00eas</button>
</div>
<p><em>Last updated: May 2026</em></p>
<div id="en">
<p>Orchid Git ("the Software") is a desktop application for interacting with Git repositories. This privacy policy explains how user data is handled.</p>
<h2>Data Collection</h2>
<p><strong>The Software does not collect, store, or transmit any personal data.</strong></p>
<ul>
<li><strong>No telemetry</strong> — No usage statistics, crash reports, or analytics are sent to any server.</li>
<li><strong>No user accounts</strong> — No registration, login, or any form of user account.</li>
<li><strong>No personal information</strong> — No name, email, IP address, or any PII is stored.</li>
<li><strong>No cookies</strong> — No cookies or tracking technologies.</li>
<li><strong>No third-party services</strong> — No analytics, advertising, or data collection services.</li>
</ul>
<h2>Local Storage</h2>
<p>The Software stores preferences exclusively on your local machine using <code>localStorage</code>: last opened directory, recent directories, theme preference, author merge list, sort preferences, and repo switch confirmation. This data never leaves your machine.</p>
<h2>Git Operations</h2>
<p>When you perform Git operations (push, pull, fetch, clone), the Software executes commands via the system <code>git</code> CLI. These connect directly to the remotes you configure. The Software does not intercept, log, or transmit these communications.</p>
<h2>Source Code</h2>
<p>The Software is open source. Anyone can inspect the source code to verify that no data collection takes place.</p>
<h2>Risks</h2>
<ul>
<li><strong>Local file access</strong> — Reads/writes files in your Git repositories.</li>
<li><strong>Git credentials</strong> — Managed by system <code>git</code>, not by this Software.</li>
<li><strong>SSH agent forwarding</strong> — Remote servers may access local SSH keys.</li>
<li><strong>Third-party dependencies</strong> — Built on npm; upstream vulnerabilities are possible.</li>
<li><strong>localStorage</strong> — Preferences not encrypted; readable by other apps.</li>
<li><strong>Remote Git servers</strong> — Code and metadata transmitted on push/pull/fetch.</li>
<li><strong>No warranty</strong> — Provided "as is" under MIT license.</li>
</ul>
<h2>Changes</h2>
<p>The "Last updated" date is updated when this policy changes.</p>
<h2>Contact</h2>
<p>Open an issue at the project's repository for questions.</p>
</div>
<div id="pt" style="display:none">
<h1>Pol\u00edtica de Privacidade</h1>
<p><em>\u00daltima atualiza\u00e7\u00e3o: Maio de 2026</em></p>
<p>Orchid Git ("o Software") \u00e9 um aplicativo desktop para interagir com reposit\u00f3rios Git. Esta pol\u00edtica explica como os dados do usu\u00e1rio s\u00e3o tratados.</p>
<h2>Coleta de Dados</h2>
<p><strong>O Software n\u00e3o coleta, armazena ou transmite nenhum dado pessoal.</strong></p>
<ul>
<li><strong>Sem telemetria</strong> — Sem envio de estat\u00edsticas, relat\u00f3rios ou analytics.</li>
<li><strong>Sem contas</strong> — Sem registro ou login.</li>
<li><strong>Sem informa\u00e7\u00f5es pessoais</strong> — Sem nome, e-mail, IP ou PII.</li>
<li><strong>Sem cookies</strong> — Sem cookies ou rastreamento.</li>
<li><strong>Sem terceiros</strong> — Sem analytics, publicidade ou coleta.</li>
</ul>
<h2>Armazenamento Local</h2>
<p>Prefer\u00eancias armazenadas exclusivamente via <code>localStorage</code>: \u00faltimo diret\u00f3rio, recentes, tema, lista de autores, ordena\u00e7\u00e3o e confirma\u00e7\u00e3o de troca. Nunca saem da sua m\u00e1quina.</p>
<h2>Opera\u00e7\u00f5es Git</h2>
<p>Ao fazer push/pull/fetch/clone, o Software executa comandos git via CLI. Conecta-se diretamente aos remotos configurados. N\u00e3o intercepta, registra ou transmite estas comunica\u00e7\u00f5es.</p>
<h2>C\u00f3digo Fonte</h2>
<p>Open source. Qualquer pessoa pode inspecionar o c\u00f3digo para verificar que n\u00e3o h\u00e1 coleta de dados.</p>
<h2>Riscos</h2>
<ul>
<li><strong>Acesso local</strong> — L\u00ea/escreve arquivos nos reposit\u00f3rios Git.</li>
<li><strong>Credenciais</strong> — Gerenciadas pelo <code>git</code> do sistema.</li>
<li><strong>Forwarding SSH</strong> — Servidores remotos podem acessar chaves SSH.</li>
<li><strong>Depend\u00eancias</strong> — Pacotes npm; vulnerabilidades poss\u00edveis.</li>
<li><strong>localStorage</strong> — Prefer\u00eancias n\u00e3o criptografadas.</li>
<li><strong>Servidores remotos</strong> — C\u00f3digo e metadados transmitidos.</li>
<li><strong>Sem garantia</strong> — "Como est\u00e1" sob licen\u00e7a MIT.</li>
</ul>
<h2>Altera\u00e7\u00f5es</h2>
<p>A data de "\u00daltima atualiza\u00e7\u00e3o" \u00e9 atualizada quando esta pol\u00edtica muda.</p>
<h2>Contato</h2>
<p>Abra uma issue no reposit\u00f3rio do projeto.</p>
</div>
</body></html>`);
    w.document.close();
    w.document.getElementById("langBtn").onclick = function() {
      var en = w.document.getElementById("en");
      var pt = w.document.getElementById("pt");
      var btn = w.document.getElementById("langBtn");
      var showingPt = pt.style.display !== "none";
      en.style.display = showingPt ? "block" : "none";
      pt.style.display = showingPt ? "none" : "block";
      btn.textContent = showingPt ? "Portugu\u00eas" : "English";
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await window.api.setUserConfig(directory, name, email);
      if (originUrl.trim()) {
        await window.api.setOriginUrl(directory, originUrl.trim());
      }
      setSuccess("Settings saved");
    } catch (e) {
      setError(e.message || String(e));
    }
    setSaving(false);
  };

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Repository Settings</DialogTitle>
      {loading && <LinearProgress />}
      <DialogContent>
        {!loading && (
          <>
            <Typography variant="overline" sx={{ display: "block", color: "text.secondary", mb: 1 }}>User</Typography>
            <TextField
              autoFocus
              fullWidth
              label="User name"
              placeholder="git config user.name"
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={saving}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="User email"
              placeholder="git config user.email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={saving}
              sx={{ mb: 2 }}
            />

            <Divider sx={{ my: 2 }} />
            <Typography variant="overline" sx={{ display: "block", color: "text.secondary", mb: 1 }}>Remote</Typography>
            <TextField
              fullWidth
              label="Origin URL"
              placeholder="https://github.com/user/repo.git"
              value={originUrl}
              onChange={e => setOriginUrl(e.target.value)}
              disabled={saving}
              sx={{ mb: 2 }}
            />

            <Divider sx={{ mt: 2, mb: 1 }} />
            <FormControlLabel
              control={<Checkbox checked={skipConfirm}
                onChange={e => {
                  setSkipConfirm(e.target.checked);
                  localStorage.setItem("orchid-skip-repo-switch", e.target.checked ? "true" : "false");
                }}
              />}
              label={<Typography variant="body2">Don't ask when switching repositories</Typography>}
            />
            <FormControlLabel
              control={<Checkbox checked={forcePushEnabled}
                onChange={e => {
                  setForcePushEnabled(e.target.checked);
                  localStorage.setItem("orchid-force-push-enabled", e.target.checked ? "true" : "false");
                  window.dispatchEvent(new CustomEvent("force-push-setting-changed", { detail: e.target.checked }));
                }}
              />}
              label={<Typography variant="body2">Enable force push</Typography>}
            />

            <Divider sx={{ mt: 2, mb: 1 }} />
            <Typography variant="overline" sx={{ display: "block", color: "text.secondary", mb: 1 }}>Display</Typography>
            <FormControl fullWidth size="small" sx={{ mb: 1 }}>
              <InputLabel>Date format</InputLabel>
              <Select value={dateFormat} label="Date format"
                onChange={e => setDateFormat(e.target.value)}>
                <MenuItem value="">Default (git native)</MenuItem>
                <MenuItem value="locale-date">Locale date</MenuItem>
                <MenuItem value="locale-datetime">Locale date + time</MenuItem>
                <MenuItem value="locale-full">Locale full</MenuItem>
                <MenuItem value="relative">Relative (X ago)</MenuItem>
                <MenuItem value="iso">ISO 8601</MenuItem>
              </Select>
            </FormControl>

            <Divider sx={{ mt: 2, mb: 1 }} />
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
              Orchid Git does not collect any personal data.
              {" "}
              <Box
                component="span"
                onClick={openPrivacy}
                sx={{ cursor: "pointer", color: "primary.main", textDecoration: "underline", display: "inline" }}
              >
                Privacy Policy
              </Box>
            </Typography>
          </>
        )}
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Close</Button>
        <Button variant="contained" onClick={handleSave} disabled={loading || saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
