@echo off
echo ========================================
echo  NovaPD - FMCG Product Development Platform
echo  Backend API running on http://localhost:8001
echo ========================================
cd /d "%~dp0"
uvicorn main:app --reload --host 0.0.0.0 --port 8001
