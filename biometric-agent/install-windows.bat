@echo off
:: EduBreezy Biometric Agent - Windows Setup Script
:: Run as Administrator

echo ========================================
echo  EduBreezy Biometric Agent Setup
echo  Windows Installation
echo ========================================
echo.

:: Check for Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Download from: https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js found
node -v

:: Check for config.json
if not exist "config.json" (
    echo.
    echo [SETUP] Creating config.json from template...
    copy config.json.example config.json
    echo.
    echo [ACTION REQUIRED]
    echo Please edit config.json with your settings:
    echo   - schoolId
    echo   - agentKey
    echo   - device IP, username, password
    echo.
    notepad config.json
    pause
)

:: Install dependencies
echo.
echo [INSTALL] Installing dependencies...
call npm install

:: Ask for installation method
echo.
echo Choose installation method:
echo   1. Task Scheduler (recommended for v1)
echo   2. NSSM Windows Service (advanced)
echo   3. Just run manually
echo.
set /p choice="Enter choice (1/2/3): "

if "%choice%"=="1" goto :taskscheduler
if "%choice%"=="2" goto :nssm
if "%choice%"=="3" goto :manual
goto :manual

:taskscheduler
echo.
echo [TASK SCHEDULER] Creating scheduled task...

:: Get current directory
set "AGENT_PATH=%CD%"

:: Create VBS wrapper to run hidden
echo Set WshShell = CreateObject^("WScript.Shell"^) > "%AGENT_PATH%\run-hidden.vbs"
echo WshShell.Run "cmd /c cd /d ""%AGENT_PATH%"" && node index.js", 0, False >> "%AGENT_PATH%\run-hidden.vbs"

:: Create scheduled task
schtasks /create /tn "EduBreezy Biometric Agent" /tr "\"%AGENT_PATH%\run-hidden.vbs\"" /sc onstart /ru SYSTEM /rl HIGHEST /f

echo.
echo [SUCCESS] Task Scheduler configured!
echo The agent will start automatically on system boot.
echo.
echo To start now:
schtasks /run /tn "EduBreezy Biometric Agent"
goto :end

:nssm
echo.
echo [NSSM] Setting up Windows Service...

:: Check for NSSM
where nssm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo NSSM not found. Downloading...
    echo Download from: https://nssm.cc/download
    echo Extract and add nssm.exe to your PATH
    pause
    exit /b 1
)

set "AGENT_PATH=%CD%"
nssm install "EduBreezy Biometric Agent" "node.exe" "%AGENT_PATH%\index.js"
nssm set "EduBreezy Biometric Agent" AppDirectory "%AGENT_PATH%"
nssm set "EduBreezy Biometric Agent" DisplayName "EduBreezy Biometric Agent"
nssm set "EduBreezy Biometric Agent" Description "Syncs biometric attendance to EduBreezy cloud"
nssm set "EduBreezy Biometric Agent" Start SERVICE_AUTO_START
nssm start "EduBreezy Biometric Agent"

echo.
echo [SUCCESS] Windows Service installed and started!
echo Use 'nssm status "EduBreezy Biometric Agent"' to check status
goto :end

:manual
echo.
echo [MANUAL] To run manually:
echo   node index.js
echo.
echo Press Ctrl+C to stop.
node index.js
goto :end

:end
echo.
echo ========================================
echo Setup complete!
echo ========================================
pause
