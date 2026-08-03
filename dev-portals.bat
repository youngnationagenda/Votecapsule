@echo off
:: Vote Capsule™ — Kill stale Vite ghosts then launch all 6 portals
:: Run this directly in a Windows terminal (cmd or PowerShell)
:: Usage: dev-portals.bat

echo.
echo  Vote Capsule(tm) - Killing stale node processes...
taskkill /F /IM node.exe /T >nul 2>&1
echo  Done. Starting all 6 portals...
echo.

node dev-portals.js
