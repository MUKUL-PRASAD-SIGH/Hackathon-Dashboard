@echo off
echo 🚀 Starting Hackathon Dashboard Development Environment
echo.

echo 📋 Checking setup...
node test-setup.js
echo.

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Setup check failed. Please fix issues above.
    pause
    exit /b 1
)

echo 🔧 Starting backend server...
start "Backend Server" cmd /k "cd server && npm start"

timeout /t 3 /nobreak > nul

echo 🌐 Starting frontend...
start "Frontend" cmd /k "npm start"

echo.
echo ✅ Both servers starting...
echo 📊 Backend: http://localhost:5000
echo 🌐 Frontend: http://localhost:3001
echo 🔍 Debug: http://localhost:3001/connection-test
echo.
echo Press any key to close this window...
pause > nul