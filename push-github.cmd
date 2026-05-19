@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\push-github.ps1" %*
