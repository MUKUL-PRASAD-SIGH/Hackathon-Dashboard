@echo off
echo 🔄 Restarting Server...

echo 📋 Killing existing server processes...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :10000') do (
    echo Killing PID %%a
    taskkill /PID %%a /F >nul 2>&1
)

echo ⏳ Waiting 2 seconds...
timeout /t 2 /nobreak >nul

echo 🚀 Starting server on port 10000...
cd /d "c:\Users\Mukul Prasad\Desktop\PROJECTS\StoryBook\server"
start "Backend Server" cmd /k "node server.js"

echo ✅ Server restart initiated!
echo 📍 Backend URL: http://localhost:10000
echo 🔌 Check console for "Server running on port 10000"

pause