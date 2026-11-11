@echo off
chcp 65001 >nul
rem ===== Find Number: build the picture list (img\images.js) =====
rem Put pictures (.png .jpg .jpeg .webp .gif .svg) in the "img" folder, then double-click this file.
cd /d "%~dp0img" || (echo Folder "img" not found next to this file. & pause & exit /b)
> images.js echo window.FN_IMAGES=[
for %%f in (*.png *.jpg *.jpeg *.webp *.gif *.svg) do >> images.js echo "%%f",
>> images.js echo ];
set n=0
for %%f in (*.png *.jpg *.jpeg *.webp *.gif *.svg) do set /a n+=1
echo.
echo Done: img\images.js  (%n% pictures)
echo Upload the whole img folder together with the game files.
pause
