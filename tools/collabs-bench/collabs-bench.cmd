@echo off
setlocal enabledelayedexpansion

set ROOT=%~dp0\..\..
set OUT=%~dp0_out
set PORT=3131
set BASE=http://127.0.0.1:%PORT%
set TOTAL_TICKS=0
set MAX_TOTAL=180
set DEV_WAIT_MAX=120
set SHOT_WAIT_MAX=20
set ERR=

if not exist "%OUT%" mkdir "%OUT%"
if exist "%OUT%\edge_capture.log" del /q "%OUT%\edge_capture.log"

echo [collabs-bench] Starting Next dev server
taskkill /im node.exe /f /t >nul 2>nul
taskkill /im msedge.exe /f /t >nul 2>nul

pushd "%ROOT%"
if exist "%OUT%\dev.log" del /q "%OUT%\dev.log"
start "" /b cmd /c npm run dev -- -p %PORT% > "%OUT%\dev.log" 2>&1
popd

set /a DEV_WAIT=0
:wait_dev
call :check_total
if errorlevel 1 (
  set "ERR=Exceeded 180 second total timeout."
  goto fail
)
if exist "%OUT%\dev.log" (
  findstr /i /c:"spawn EPERM" /c:"next_dev_direct" "%OUT%\dev.log" >nul
  if not errorlevel 1 (
    findstr /i /c:"spawn EPERM" "%OUT%\dev.log" >nul
    if not errorlevel 1 (
      set "ERR=Next dev server failed to start (spawn EPERM). See tools\collabs-bench\_out\dev.log."
      goto fail
    )
  )
)
curl --max-time 2 -fsS "%BASE%/collabs" >nul 2>nul
if %errorlevel%==0 goto dev_ready
set /a DEV_WAIT+=1
set /a TOTAL_TICKS+=1
if !DEV_WAIT! GEQ %DEV_WAIT_MAX% (
  set "ERR=Next dev server not reachable within 120 seconds."
  goto fail
)
ping -n 2 127.0.0.1 >nul
goto wait_dev

:dev_ready
echo [collabs-bench] Dev reachable, validating Next signature
if exist "%OUT%\collabs_probe.html" del /q "%OUT%\collabs_probe.html"
curl -fsS "%BASE%/collabs" > "%OUT%\collabs_probe.html" 2>nul
if errorlevel 1 (
  set "ERR=Could not fetch /collabs for Next signature validation."
  goto fail
)
findstr /i /c:"id=\"__next\"" "%OUT%\collabs_probe.html" >nul
if not errorlevel 1 goto next_ok
findstr /i /c:"__NEXT_DATA__" "%OUT%\collabs_probe.html" >nul
if errorlevel 1 (
  set "ERR=/collabs does not look like a real Next.js page (missing id=__next or __NEXT_DATA__)."
  goto fail
)
:next_ok

set EDGE=
if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" set "EDGE=C:\Program Files\Microsoft\Edge\Application\msedge.exe"
if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" set "EDGE=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
for /f "delims=" %%I in ('where msedge 2^>nul') do if not defined EDGE set "EDGE=%%I"
if not defined EDGE (
  set "ERR=msedge.exe not found."
  goto fail
)

echo [collabs-bench] Functional check
set COLLABS_BENCH_BASE=%BASE%
cmd /c node "%~dp0functional.js"
if errorlevel 1 (
  set "ERR=Functional gate failed."
  goto fail
)
echo pass> "%OUT%\functional_pass.txt"

call :capture "home center" "home_center.png" "/collabs?__collabsBench=1^&__p=0.5,0.5"
if errorlevel 1 goto fail
call :capture "home top-left" "home_topleft.png" "/collabs?__collabsBench=1^&__p=0.1,0.2"
if errorlevel 1 goto fail
call :capture "home bottom-right" "home_bottomright.png" "/collabs?__collabsBench=1^&__p=0.9,0.8"
if errorlevel 1 goto fail
call :capture "reels center" "reels_center.png" "/collabs/reels?__collabsBench=1^&__p=0.5,0.5"
if errorlevel 1 goto fail

echo [collabs-bench] Scoring
cmd /c node "%~dp0score.js"
if errorlevel 1 (
  set "ERR=Scoring failed."
  goto fail
)
type "%OUT%\latest_scores.json"

echo [collabs-bench] Completed
taskkill /im node.exe /f /t >nul 2>nul
taskkill /im msedge.exe /f /t >nul 2>nul
exit /b 0

:capture
set "LABEL=%~1"
set "FILE=%~2"
set "URL=%BASE%%~3"
set "PNG=%OUT%\%FILE%"

if exist "%PNG%" del /q "%PNG%"
echo [collabs-bench] Capturing %LABEL%
call :shot "%URL%" "%PNG%" "--virtual-time-budget=5000"
if !errorlevel! EQU 0 exit /b 0

echo [collabs-bench] Retrying %LABEL% with virtual-time-budget=12000
if exist "%PNG%" del /q "%PNG%"
call :shot "%URL%" "%PNG%" "--virtual-time-budget=12000"
if !errorlevel! EQU 0 exit /b 0

set "ERR=Capture failed twice for %LABEL%."
if exist "%OUT%\edge_capture.log" set "ERR=Capture failed twice for %LABEL%. See tools\collabs-bench\_out\edge_capture.log."
exit /b 1

:shot
set "URL=%~1"
set "PNG=%~2"
set "EXTRA=%~3"
set "EDGE_PROFILE=%OUT%\edge-profile"
if not exist "%EDGE_PROFILE%" mkdir "%EDGE_PROFILE%"

taskkill /im msedge.exe /f /t >nul 2>nul
start "" /b "%EDGE%" --headless=new --enable-webgl --ignore-gpu-blocklist --enable-unsafe-swiftshader --use-angle=swiftshader --use-gl=swiftshader --run-all-compositor-stages-before-draw --window-size=2048,1024 --hide-scrollbars --force-device-scale-factor=1 --disable-crash-reporter --no-first-run --no-default-browser-check --user-data-dir="%EDGE_PROFILE%" %EXTRA% --screenshot="%PNG%" "%URL%" >> "%OUT%\edge_capture.log" 2>&1

set /a SHOT_WAIT=0
:wait_shot
call :check_total
if errorlevel 1 exit /b 1
if exist "%PNG%" (
  taskkill /im msedge.exe /f /t >nul 2>nul
  exit /b 0
)
set /a SHOT_WAIT+=1
set /a TOTAL_TICKS+=1
if !SHOT_WAIT! GEQ %SHOT_WAIT_MAX% (
  taskkill /im msedge.exe /f /t >nul 2>nul
  exit /b 1
)
ping -n 2 127.0.0.1 >nul
goto wait_shot

:check_total
if !TOTAL_TICKS! GEQ %MAX_TOTAL% exit /b 1
exit /b 0

:fail
if not defined ERR set "ERR=Unknown bench failure."
echo [collabs-bench] ERROR: %ERR%
taskkill /im node.exe /f /t >nul 2>nul
taskkill /im msedge.exe /f /t >nul 2>nul
exit /b 1
