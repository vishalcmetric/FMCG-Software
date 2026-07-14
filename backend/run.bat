@echo off
echo ========================================
echo  Zydus Wellness - Backend Server
echo  Running on http://localhost:8001
echo ========================================
cd /d "%~dp0"
uvicorn main:app --reload --host 0.0.0.0 --port 8001
