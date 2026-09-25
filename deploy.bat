@echo off
REM ============================================================
REM  deploy.bat - commit + push latest changes to GitHub (main).
REM  Render auto-deploys every push to main.
REM  Usage:  deploy                 (asks for a message)
REM          deploy "fix: something" (uses this message)
REM  Optional: set RENDER_DEPLOY_HOOK=<Render deploy hook URL>
REM            to also trigger a Render deploy immediately.
REM ============================================================
setlocal
cd /d "%~dp0"

git rev-parse --is-inside-work-tree >nul 2>&1 || (echo [ERROR] Not a git repository: %CD% & goto :fail)

for /f %%b in ('git rev-parse --abbrev-ref HEAD') do set BRANCH=%%b
if /i not "%BRANCH%"=="main" (echo [ERROR] You are on branch "%BRANCH%", expected "main". & goto :fail)

set "MSG=%~1"
if "%MSG%"=="" set /p "MSG=Commit message (Enter = auto): "
if "%MSG%"=="" set "MSG=Update %DATE% %TIME:~0,5%"

echo.
echo === Staging changes ===
git add -A
REM Never publish user-uploaded files or local passwords
git reset -q -- backend/uploads backend/.env backend/.env.example .env .env.local 2>nul

git diff --cached --quiet && (echo No new changes to commit.) || (
  git diff --cached --stat
  git commit -m "%MSG%" || goto :fail
)

echo.
echo === Getting latest from GitHub ===
git pull --rebase origin main || (echo [ERROR] Pull failed - resolve conflicts, then run deploy again. & goto :fail)

echo.
echo === Pushing to GitHub ===
git push origin main || (echo [ERROR] Push failed - check your GitHub login / access. & goto :fail)

if defined RENDER_DEPLOY_HOOK (
  echo.
  echo === Triggering Render deploy ===
  curl -s -X POST "%RENDER_DEPLOY_HOOK%" && echo.
)

echo.
echo [OK] Pushed to GitHub. Render will deploy the latest commit - watch progress in the Render dashboard.
goto :end

:fail
echo.
echo [FAILED] Deployment stopped.
:end
echo.
pause
endlocal
