@echo off
title GH Studio - Deploy Firebase Hosting
color 0E
echo ========================================================
echo    GH STUDIO - DEPLOY AUTOMATICO NO FIREBASE HOSTING
echo ========================================================
echo.
echo [1/2] Verificando autenticacao com sua conta Google...
call npx -p firebase-tools firebase login
echo.
echo [2/2] Publicando arquivos do estudio no Firebase Hosting...
call npx -p firebase-tools firebase deploy --only hosting
echo.
echo ========================================================
echo   PUBLICACAO CONCLUIDA COM SUCESSO!
echo   Acesse seu estudio no ar:
echo   https://gh-studio-gestao.web.app
echo ========================================================
echo.
pause
