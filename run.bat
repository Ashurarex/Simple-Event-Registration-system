@echo off
title Event Registration Management System
color 0A

echo ========================================================
echo   EVENT REGISTRATION MANAGEMENT SYSTEM - LAUNCHER
echo ========================================================
echo.

:: Navigate to script directory
cd /d "%~dp0"

:: 1. Ensure MongoDB service is running
echo [1/3] Checking MongoDB service...
sc query MongoDB | find "RUNNING" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo       MongoDB service is already running.
) else (
    echo       Starting MongoDB service...
    net start MongoDB >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo       MongoDB service started successfully.
    ) else (
        echo       [INFO] MongoDB service could not be started automatically.
        echo              Continuing if MongoDB is running as a process...
    )
)

echo.
:: 2. Schedule browser launch so Node.js is ready when the page loads
echo [2/3] Opening web application at http://localhost:3000 in your default browser...
start /b "" powershell -NoProfile -Command "Start-Sleep -Milliseconds 1200; Start-Process 'http://localhost:3000'"

echo.
:: 3. Start Node.js Express Server
echo [3/3] Starting Express Server...
echo.
echo ========================================================
echo   Application URL : http://localhost:3000
echo   MongoDB Compass : mongodb://127.0.0.1:27017
echo.
echo   The browser will open automatically in a moment.
echo   Press Ctrl + C in this terminal to stop the server.
echo ========================================================
echo.

node server.js

pause
