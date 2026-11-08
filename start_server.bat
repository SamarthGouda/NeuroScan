@echo off
echo ====================================================
echo  NeuroVision AI v3.0.4 - Starting Server
echo ====================================================
echo.

REM Change to project root
cd /d "%~dp0"

REM Activate virtual environment if present
if exist ".venv\Scripts\python.exe" (
    set "PYTHON_EXE=.venv\Scripts\python.exe"
) else (
    set "PYTHON_EXE=python"
)

echo Using Python: %PYTHON_EXE%
echo Starting FastAPI server on http://localhost:8000
echo Press Ctrl+C to stop the server.
echo.
%PYTHON_EXE% -m uvicorn backend.main:app --port 8000 --host 0.0.0.0 --reload
