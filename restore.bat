@echo off
Schtasks.exe /end /tn "Vapour-Apps backup sync" 
Schtasks.exe /delete /f /tn "Vapour-Apps backup sync" 



echo "Restore results:" > c:\VapourApps\restore.log 2>&1
C:\VapourApps\mc.exe --C c:\\VapourApps mirror --no-color -q --overwrite --remove "va-buckets/samplepictures" "C:\Users\Public\Pictures\Sample Pictures" >> c:\VapourApps\restore.log 2>&1
C:\VapourApps\mc.exe --C c:\\VapourApps mirror --no-color -q --overwrite --remove "va-buckets/samplemusic" "C:\Users\Public\Music\Sample Music" >> c:\VapourApps\restore.log 2>&1
C:\VapourApps\mc.exe --C c:\\VapourApps mirror --no-color -q --overwrite --remove  "va-buckets/samplevideos" "C:\Users\Public\Videos\Sample Videos" >> c:\VapourApps\restore.log 2>&1
