@echo off
setlocal enabledelayedexpansion

echo ========================================
echo  OrchidGit Test Repository Creator
echo ========================================

set /p REPO_PATH="Enter path to create the test repo (default: C:\Users\%USERNAME%\orchidgit-test): "
if "%REPO_PATH%"=="" set REPO_PATH=C:\Users\%USERNAME%\orchidgit-test

if exist "%REPO_PATH%" (
  echo Removing existing directory...
  rmdir /s /q "%REPO_PATH%"
)

echo Creating repository at %REPO_PATH%
mkdir "%REPO_PATH%"
cd /d "%REPO_PATH%"

echo.
echo === 1. Initializing repo ===
git init

echo.
echo === 2. Configuring authors ===
call :setup_authors

echo.
echo === 3. Phase 1: Single branch foundational commits ===
call :phase_foundation

echo.
echo === 4. Phase 2: Feature branches and merges ===
call :phase_branches

echo.
echo === 5. Phase 3: Tags, stashes, and remotes ===
call :phase_tags_stash

echo.
echo === 6. Phase 4: Conflict scenarios ===
call :phase_conflicts

echo.
echo === 7. Phase 5: Renames and moves ===
call :phase_renames

echo.
echo === 8. Finalizing ===
git checkout main
echo.
echo ========================================
echo  Repository created at: %REPO_PATH%
echo  Open this directory in OrchidGit to
echo  test all features.
echo ========================================
echo.
echo  Quick test scenarios:
echo    - Commit graph with branches/merges
echo    - Branch switch, merge, rebase, delete
echo    - Tag create/delete
echo    - Stash push/pop/drop
echo    - Cherry-pick between branches
echo    - File history and blame
echo    - Conflict resolution
echo    - Metrics with multiple authors
echo    - Staged/unstaged changes
echo    - Renamed file tracking
echo ========================================
pause
exit /b 0

rem ============ HELPER FUNCTIONS ============

:setup_authors
  echo Setting up authors...
  git config user.name "Alice Silva"
  git config user.email "alice@example.com"
  exit /b 0

:create_file
  set _file=%~1
  set _content=%~2
  echo %_content% > "%_file%"
  exit /b 0

:commit_as
  set _author=%~1
  set _name=%~2
  set _msg=%~3
  set _email=""
  if "%_author%"=="Alice" set _email="alice@example.com"
  if "%_author%"=="Bob" set _email="bob@example.com"
  if "%_author%"=="Carol" set _email="carol@example.com"
  if "%_author%"=="Dave" set _email="dave@example.com"
  git -c user.name="%_name%" -c user.email=%_email% commit -m "%_msg%" --allow-empty
  exit /b 0

rem ============ PHASE 1: FOUNDATION ============

:phase_foundation
  echo Creating foundational commits...

  call :create_file "README.md" "# OrchidGit Test Repository
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
- Remote operations (simulated)"

  git add README.md
  git commit -m "Initial commit: add README"

  call :create_file "src/main.py" "#!/usr/bin/env python3
print('Hello from OrchidGit test project!')

def greet(name):
    return f'Hello, {name}!'

if __name__ == '__main__':
    print(greet('OrchidGit'))
"

  call :create_file "src/utils.py" "import os
import sys

def get_project_root():
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def read_file(path):
    with open(path, 'r') as f:
        return f.read()
"

  call :create_file "tests/test_main.py" "import unittest
from src.main import greet

class TestGreet(unittest.TestCase):
    def test_greet(self):
        self.assertEqual(greet('World'), 'Hello, World!')

if __name__ == '__main__':
    unittest.main()
"

  call :create_file "requirements.txt" "pytest>=7.0
flake8
black
"

  mkdir docs
  call :create_file "docs/index.md" "# Documentation

Welcome to the OrchidGit test project documentation.
"

  git add -A
  git commit -m "Add project structure with main module and tests"

  :: Add second line to utils
  echo.>> src/utils.py
  echo def format_date(timestamp): >> src/utils.py
  echo     from datetime import datetime >> src/utils.py
  echo     return datetime.fromtimestamp(timestamp).isoformat() >> src/utils.py
  git add -A
  git commit -m "Add date formatting utility"

  echo Adding more features to main...
  echo.>> src/main.py
  echo def add(a, b): >> src/main.py
  echo     return a + b >> src/main.py
  echo.>> src/main.py
  echo def multiply(a, b): >> src/main.py
  echo     return a * b >> src/main.py
  echo.>> src/main.py
  echo def divide(a, b): >> src/main.py
  echo     if b == 0: >> src/main.py
  echo         raise ValueError('Cannot divide by zero') >> src/main.py
  echo     return a / b >> src/main.py
  git add -A
  git commit -m "Add math operations to main module"

  echo.>> src/utils.py
  echo def validate_email(email): >> src/utils.py
  echo     return '@' in email and '.' in email.split('@')[-1] >> src/utils.py
  echo.>> src/utils.py
  echo def slugify(text): >> src/utils.py
  echo     return text.lower().replace(' ', '-').replace('_', '-') >> src/utils.py
  git add -A
  git commit -m "Add email validation and slugify utilities"

  call :create_file "src/config.py" "import os

DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///local.db')
DEBUG = os.getenv('DEBUG', 'false').lower() == 'true'
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
MAX_RETRIES = 3
TIMEOUT_SECONDS = 30
"
  git add -A
  git commit -m "Add configuration module"

  call :commit_as "Bob" "Bob Santos" "Add .gitignore file"
  call :create_file ".gitignore" "__pycache__/
*.pyc
.env
*.log
dist/
build/
*.egg-info/
.DS_Store
"
  git add -A
  git commit --amend --no-edit --allow-empty 2>nul
  :: Actually do it properly
  git add -A
  git -c user.name="Bob Santos" -c user.email="bob@example.com" commit -m "Add .gitignore file"

  git checkout main 2>nul || git checkout -b main
  git log --oneline -5

  echo Foundation phase complete.
  exit /b 0

rem ============ PHASE 2: BRANCHES ============

:phase_branches
  echo Creating branches and merges...

  :: Create feature/authentication branch
  git checkout -b feature/authentication
  call :create_file "src/auth.py" "import hashlib
import secrets

def hash_password(password, salt=None):
    if salt is None:
        salt = secrets.token_hex(16)
    hashed = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
    return f'{salt}${hashed.hex()}'

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
"
  git add -A
  git -c user.name="Alice Silva" -c user.email="alice@example.com" commit -m "Add authentication module with password hashing"

  echo.>> src/auth.py
  echo def login(username, password, user_store): >> src/auth.py
  echo     user = user_store.get(username) >> src/auth.py
  echo     if user and verify_password(password, user.password_hash): >> src/auth.py
  echo         return True >> src/auth.py
  echo     return False >> src/auth.py
  echo.>> src/auth.py
  echo def logout(session): >> src/auth.py
  echo     session.clear() >> src/auth.py
  git add -A
  git -c user.name="Alice Silva" -c user.email="alice@example.com" commit -m "Add login/logout functions"

  :: Create feature/api branch from main
  git checkout main
  git checkout -b feature/api
  call :create_file "src/api.py" "import json
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
"
  git add -A
  git -c user.name="Bob Santos" -c user.email="bob@example.com" commit -m "Add basic API handler framework"

  echo.>> src/api.py
  echo def start_server(host='localhost', port=8080): >> src/api.py
  echo     from http.server import HTTPServer >> src/api.py
  echo     server = HTTPServer((host, port), APIHandler) >> src/api.py
  echo     print(f'Server running on http://{host}:{port}') >> src/api.py
  echo     server.serve_forever() >> src/api.py
  git add -A
  git -c user.name="Bob Santos" -c user.email="bob@example.com" commit -m "Add server startup function"

  :: Merge authentication into main
  git checkout main
  git merge feature/authentication --no-ff -m "Merge feature/authentication into main"
  git tag -a v1.0.0 -m "Version 1.0.0 - Basic auth and utils"

  :: Create feature/validation branch from main
  git checkout -b feature/validation
  call :create_file "src/validators.py" "import re

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
"
  git add -A
  git -c user.name="Carol Oliveira" -c user.email="carol@example.com" commit -m "Add input validation module"

  echo.>> src/validators.py
  echo def is_valid_url(url): >> src/validators.py
  echo     pattern = r'^https?:\/\/[^\s\/$.?#].[^\s]*$' >> src/validators.py
  echo     return bool(re.match(pattern, url)) >> src/validators.py
  echo.>> src/validators.py
  echo def sanitize_html(text): >> src/validators.py
  echo     replacements = { >> src/validators.py
  echo         '&': '&amp;', '<': '&lt;', '>': '&gt;', >> src/validators.py
  echo         '"': '&quot;', "'": '&#39;' >> src/validators.py
  echo     } >> src/validators.py
  echo     for old, new in replacements.items(): >> src/validators.py
  echo         text = text.replace(old, new) >> src/validators.py
  echo     return text >> src/validators.py
  git add -A
  git -c user.name="Carol Oliveira" -c user.email="carol@example.com" commit -m "Add URL validation and HTML sanitization"

  :: Create feature/database branch from feature/api
  git checkout feature/api
  git checkout -b feature/database
  call :create_file "src/database.py" "import sqlite3
import os

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
"
  git add -A
  git -c user.name="Alice Silva" -c user.email="alice@example.com" commit -m "Add database abstraction layer"

  git checkout main
  git merge feature/validation --no-ff -m "Merge feature/validation into main"
  git tag -a v1.1.0 -m "Version 1.1.0 - Input validation support"

  :: Merge feature/api into main
  git merge feature/api --no-ff -m "Merge feature/api into main"

  :: Merge feature/database into main (creates a more complex graph)
  git merge feature/database --no-ff -m "Merge feature/database into main"

  git checkout main

  :: Create a branch off an older commit for complex history
  git checkout -b feature/export $(git rev-list --max-parents=0 HEAD)
  call :create_file "src/exporter.py" "import csv
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
"
  git add -A
  git -c user.name="Dave Pereira" -c user.email="dave@example.com" commit -m "Add data export module (CSV and JSON)"

  git checkout main
  git merge feature/export --no-ff -m "Merge feature/export into main"

  echo Branch phase complete.
  exit /b 0

rem ============ PHASE 3: TAGS, STASHES ============

:phase_tags_stash
  echo Creating tags and stashes...

  :: Create more tags
  git tag -a v0.9.0 -m "Version 0.9.0 - Pre-release" HEAD~12 2>nul || echo "v0.9.0 tag skipped"
  git tag -a v1.2.0 -m "Version 1.2.0 - API and database support"
  git tag -a v1.2.1 -m "Version 1.2.1 - Bugfix patch" HEAD~1 2>nul || echo "v1.2.1 tag skipped"

  :: Create stashes
  echo.>> src/auth.py
  echo def reset_password(user, new_password): >> src/auth.py
  echo     user.set_password(new_password) >> src/auth.py
  echo     return True >> src/auth.py

  git stash push -m "WIP: password reset functionality"

  echo.>> src/main.py
  echo def fibonacci(n): >> src/main.py
  echo     if n <= 1: >> src/main.py
  echo         return n >> src/main.py
  echo     return fibonacci(n-1) + fibonacci(n-2) >> src/main.py

  echo.>> src/main.py
  echo def factorial(n): >> src/main.py
  echo     if n <= 1: >> src/main.py
  echo         return 1 >> src/main.py
  echo     return n * factorial(n-1) >> src/main.py

  git stash push -m "WIP: fibonacci and factorial implementations"

  :: Third stash
  call :create_file "src/logger.py" "import logging
import sys

def setup_logger(name, level=logging.INFO):
    logger = logging.getLogger(name)
    handler = logging.StreamHandler(sys.stdout)
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(level)
    return logger
"
  git stash push -m "Add logger module WIP"

  :: Pop one stash to test
  git stash pop stash@{1} 2>nul || git stash list

  echo Tags and stashes phase complete.
  exit /b 0

rem ============ PHASE 4: CONFLICTS ============

:phase_conflicts
  echo Creating conflict scenarios...

  :: Create a branch that will conflict with main
  git checkout -b feature/conflict-target
  call :create_file "src/main.py" "#!/usr/bin/env python3
print('Target branch version of main.py')

def greet(name):
    return f'Bonjour, {name}!'

if __name__ == '__main__':
    print('Running target branch version')
"
  git add -A
  git -c user.name="Alice Silva" -c user.email="alice@example.com" commit -m "Modify main.py in conflict-target branch"

  :: Simulate a conflict by modifying the same file on main
  git checkout main
  call :create_file "src/main.py" "#!/usr/bin/env python3
print('Main branch version of main.py')

def greet(name):
    return f'Hola, {name}!'

if __name__ == '__main__':
    print('Running main branch version')

def new_function():
    return 'Added on main'
"
  git add -A
  git -c user.name="Bob Santos" -c user.email="bob@example.com" commit -m "Modify main.py on main branch"

  :: Try to merge and create a conflict scenario (but abort before committing)
  git merge feature/conflict-target --no-commit 2>nul
  :: Check if there's a conflict (expected)
  git diff --name-only --diff-filter=U 2>nul | findstr /r "^" >nul && (
    echo Conflict detected in src/main.py as expected.
    :: Leave the conflict for testing the conflict resolver
    echo Conflict is staged for you to test the Conflict Resolver.
  ) || (
    :: If no conflict, make sure we still have one
    echo No automatic conflict - creating manual conflict markers...
    git merge --abort 2>nul
    git checkout -b conflict-demo
    call :create_file "conflict-file.txt" "Line 1: Main version
Line 2: Main version
Line 3: Main version
Line 4: Main version
Line 5: Main version
"
    git add -A
    git -c user.name="Alice Silva" -c user.email="alice@example.com" commit -m "Create conflict-demo branch base"

    git checkout -b conflict-left
    call :create_file "conflict-file.txt" "Line 1: Left branch
Line 2: Left branch
Line 3: Left branch
Line 4: Left branch
Line 5: Left branch
"
    git add -A
    git -c user.name="Bob Santos" -c user.email="bob@example.com" commit -m "Left side of conflict"

    git checkout conflict-demo
    call :create_file "conflict-file.txt" "Line 1: Right branch
Line 2: Right branch
Line 3: Right branch
Line 4: Right branch
Line 5: Right branch
"
    git add -A
    git -c user.name="Carol Oliveira" -c user.email="carol@example.com" commit -m "Right side of conflict"

    :: Try the merge to create conflict state
    git merge conflict-left --no-commit 2>nul
    echo Conflict created in conflict-file.txt. Test the Conflict Resolver!
  )

  git checkout main 2>nul || git checkout -b main

  echo Conflict phase complete.
  exit /b 0

rem ============ PHASE 5: RENAMES ============

:phase_renames
  echo Creating renames and moves...

  git checkout main

  :: Rename files to test rename tracking
  call :create_file "src/string_ops.py" "def reverse_string(s):
    return s[::-1]

def capitalize_words(s):
    return ' '.join(word.capitalize() for word in s.split())

def count_vowels(s):
    vowels = set('aeiouAEIOU')
    return sum(1 for char in s if char in vowels)
"
  git add -A
  git -c user.name="Alice Silva" -c user.email="alice@example.com" commit -m "Add string operations module"

  :: Rename string_ops.py to text_ops.py (tests rename detection)
  git mv src/string_ops.py src/text_ops.py

  echo.>> src/text_ops.py
  echo def is_palindrome(s): >> src/text_ops.py
  echo     cleaned = ''.join(c.lower() for c in s if c.isalnum()) >> src/text_ops.py
  echo     return cleaned == cleaned[::-1] >> src/text_ops.py
  echo.>> src/text_ops.py
  echo def word_count(text): >> src/text_ops.py
  echo     return len(text.split()) >> src/text_ops.py

  git add -A
  git -c user.name="Alice Silva" -c user.email="alice@example.com" commit -m "Rename string_ops to text_ops and add new functions"

  :: Move files to subdirectories (simulates restructuring)
  mkdir src\utils 2>nul
  git mv src/validators.py src/utils/validators.py 2>nul || echo "validators.py not at expected path"
  git mv src/logger.py src/utils/logger.py 2>nul || echo "logger.py not at expected path"

  git add -A
  git -c user.name="Bob Santos" -c user.email="bob@example.com" commit -m "Restructure: move validators and logger to utils package"

  :: Move config to a config package
  mkdir src\config 2>nul
  git mv src/config.py src/config/settings.py 2>nul || echo "config.py not at expected path"
  call :create_file "src/config/__init__.py" "from .settings import DATABASE_URL, DEBUG, LOG_LEVEL, MAX_RETRIES, TIMEOUT_SECONDS
"
  git add -A
  git -c user.name="Carol Oliveira" -c user.email="carol@example.com" commit -m "Restructure config into package"

  echo Renames phase complete.
  exit /b 0
