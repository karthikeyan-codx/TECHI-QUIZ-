@echo off
echo ============================================
echo  Technical Quiz - BACKEND SERVER
echo ============================================
echo.
echo Admin Password : admin@tq2026
echo Backend URL    : http://localhost:8000
echo API Docs       : http://localhost:8000/docs
echo.
echo Stopping any old backend processes...
taskkill /F /IM uvicorn.exe >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq uvicorn" >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1
echo Starting fresh backend...
echo.
cd /d "%~dp0backend"
set PYTHONPATH=.
"%~dp0.venv\Scripts\uvicorn.exe" app.main:app --reload --host 0.0.0.0 --port 8000
pause
