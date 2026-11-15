@echo off
setlocal
cd /d "%~dp0"
if exist "%~dp0.venv\Scripts\python.exe" (
  "%~dp0.venv\Scripts\python.exe" "%~dp0tools\local_server.py" --stop %*
  goto finished
)
where py >nul 2>nul
if not errorlevel 1 (
  py -3 "%~dp0tools\local_server.py" --stop %*
  goto finished
)
where python >nul 2>nul
if not errorlevel 1 (
  python "%~dp0tools\local_server.py" --stop %*
  goto finished
)
echo Python 3.11 or newer is needed to stop the SKYSHIFT server. You can also press Ctrl+C in its server window.
pause
exit /b 1
:finished
set "SKYSHIFT_EXIT=%errorlevel%"
if not "%SKYSHIFT_EXIT%"=="0" pause
exit /b %SKYSHIFT_EXIT%
