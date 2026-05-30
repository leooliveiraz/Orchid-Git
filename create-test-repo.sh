#!/usr/bin/env bash
set -euo pipefail

REPO_PATH="${1:-$HOME/orchidgit-test}"

echo "=== Creating OrchidGit test repo at: $REPO_PATH ==="
rm -rf "$REPO_PATH"
mkdir -p "$REPO_PATH"
cd "$REPO_PATH"

git init
git config user.name "Alice Silva"
git config user.email "alice@example.com"

newfile() { mkdir -p "$(dirname "$1")" && cat > "$1"; }

commit() {
  git -c "user.name=$1" -c "user.email=$2" commit --allow-empty -m "$3"
}

caddcommit() {
  git add -A
  commit "$1" "$2" "$3"
}

# ── Phase 1: Foundation ──
echo "--- Phase 1: Foundation ---"

newfile README.md << 'EOF'
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
EOF
caddcommit "Alice Silva" "alice@example.com" "Initial commit: add README"

newfile src/main.py << 'PYEOF'
#!/usr/bin/env python3
print('Hello from OrchidGit test project!')

def greet(name):
    return f'Hello, {name}!'

if __name__ == '__main__':
    print(greet('OrchidGit'))
PYEOF

newfile src/utils.py << 'PYEOF'
import os
import sys

def get_project_root():
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def read_file(path):
    with open(path, 'r') as f:
        return f.read()
PYEOF

newfile tests/test_main.py << 'PYEOF'
import unittest
from src.main import greet

class TestGreet(unittest.TestCase):
    def test_greet(self):
        self.assertEqual(greet('World'), 'Hello, World!')

if __name__ == '__main__':
    unittest.main()
PYEOF

newfile requirements.txt << 'EOF'
pytest>=7.0
flake8
black
EOF

newfile docs/index.md << 'EOF'
# Documentation
Welcome to the OrchidGit test project documentation.
EOF
caddcommit "Alice Silva" "alice@example.com" "Add project structure with main module and tests"

cat >> src/utils.py << 'PYEOF'

def format_date(timestamp):
    from datetime import datetime
    return datetime.fromtimestamp(timestamp).isoformat()
PYEOF
caddcommit "Alice Silva" "alice@example.com" "Add date formatting utility"

newfile src/main.py << 'PYEOF'
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
PYEOF
caddcommit "Alice Silva" "alice@example.com" "Add math operations to main module"

newfile src/utils.py << 'PYEOF'
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
PYEOF
caddcommit "Alice Silva" "alice@example.com" "Add email validation and slugify utilities"

newfile src/config.py << 'PYEOF'
import os

DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///local.db')
DEBUG = os.getenv('DEBUG', 'false').lower() == 'true'
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
MAX_RETRIES = 3
TIMEOUT_SECONDS = 30
PYEOF
caddcommit "Alice Silva" "alice@example.com" "Add configuration module"

newfile .gitignore << 'EOF'
__pycache__/
*.pyc
.env
*.log
dist/
build/
*.egg-info/
.DS_Store
EOF
caddcommit "Bob Santos" "bob@example.com" "Add .gitignore file"

echo "  Foundation: $(git log --oneline | wc -l) commits"

# ── Phase 2: Branches and merges ──
echo "--- Phase 2: Branches and merges ---"

git checkout -b feature/authentication
newfile src/auth.py << 'PYEOF'
import hashlib
import secrets

def hash_password(password, salt=None):
    if salt is None:
        salt = secrets.token_hex(16)
    hashed = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
    return f'{salt}${hashed.hex()}'

def verify_password(password, stored):
    salt, hashed = stored.split('$')
    return hash_password(password, salt) == stored

class User:
    def __init__(self, username, email):
        self.username = username
        self.email = email
        self.password_hash = None
    def set_password(self, password):
        self.password_hash = hash_password(password)
PYEOF
caddcommit "Alice Silva" "alice@example.com" "Add authentication module with password hashing"

cat >> src/auth.py << 'PYEOF'

def login(username, password, user_store):
    user = user_store.get(username)
    if user and verify_password(password, user.password_hash):
        return True
    return False

def logout(session):
    session.clear()
PYEOF
caddcommit "Alice Silva" "alice@example.com" "Add login/logout functions"

git checkout main
git checkout -b feature/api
newfile src/api.py << 'PYEOF'
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
PYEOF
caddcommit "Bob Santos" "bob@example.com" "Add basic API handler framework"

cat >> src/api.py << 'PYEOF'

def start_server(host='localhost', port=8080):
    from http.server import HTTPServer
    server = HTTPServer((host, port), APIHandler)
    print(f'Server running on http://{host}:{port}')
    server.serve_forever()
PYEOF
caddcommit "Bob Santos" "bob@example.com" "Add server startup function"

git checkout main
git merge feature/authentication --no-ff -m "Merge feature/authentication into main"
git tag -a v1.0.0 -m "Version 1.0.0 - Basic auth and utils"

git checkout -b feature/validation
newfile src/validators.py << 'PYEOF'
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
PYEOF
caddcommit "Carol Oliveira" "carol@example.com" "Add input validation and sanitization module"

git checkout feature/api
git checkout -b feature/database
newfile src/database.py << 'PYEOF'
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
        if params: cursor.execute(query, params)
        else: cursor.execute(query)
        self.conn.commit()
        return cursor
PYEOF
caddcommit "Alice Silva" "alice@example.com" "Add database abstraction layer"

git checkout main
git merge feature/validation --no-ff -m "Merge feature/validation into main"
git tag -a v1.1.0 -m "Version 1.1.0 - Input validation support"
git merge feature/api --no-ff -m "Merge feature/api into main"
git merge feature/database --no-ff -m "Merge feature/database into main"

ROOT=$(git rev-list --max-parents=0 HEAD)
git checkout -b feature/export "$ROOT"
newfile src/exporter.py << 'PYEOF'
import csv
import json

def export_to_csv(data, filepath):
    if not data: return
    keys = data[0].keys()
    with open(filepath, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=keys)
        writer.writeheader()
        writer.writerows(data)

def export_to_json(data, filepath):
    with open(filepath, 'w') as f:
        json.dump(data, f, indent=2)
PYEOF
caddcommit "Dave Pereira" "dave@example.com" "Add data export module (CSV and JSON)"

git checkout main
git merge feature/export --no-ff -m "Merge feature/export into main"

echo "  Branches phase: $(git log --oneline | wc -l) commits"

# ── Phase 3: Tags and stashes ──
echo "--- Phase 3: Tags and stashes ---"

git tag -a v0.9.0 -m "Version 0.9.0 - Pre-release" HEAD~12 2>/dev/null || true
git tag -a v1.2.0 -m "Version 1.2.0 - API and database support"
git tag -a v1.2.1 -m "Version 1.2.1 - Bugfix patch" HEAD~1

cat >> src/auth.py << 'PYEOF'

def reset_password(user, new_password):
    user.set_password(new_password)
    return True
PYEOF
git stash push -m "WIP: password reset functionality"

cat >> src/main.py << 'PYEOF'

def fibonacci(n):
    if n <= 1: return n
    return fibonacci(n-1) + fibonacci(n-2)

def factorial(n):
    if n <= 1: return 1
    return n * factorial(n-1)
PYEOF
git stash push -m "WIP: fibonacci and factorial implementations"

newfile src/logger.py << 'PYEOF'
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
PYEOF
git stash push -m "Add logger module WIP"

git stash pop stash@{1} 2>/dev/null || true
echo "  Tags and stashes complete"

# ── Phase 4: Conflicts ──
echo "--- Phase 4: Conflict scenarios ---"

git checkout -b feature/conflict-target
newfile src/main.py << 'PYEOF'
#!/usr/bin/env python3
print('Target branch version of main.py')

def greet(name):
    return f'Bonjour, {name}!'

if __name__ == '__main__':
    print('Running target branch version')
PYEOF
caddcommit "Alice Silva" "alice@example.com" "Modify main.py in conflict-target branch"

git checkout main
newfile src/main.py << 'PYEOF'
#!/usr/bin/env python3
print('Main branch version of main.py')

def greet(name):
    return f'Hola, {name}!'

if __name__ == '__main__':
    print('Running main branch version')

def new_function():
    return 'Added on main'
PYEOF
caddcommit "Bob Santos" "bob@example.com" "Modify main.py on main branch"

if git merge feature/conflict-target --no-commit 2>/dev/null; then
  echo "  No conflict (unexpected), aborting merge..."
  git merge --abort
else
  echo "  Conflict in src/main.py - ready for Conflict Resolver test!"
fi

# ── Phase 5: Renames ──
echo "--- Phase 5: Renames and moves ---"

git merge --abort 2>/dev/null || true
git checkout main 2>/dev/null || true

newfile src/string_ops.py << 'PYEOF'
def reverse_string(s):
    return s[::-1]

def capitalize_words(s):
    parts = s.split()
    return ' '.join(x.capitalize() for x in parts)

def count_vowels(s):
    vowels = set('aeiouAEIOU')
    total = 0
    for ch in s:
        if ch in vowels: total += 1
    return total
PYEOF
caddcommit "Alice Silva" "alice@example.com" "Add string operations module"

git mv src/string_ops.py src/text_ops.py
cat >> src/text_ops.py << 'PYEOF'

def is_palindrome(s):
    cleaned = ''.join(c.lower() for c in s if c.isalnum())
    return cleaned == cleaned[::-1]

def word_count(text):
    return len(text.split())
PYEOF
caddcommit "Alice Silva" "alice@example.com" "Rename string_ops to text_ops and add new functions"

mkdir -p src/utils
test -f src/validators.py && git mv src/validators.py src/utils/ 2>/dev/null || true
test -f src/logger.py && git mv src/logger.py src/utils/ 2>/dev/null || true
caddcommit "Bob Santos" "bob@example.com" "Restructure: move validators and logger to utils package"

mkdir -p src/config
if test -f src/config.py; then
  git mv src/config.py src/config/settings.py 2>/dev/null || true
fi
newfile src/config/__init__.py << 'PYEOF'
from .settings import DATABASE_URL, DEBUG, LOG_LEVEL, MAX_RETRIES, TIMEOUT_SECONDS
PYEOF
caddcommit "Carol Oliveira" "carol@example.com" "Restructure config into package"

git checkout main 2>/dev/null || true

# ── Summary ──
echo ""
echo "========================================"
echo "  Repository created at: $REPO_PATH"
echo "========================================"
echo "  Commits: $(git log --oneline | wc -l)"
echo "  Branches: $(git branch | wc -l)"
echo "  Tags: $(git tag | wc -l)"
echo "  Stashes: $(git stash list | wc -l)"
echo "  Authors: $(git log --format='%an' | sort -u | wc -l)"
echo ""
echo "  Open this directory in OrchidGit to test all features."
echo "========================================"
