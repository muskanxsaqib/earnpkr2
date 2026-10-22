@echo off
title Earning Hub - Next.js Turnkey Server
echo ===================================================
echo    Starting Earning Hub (Next.js) Local Server...
echo ===================================================
echo.
echo [1/2] Verifying environment configuration...
call node scripts/ensure_env.mjs
echo.
echo [2/2] Launching Local Server at http://localhost:3001 ...
start http://localhost:3001
call npm run dev
pause
