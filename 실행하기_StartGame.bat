@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo [리듬 스틱 대쉬 - Rhythm Stick Dash] 로컬 서버를 시작합니다...
start "" "http://localhost:8080"
python -m http.server 8080
pause
