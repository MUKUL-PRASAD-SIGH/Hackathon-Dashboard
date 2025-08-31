@echo off
echo 🚀 Starting Hackathon Dashboard Backend (Fixed)
echo.
echo 🔧 Configuration:
echo - Port: 10000
echo - Socket.IO: Enabled
echo - CORS: Configured
echo.

cd /d "c:\Users\Mukul Prasad\Desktop\PROJECTS\StoryBook\server"

echo 📦 Installing dependencies...
call npm install

echo.
echo 🌐 Starting server...
echo 📍 Backend URL: http://localhost:10000
echo 🔌 Socket.IO URL: http://localhost:10000
echo.

node server.js

pause