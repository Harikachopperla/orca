@echo off
cd /d "%~dp0"
title ORCA – Marine Ecosystem Intelligence Launcher
color 0B

echo =====================================================================
echo    ORCA - Marine Ecosystem Intelligence
echo    "ORCA - From Ocean Data to Informed Action."
echo =====================================================================
echo.

:: 1. Check Python
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python is not found in your system PATH.
    echo Please install Python 3.10+ from https://python.org and check "Add Python to PATH".
    pause
    exit /b 1
)

:: 2. Check and Seed Database if needed
if not exist "orca.db" (
    echo [INFO] First-time setup detected. Initializing SQLite Database...
    python database.py
)

:: 3. Launch the browser after a 2-second delay in background
echo [INFO] Launching browser to http://127.0.0.1:5000 ...
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://127.0.0.1:5000"

:: 4. Start Flask Server
echo [INFO] Starting ORCA Flask Server...
echo [INFO] Press Ctrl+C in this window to stop the server at any time.
echo =====================================================================
echo.
python app.py

pause

