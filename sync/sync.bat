@echo off
echo Last sync > c:\VapourApps\sync.log 2>&1
C:\VapourApps\mc.exe --C c:\\VapourApps mirror --no-color -q --overwrite --remove "C:\Users\Public\Videos\Sample Videos" "va-buckets/samplevideos" >> c:\VapourApps\sync.log 2>&1
