@echo off
echo =======================================
echo Chat App - WSL Launcher
echo =======================================
echo.
echo This script will start the Chat App using Windows Subsystem for Linux.
echo.

REM Check if WSL is installed
wsl --status > nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Windows Subsystem for Linux is not installed or not properly configured.
    echo Please install WSL2 by running the following command in an administrator PowerShell:
    echo.
    echo wsl --install
    echo.
    echo After installation completes, restart your computer and run this script again.
    pause
    exit /b 1
)

echo Starting Chat App environment in WSL...
echo.
echo Select an option:
echo 1. Start development environment (server + client)
echo 2. Start server only
echo 3. Start client only
echo 4. Start PostgreSQL database only
echo 5. Start Docker Compose environment
echo 6. Run setup script
echo.

set /p option=Enter option (1-6): 

if "%option%"=="1" (
    echo Starting development environment...
    wsl bash -c "cd /mnt/c/Users/%USERNAME%/gauntlet/chatapp && npm run wsl:dev"
) else if "%option%"=="2" (
    echo Starting server only...
    wsl bash -c "cd /mnt/c/Users/%USERNAME%/gauntlet/chatapp && npm run wsl:server"
) else if "%option%"=="3" (
    echo Starting client only...
    wsl bash -c "cd /mnt/c/Users/%USERNAME%/gauntlet/chatapp && npm run wsl:client"
) else if "%option%"=="4" (
    echo Starting PostgreSQL database...
    wsl bash -c "cd /mnt/c/Users/%USERNAME%/gauntlet/chatapp && npm run wsl:docker:db"
) else if "%option%"=="5" (
    echo Starting Docker Compose environment...
    wsl bash -c "cd /mnt/c/Users/%USERNAME%/gauntlet/chatapp && npm run wsl:docker:up"
) else if "%option%"=="6" (
    echo Running setup script...
    wsl bash -c "cd /mnt/c/Users/%USERNAME%/gauntlet/chatapp && ./wsl-setup.sh"
) else (
    echo Invalid option selected.
    pause
    exit /b 1
)

pause 