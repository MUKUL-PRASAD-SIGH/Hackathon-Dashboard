@echo off
echo 🔧 CORS Fix - Restarting Backend Server
echo.

cd server
echo 📦 Installing dependencies...
call npm install

echo.
echo 🚀 Starting server with CORS fix...
echo 📍 Server will run on http://localhost:5000
echo 🌐 CORS now allows all origins
echo.

call npm start