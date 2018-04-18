@echo off
Schtasks.exe /end /tn "Vapour-Apps backup sync" 
Schtasks.exe /delete /f /tn "Vapour-Apps backup sync" 
