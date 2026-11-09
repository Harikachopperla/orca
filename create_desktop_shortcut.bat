@echo off
cd /d "%~dp0"
echo =====================================================================
echo    Creating Desktop Shortcut for ORCA Marine Intelligence...
echo =====================================================================

powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut([System.IO.Path]::Combine([System.Environment]::GetFolderPath('Desktop'), 'ORCA Marine Intelligence.lnk')); $s.TargetPath = '%~dp0start_orca.bat'; $s.WorkingDirectory = '%~dp0'; $s.Description = 'ORCA – From Ocean Data to Informed Action'; $s.Save(); Write-Host 'Shortcut created successfully on your Desktop!'"

echo.
echo Desktop shortcut created! You can now double-click "ORCA Marine Intelligence" from your Desktop anytime.
pause

