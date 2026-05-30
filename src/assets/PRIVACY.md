# Privacy Policy

**Last updated:** May 2026

Orchid Git ("the Software") is a desktop application for interacting with Git repositories. This privacy policy explains how user data is handled.

## Data Collection

**The Software does not collect, store, or transmit any personal data.**

Specifically:

- **No telemetry** — The Software does not send usage statistics, crash reports, or analytics to any server.
- **No user accounts** — The Software does not require registration, login, or any form of user account.
- **No personal information** — The Software does not ask for or store your name, email address, IP address, or any other personally identifiable information.
- **No cookies** — The Software does not use cookies or similar tracking technologies.
- **No third-party services** — The Software does not integrate with third-party analytics, advertising, or data collection services.

## Local Storage

The Software stores the following data exclusively on your local machine using the browser's `localStorage` API:

- **Last opened directory** — Used to reopen your last project on startup.
- **Recent directories list** — Used to show recently accessed repositories (max 8 entries).
- **Theme preference** — Dark or light theme selection.
- **Author merge list** — Configuration for Metrics author grouping.
- **Sort preferences** — Sort mode for recent directories and file change views.
- **Repository switch confirmation** — Whether to skip confirmation when switching repositories.

This data never leaves your machine. You can clear it at any time by:

1. Going to **Settings > Clear local storage** within the app, or
2. Clearing your application's localStorage via Electron's developer tools, or
3. Removing the application data directory manually.

## Git Operations

When you perform Git operations (push, pull, fetch, clone), the Software executes commands via the system-installed `git` CLI on your behalf. These operations connect directly to the Git remotes you have configured. The Software does not intercept, log, or transmit these communications beyond what the `git` command itself performs.

## Source Code

The Software is open source. Anyone can inspect the source code at the project's repository to verify that no data collection takes place.

## Risks

While the Software does not collect data, using it involves inherent risks common to desktop development tools:

- **Local file access** — The Software reads and writes files in your Git repositories. Malicious actors with access to your machine could use the Software to access these files.
- **Git credentials** — Git may cache credentials (username/password) or use SSH keys for authentication. These are managed by the system `git` CLI, not by the Software.
- **SSH agent forwarding** — If you use SSH agent forwarding, remote servers you connect to may access your local SSH keys. This is a property of Git and SSH, not of the Software.
- **Third-party dependencies** — The Software is built on open-source packages (npm). While dependencies are regularly updated, vulnerabilities in upstream packages could pose a risk.
- **Local storage persistence** — Preferences stored in `localStorage` are not encrypted and could be read by other applications running on the same machine.
- **Remote Git servers** — When you push, pull, or fetch, your code and commit metadata (author name, email) are transmitted to the configured remote servers. This is an inherent property of Git.
- **No warranty** — The Software is provided "as is" without warranty of any kind. See the MIT license for details.

## Changes to This Policy

If this policy changes, the "Last updated" date above will be updated. Users are encouraged to review this policy periodically.

## Contact

For questions about this privacy policy, open an issue at the project's repository.
