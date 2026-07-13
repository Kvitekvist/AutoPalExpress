project_name: AutoPalExpress

language: Python (backend), TypeScript (frontend)

framework: FastAPI + Uvicorn (backend), React 19 + Vite (frontend)

build_tool: PyInstaller (onefile exe) + Inno Setup 6 (Windows installer)

git_provider: none (no git repository initialized for this project yet)

build_executable: true

auto_push: false (no git repo exists yet - this must be revisited once one is initialized; never assume push is wanted)

ticket_system: none in active use (this framework's ticket folders haven't been created - all work so far has been tracked via conversation and the memory/ files, not formal tickets)

branch_strategy: n/a (no git repo yet)

tests_required: false (no automated test suite exists - correctness has relied on manual/live verification of each feature; see memory/project_memory.md)

release_method: Manual - build the frontend, run PyInstaller against AutoPalExpress.spec, compile installer.iss with Inno Setup, producing AutoPalExpress-Setup.exe
