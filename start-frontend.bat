@echo off
echo ============================================
echo  Technical Quiz - FRONTEND SERVER
echo ============================================
echo.
echo Frontend URL : http://localhost:5173
echo.
echo Stopping any old frontend processes on port 5173...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1
echo Starting frontend...
echo.
cd /d "%~dp0frontend"
npm run dev
pause
