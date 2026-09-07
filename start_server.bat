@echo off
echo ====================================================
echo  NeuroVision v2.0 - Starting Server
echo ====================================================
echo.

REM Change to project root
cd /d "%~dp0"

REM Start the FastAPI server
echo Starting FastAPI server on http://localhost:8000
echo Press Ctrl+C to stop the server.
echo.
python -m uvicorn backend.main:app --reload --port 8000 --host 0.0.0.0
