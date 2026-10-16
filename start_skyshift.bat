@echo off
setlocal
cd /d "%~dp0"
title SKYSHIFT local server
if exist "%~dp0.venv\Scripts\python.exe" (
  "%~dp0.venv\Scripts\python.exe" "%~dp0tools\local_server.py" --open-browser %*
  goto finished
)
where py >nul 2>nul
if not errorlevel 1 (
  py -3 "%~dp0tools\local_server.py" --open-browser %*
  goto finished
)
where python >nul 2>nul
if not errorlevel 1 (
  python "%~dp0tools\local_server.py" --open-browser %*
  goto finished
)
echo SKYSHIFT needs Python 3.11 or newer. Install Python from python.org, then run this file again.
pause
exit /b 1
:finished
set "SKYSHIFT_EXIT=%errorlevel%"
if not "%SKYSHIFT_EXIT%"=="0" pause
exit /b %SKYSHIFT_EXIT%
