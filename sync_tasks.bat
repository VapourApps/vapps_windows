@echo off
Schtasks.exe /end /tn "Vapour-Apps backup sync" 
Schtasks.exe /delete /f /tn "Vapour-Apps backup sync"
Schtasks.exe /delete /f /tn "Vapour-Apps backup sync" 
Schtasks.exe /create /tn "Vapour-Apps backup sync" /tr "C:\VapourApps\sync.bat" /sc MINUTE /mo 2 /ru SYSTEM 
Schtasks.exe /run /tn "Vapour-Apps backup sync"