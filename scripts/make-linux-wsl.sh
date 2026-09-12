#!/usr/bin/env bash
set -euo pipefail

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  . "$NVM_DIR/nvm.sh"
fi

cd "$(dirname "$0")/.."

if [ "$(uname -s)" != "Linux" ]; then
  echo "Run this script inside WSL or a Linux machine."
  exit 1
fi

missing=()
for cmd in git node npm dpkg fakeroot rpm rpmbuild; do
  command -v "$cmd" >/dev/null 2>&1 || missing+=("$cmd")
done

if [ ${#missing[@]} -gt 0 ]; then
  echo "Missing dependencies: ${missing[*]}"
  echo "Install them with: sudo apt update && sudo apt install -y dpkg fakeroot rpm"
  exit 1
fi

node_major=$(node -p "process.versions.node.split('.')[0]")
if [ "$node_major" -lt 18 ]; then
  echo "Node.js 18+ is required (found $(node -v))."
  exit 1
fi

if command -v yarn >/dev/null 2>&1; then
  yarn install --frozen-lockfile
else
  npm install
fi

npx electron-forge make --platform=linux

echo
echo "Artifacts:"
find out/make -type f \( -name "*.deb" -o -name "*.rpm" \) 2>/dev/null || true
