@echo off
Schtasks.exe /delete /f /tn "Vapour-Apps monitoring" 
Schtasks.exe /create /tn "Vapour-Apps monitoring" /tr "C:\VapourApps\monitoring\monitoring.bat" /sc MINUTE /mo 2 /ru SYSTEM 
Schtasks.exe /run /tn "Vapour-Apps monitoring" 