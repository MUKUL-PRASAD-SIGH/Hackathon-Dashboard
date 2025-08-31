@echo off
echo Starting backend server on port 5001...
cd server
echo Current directory: %CD%
npm run dev
pause