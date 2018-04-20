@echo off
Schtasks.exe /end /tn "Vapour-Apps monitoring" 
Schtasks.exe /delete /f /tn "Vapour-Apps monitoring" 
