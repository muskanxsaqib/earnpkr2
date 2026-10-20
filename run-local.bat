@echo off
title Earning Hub - Next.js Local Server
echo ===================================================
echo    Starting Earning Hub (Next.js) Local Server...
echo ===================================================
echo.
echo Local URL:   http://localhost:3001
echo.
start http://localhost:3001
call npm run dev
pause
