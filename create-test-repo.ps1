<#
.SYNOPSIS
  Creates a test Git repository for testing OrchidGit.
#>

param(
  [string]$RepoPath = (Join-Path $HOME "orchidgit-test")
)

$ErrorActionPreference = "Stop"

function Write-Step { param([string]$Msg) Write-Host "`n=== $Msg ===" -ForegroundColor Cyan }
function Write-OK  { param([string]$Msg) Write-Host "  $Msg" -ForegroundColor Green }

if (Test-Path $RepoPath) { Remove-Item -Recurse -Force $RepoPath }
New-Item -ItemType Directory -Path $RepoPath -Force | Out-Null
Push-Location $RepoPath

Write-Step "1. Initializing repo"
git init
git config user.name "Alice Silva"
git config user.email "alice@example.com"

function New-File($Path, $Content) {
  $full = Join-Path (Get-Location) $Path
  $dir = Split-Path $full -Parent
  if ($dir -and !(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  [System.IO.File]::WriteAllText($full, $Content, [System.Text.Encoding]::ASCII)
}

function Commit($Author, $Email, $Msg) {
  git -c "user.name=$Author" -c "user.email=$Email" commit --allow-empty -m $Msg
  if ($LASTEXITCODE -ne 0) { throw "Commit failed: $Msg" }
}

function CAddCommit($Author, $Email, $Msg) {
  git add -A
  Commit $Author $Email $Msg
}

# ──────────────────────────────────────────────
# Phase 1: Foundation
# ──────────────────────────────────────────────
Write-Step "2. Phase 1: Foundational commits"

New-File "README.md" @"
# OrchidGit Test Repository

This repository is used for testing the OrchidGit GUI application.

## Features tested
- Commit graph visualization
- Branch management
- Merge and rebase operations
- Stash operations
- Conflict resolution
- File history and blame
- Repository metrics
- Tag management
- Remote operations (simulated)
"@
CAddCommit "Alice Silva" "alice@example.com" "Initial commit: add README"

New-File "src/main.py" @"
#!/usr/bin/env python3
print('Hello from OrchidGit test project!')

def greet(name):
    return f'Hello, {name}!'

if __name__ == '__main__':
    print(greet('OrchidGit'))
"@
New-File "src/utils.py" @"
import os
import sys

def get_project_root():
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def read_file(path):
    with open(path, 'r') as f:
        return f.read()
"@
New-File "tests/test_main.py" @"
import unittest
from src.main import greet

class TestGreet(unittest.TestCase):
    def test_greet(self):
        self.assertEqual(greet('World'), 'Hello, World!')

if __name__ == '__main__':
    unittest.main()
"@
New-File "requirements.txt" @"
pytest>=7.0
flake8
black
"@
New-File "docs/index.md" @"
# Documentation

Welcome to the OrchidGit test project documentation.
"@
CAddCommit "Alice Silva" "alice@example.com" "Add project structure with main module and tests"

New-File "src/utils.py" @"
import os
import sys

def get_project_root():
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def read_file(path):
    with open(path, 'r') as f:
        return f.read()

def format_date(timestamp):
    from datetime import datetime
    return datetime.fromtimestamp(timestamp).isoformat()
"@
CAddCommit "Alice Silva" "alice@example.com" "Add date formatting utility"

New-File "src/main.py" @"
#!/usr/bin/env python3
print('Hello from OrchidGit test project!')

def greet(name):
    return f'Hello, {name}!'

def add(a, b):
    return a + b

def multiply(a, b):
    return a * b

def divide(a, b):
    if b == 0:
        raise ValueError('Cannot divide by zero')
    return a / b

if __name__ == '__main__':
    print(greet('OrchidGit'))
"@
CAddCommit "Alice Silva" "alice@example.com" "Add math operations to main module"

New-File "src/utils.py" @"
import os
import sys

def get_project_root():
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def read_file(path):
    with open(path, 'r') as f:
        return f.read()

def format_date(timestamp):
    from datetime import datetime
    return datetime.fromtimestamp(timestamp).isoformat()

def validate_email(email):
    return '@' in email and '.' in email.split('@')[-1]

def slugify(text):
    return text.lower().replace(' ', '-').replace('_', '-')
"@
CAddCommit "Alice Silva" "alice@example.com" "Add email validation and slugify utilities"

New-File "src/config.py" @"
import os

DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///local.db')
DEBUG = os.getenv('DEBUG', 'false').lower() == 'true'
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
MAX_RETRIES = 3
TIMEOUT_SECONDS = 30
"@
CAddCommit "Alice Silva" "alice@example.com" "Add configuration module"

New-File ".gitignore" @"
__pycache__/
*.pyc
.env
*.log
dist/
build/
*.egg-info/
.DS_Store
"@
CAddCommit "Bob Santos" "bob@example.com" "Add .gitignore file"

Write-OK "Foundation phase: $(git log --oneline | Measure-Object | Select-Object -ExpandProperty Count) commits"

# ──────────────────────────────────────────────
# Phase 2: Branches and merges
# ──────────────────────────────────────────────
Write-Step "3. Phase 2: Branches and merges"

git checkout -b "feature/authentication"
New-File "src/auth.py" @"
import hashlib
import secrets

def hash_password(password, salt=None):
    if salt is None:
        salt = secrets.token_hex(16)
    hashed = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
    return f'{salt}\${hashed.hex()}'

def verify_password(password, stored):
    salt, hashed = stored.split('\$')
    return hash_password(password, salt) == stored

class User:
    def __init__(self, username, email):
        self.username = username
        self.email = email
        self.password_hash = None

    def set_password(self, password):
        self.password_hash = hash_password(password)
"@
CAddCommit "Alice Silva" "alice@example.com" "Add authentication module with password hashing"

New-File "src/auth.py" @"
import hashlib
import secrets

def hash_password(password, salt=None):
    if salt is None:
        salt = secrets.token_hex(16)
    hashed = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
    return f'{salt}\${hashed.hex()}'

def verify_password(password, stored):
    salt, hashed = stored.split('\$')
    return hash_password(password, salt) == stored

class User:
    def __init__(self, username, email):
        self.username = username
        self.email = email
        self.password_hash = None

    def set_password(self, password):
        self.password_hash = hash_password(password)

def login(username, password, user_store):
    user = user_store.get(username)
    if user and verify_password(password, user.password_hash):
        return True
    return False

def logout(session):
    session.clear()
"@
CAddCommit "Alice Silva" "alice@example.com" "Add login/logout functions"

git checkout main
git checkout -b "feature/api"
New-File "src/api.py" @"
import json
from http.server import BaseHTTPRequestHandler

class APIHandler(BaseHTTPRequestHandler):
    routes = {}

    @classmethod
    def route(cls, path, methods=None):
        if methods is None:
            methods = ['GET']
        def wrapper(handler):
            cls.routes[path] = {'handler': handler, 'methods': methods}
            return handler
        return wrapper

    def do_GET(self):
        for path, config in self.routes.items():
            if self.path == path and 'GET' in config['methods']:
                result = config['handler'](self)
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(result).encode())
                return
        self.send_response(404)
        self.end_headers()
"@
CAddCommit "Bob Santos" "bob@example.com" "Add basic API handler framework"

New-File "src/api.py" @"
import json
from http.server import BaseHTTPRequestHandler

class APIHandler(BaseHTTPRequestHandler):
    routes = {}

    @classmethod
    def route(cls, path, methods=None):
        if methods is None:
            methods = ['GET']
        def wrapper(handler):
            cls.routes[path] = {'handler': handler, 'methods': methods}
            return handler
        return wrapper

    def do_GET(self):
        for path, config in self.routes.items():
            if self.path == path and 'GET' in config['methods']:
                result = config['handler'](self)
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(result).encode())
                return
        self.send_response(404)
        self.end_headers()

def start_server(host='localhost', port=8080):
    from http.server import HTTPServer
    server = HTTPServer((host, port), APIHandler)
    print(f'Server running on http://{host}:{port}')
    server.serve_forever()
"@
CAddCommit "Bob Santos" "bob@example.com" "Add server startup function"

git checkout main
git merge "feature/authentication" --no-ff -m "Merge feature/authentication into main"
git tag -a "v1.0.0" -m "Version 1.0.0 - Basic auth and utils"

git checkout -b "feature/validation"
New-File "src/validators.py" @"
import re

def is_valid_email(email):
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))

def is_strong_password(password):
    if len(password) < 8:
        return False
    if not re.search(r'[A-Z]', password):
        return False
    if not re.search(r'[a-z]', password):
        return False
    if not re.search(r'[0-9]', password):
        return False
    return True

def sanitize_filename(filename):
    return re.sub(r'[^\w\-_.]', '_', filename)
"@
CAddCommit "Carol Oliveira" "carol@example.com" "Add input validation module"

New-File "src/validators.py" @"
import re

def is_valid_email(email):
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))

def validate_password(password):
    if len(password) < 8:
        return False, 'Too short'
    checks = {'uppercase': r'[A-Z]', 'lowercase': r'[a-z]', 'digit': r'[0-9]'}
    for name, pattern in checks.items():
        if not re.search(pattern, password):
            return False, f'Missing {name}'
    return True, 'OK'

def sanitize_filename(filename):
    return re.sub(r'[^\w\-_.]', '_', filename)

def is_valid_url(url):
    pattern = r'^https?://[^\s/$.?#].[^\s]*$'
    return bool(re.match(pattern, url))

def sanitize_html(text):
    replacements = {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}
    for old, new in replacements.items():
        text = text.replace(old, new)
    return text
"@
CAddCommit "Carol Oliveira" "carol@example.com" "Add URL validation and HTML sanitization"

git checkout "feature/api"
git checkout -b "feature/database"
New-File "src/database.py" @"
import sqlite3

class Database:
    def __init__(self, db_path):
        self.db_path = db_path
        self.conn = None

    def connect(self):
        self.conn = sqlite3.connect(self.db_path)
        self.conn.row_factory = sqlite3.Row
        return self.conn

    def close(self):
        if self.conn:
            self.conn.close()

    def execute(self, query, params=None):
        if not self.conn:
            self.connect()
        cursor = self.conn.cursor()
        if params:
            cursor.execute(query, params)
        else:
            cursor.execute(query)
        self.conn.commit()
        return cursor
"@
CAddCommit "Alice Silva" "alice@example.com" "Add database abstraction layer"

git checkout main
git merge "feature/validation" --no-ff -m "Merge feature/validation into main"
git tag -a "v1.1.0" -m "Version 1.1.0 - Input validation support"
git merge "feature/api" --no-ff -m "Merge feature/api into main"
git merge "feature/database" --no-ff -m "Merge feature/database into main"

$rootCommit = git rev-list --max-parents=0 HEAD
git checkout -b "feature/export" $rootCommit
New-File "src/exporter.py" @"
import csv
import json

def export_to_csv(data, filepath):
    if not data:
        return
    keys = data[0].keys()
    with open(filepath, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=keys)
        writer.writeheader()
        writer.writerows(data)

def export_to_json(data, filepath):
    with open(filepath, 'w') as f:
        json.dump(data, f, indent=2)
"@
CAddCommit "Dave Pereira" "dave@example.com" "Add data export module (CSV and JSON)"

git checkout main
git merge "feature/export" --no-ff -m "Merge feature/export into main"

Write-OK "Branch phase: $(git log --oneline | Measure-Object | Select-Object -ExpandProperty Count) commits"

# ──────────────────────────────────────────────
# Phase 3: Tags and stashes
# ──────────────────────────────────────────────
Write-Step "4. Phase 3: Tags and stashes"

git tag -a "v0.9.0" -m "Version 0.9.0 - Pre-release" HEAD~12
git tag -a "v1.2.0" -m "Version 1.2.0 - API and database support"
git tag -a "v1.2.1" -m "Version 1.2.1 - Bugfix patch" HEAD~1

New-File "src/auth.py" @"
import hashlib
import secrets

def hash_password(password, salt=None):
    if salt is None:
        salt = secrets.token_hex(16)
    hashed = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
    return f'{salt}\${hashed.hex()}'

def verify_password(password, stored):
    salt, hashed = stored.split('\$')
    return hash_password(password, salt) == stored

class User:
    def __init__(self, username, email):
        self.username = username
        self.email = email
        self.password_hash = None

    def set_password(self, password):
        self.password_hash = hash_password(password)

def login(username, password, user_store):
    user = user_store.get(username)
    if user and verify_password(password, user.password_hash):
        return True
    return False

def logout(session):
    session.clear()

def reset_password(user, new_password):
    user.set_password(new_password)
    return True
"@
git stash push -m "WIP: password reset functionality"

New-File "src/main.py" @"
#!/usr/bin/env python3
def greet(name):
    return f'Hello, {name}!'

def add(a, b):
    return a + b

def multiply(a, b):
    return a * b

def divide(a, b):
    if b == 0:
        raise ValueError('Cannot divide by zero')
    return a / b

def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n-1)
"@
git stash push -m "WIP: fibonacci and factorial implementations"

New-File "src/logger.py" @"
import logging
import sys

def setup_logger(name, level=logging.INFO):
    logger = logging.getLogger(name)
    handler = logging.StreamHandler(sys.stdout)
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(level)
    return logger
"@
git stash push -m "Add logger module WIP"

git stash pop "stash@{1}" 2>$null
Write-OK "Tags and stashes phase complete"

# ──────────────────────────────────────────────
# Phase 4: Conflicts
# ──────────────────────────────────────────────
Write-Step "5. Phase 4: Conflict scenarios"

git checkout -b "feature/conflict-target"
New-File "src/main.py" @"
#!/usr/bin/env python3
print('Target branch version of main.py')

def greet(name):
    return f'Bonjour, {name}!'

if __name__ == '__main__':
    print('Running target branch version')
"@
CAddCommit "Alice Silva" "alice@example.com" "Modify main.py in conflict-target branch"

git checkout main
New-File "src/main.py" @"
#!/usr/bin/env python3
print('Main branch version of main.py')

def greet(name):
    return f'Hola, {name}!'

if __name__ == '__main__':
    print('Running main branch version')

def new_function():
    return 'Added on main'
"@
CAddCommit "Bob Santos" "bob@example.com" "Modify main.py on main branch"

git merge "feature/conflict-target" --no-commit 2>$null
$conflictFiles = git diff --name-only --diff-filter=U
if ($conflictFiles) {
  Write-OK "Conflict in $conflictFiles -- ready for Conflict Resolver test"
} else {
  git merge --abort 2>$null
  Write-Info "Creating manual conflict scenario..."
  git checkout -b "conflict-demo"
  New-File "conflict-file.txt" @"
Line 1: Base version
Line 2: Base version
Line 3: Base version
Line 4: Base version
Line 5: Base version
"@
  CAddCommit "Alice Silva" "alice@example.com" "Create conflict-demo branch base"
  git checkout -b "conflict-left"
  New-File "conflict-file.txt" @"
Line 1: Left branch
Line 2: Left branch
Line 3: Left branch
Line 4: Left branch
Line 5: Left branch
"@
  CAddCommit "Bob Santos" "bob@example.com" "Left side of conflict"
  git checkout "conflict-demo"
  New-File "conflict-file.txt" @"
Line 1: Right branch
Line 2: Right branch
Line 3: Right branch
Line 4: Right branch
Line 5: Right branch
"@
  CAddCommit "Carol Oliveira" "carol@example.com" "Right side of conflict"
  git merge "conflict-left" --no-commit 2>$null
  Write-OK "Conflict created in conflict-file.txt"
}

git checkout main

# ──────────────────────────────────────────────
# Phase 5: Renames and moves
# ──────────────────────────────────────────────
Write-Step "6. Phase 5: Renames and moves"

New-File "src/string_ops.py" @"
def reverse_string(s):
    return s[::-1]

def capitalize_words(s):
    parts = s.split()
    return ' '.join(x.capitalize() for x in parts)

def count_vowels(s):
    vowels = set('aeiouAEIOU')
    total = 0
    for ch in s:
        if ch in vowels:
            total += 1
    return total
"@
CAddCommit "Alice Silva" "alice@example.com" "Add string operations module"

git mv "src/string_ops.py" "src/text_ops.py"
New-File "src/text_ops.py" @"
def reverse_string(s):
    return s[::-1]

def capitalize_words(s):
    parts = s.split()
    return ' '.join(x.capitalize() for x in parts)

def count_vowels(s):
    vowels = set('aeiouAEIOU')
    total = 0
    for ch in s:
        if ch in vowels:
            total += 1
    return total

def is_palindrome(s):
    cleaned = ''.join(c.lower() for c in s if c.isalnum())
    return cleaned == cleaned[::-1]

def word_count(text):
    return len(text.split())
"@
CAddCommit "Alice Silva" "alice@example.com" "Rename string_ops to text_ops and add new functions"

$null = New-Item -ItemType Directory -Path "src/utils" -Force
if (Test-Path "src/validators.py") { git mv "src/validators.py" "src/utils/validators.py" }
if (Test-Path "src/logger.py")    { git mv "src/logger.py" "src/utils/logger.py" }
CAddCommit "Bob Santos" "bob@example.com" "Restructure: move validators and logger to utils package"

$null = New-Item -ItemType Directory -Path "src/config" -Force
if (Test-Path "src/config.py") {
  git mv "src/config.py" "src/config/settings.py"
  New-File "src/config/__init__.py" @"
from .settings import DATABASE_URL, DEBUG, LOG_LEVEL, MAX_RETRIES, TIMEOUT_SECONDS
"@
  CAddCommit "Carol Oliveira" "carol@example.com" "Restructure config into package"
}

# ──────────────────────────────────────────────
# Finalize
# ──────────────────────────────────────────────
git checkout main

Write-Step "Done!"
Write-Host "Repository created at: $RepoPath" -ForegroundColor Green
Write-Host ""
Write-Host "Quick test scenarios:" -ForegroundColor Yellow
Write-Host "  - Commit graph with branches/merges"
Write-Host "  - Branch switch, merge, rebase, delete"
Write-Host "  - Tag create/delete"
Write-Host "  - Stash push/pop/drop"
Write-Host "  - Cherry-pick between branches"
Write-Host "  - File history and blame"
Write-Host "  - Conflict resolution"
Write-Host "  - Metrics with multiple authors"
Write-Host "  - Staged/unstaged changes"
Write-Host "  - Renamed file tracking"
Write-Host ""
Write-Host "Open this directory in OrchidGit to test all features." -ForegroundColor Cyan

Pop-Location
