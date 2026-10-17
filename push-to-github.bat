@echo off
title Push Sumukha Co-Op Society to GitHub
echo ========================================================
echo Pushing Sumukha Co-Op Society to GitHub
echo Repository: https://github.com/sumukhasociety160826/Sumukha_co_ops
echo ========================================================
echo.

cd /d "C:\Users\Admin\OneDrive\Documents\Sumukha\Sumukha_project"
set PATH=C:\Users\Admin\AppData\Local\Programs\git\cmd;C:\Users\Admin\AppData\Local\Programs\nodejs;%PATH%

git push -u origin main

echo.
echo ========================================================
echo Process finished.
echo ========================================================
pause
