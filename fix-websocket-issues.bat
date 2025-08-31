@echo off
echo 🔧 Fixing WebSocket Connection Issues
echo.

echo 📋 Step 1: Checking Node.js version...
node --version
echo.

echo 📋 Step 2: Installing Socket.IO dependencies...
cd /d "c:\Users\Mukul Prasad\Desktop\PROJECTS\StoryBook\server"
call npm install socket.io@4.7.5
cd /d "c:\Users\Mukul Prasad\Desktop\PROJECTS\StoryBook"
call npm install socket.io-client@4.7.5
echo.

echo 📋 Step 3: Clearing npm cache...
call npm cache clean --force
echo.

echo 📋 Step 4: Testing backend connection...
cd /d "c:\Users\Mukul Prasad\Desktop\PROJECTS\StoryBook"
node test-websocket-connection.js
echo.

echo 📋 Step 5: Starting backend server...
echo 🌐 Backend will start on http://localhost:10000
echo 🔌 Socket.IO will be available on the same port
echo.
echo ⚠️  Make sure to:
echo   1. Start backend first: start-backend-fixed.bat
echo   2. Then start frontend: npm start
echo   3. Test connection: http://localhost:3000/socket-test
echo.

pause