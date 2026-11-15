@echo off
setlocal
cd /d "%~dp0"
if exist ".venv\Scripts\python.exe" (
    ".venv\Scripts\python.exe" tools\prepare_public_static.py --destination tmp\skyshift-upload\dist
) else (
    py -3 tools\prepare_public_static.py --destination tmp\skyshift-upload\dist
)
if errorlevel 1 (
    echo Upload preparation failed. Check the error above.
    pause
    exit /b 1
)
echo.
echo Ready: %CD%\tmp\skyshift-upload\dist
echo Upload this dist folder to your independent static host.
echo See docs\deployment.md for the Netlify instructions.
pause
