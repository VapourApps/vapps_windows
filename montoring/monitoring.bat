@echo off
@echo off
setlocal
call :GetUnixTime UNIX_TIME
echo %UNIX_TIME% > C:\VapourApps\connector\config\monitoring.txt
goto :OK

:GetUnixTime
setlocal enableextensions
for /f %%x in ('wmic path win32_utctime get /format:list ^| findstr "="') do (
    set %%x)
set /a z=(14-100%Month%%%100)/12, y=10000%Year%%%10000-z
set /a ut=y*365+y/4-y/100+y/400+(153*(100%Month%%%100+12*z-3)+2)/5+Day-719469
set /a ut=ut*86400+100%Hour%%%100*3600+100%Minute%%%100*60+100%Second%%%100
endlocal & set "%1=%ut%" & goto :OK

:OK


setlocal

REM CPU

for /f "usebackq skip=1 tokens=1" %%i in (`wmic cpu get loadpercentage ^| findstr /r /v "^$"`) do @echo CPU;Used;%%;%%i >> C:\VapourApps\connector\config\monitoring.txt

REM RAM

for /f "usebackq skip=1 tokens=1" %%i in (`wmic OS get FreePhysicalMemory ^| findstr /r /v "^$"`) do @echo Memory;Free;KB;%%i >> C:\VapourApps\connector\config\monitoring.txt

for /f "usebackq skip=1 tokens=1" %%i in (`wmic ComputerSystem get TotalPhysicalMemory ^| findstr /r /v "^$"`) do @echo Memory;Total;B;%%i >> C:\VapourApps\connector\config\monitoring.txt



REM HDD
REM 
for /f "tokens=1,2,3" %%a in ('wmic LogicalDisk Where DriveType^="3" Get DeviceID^,Size^,FreeSpace^|find ":"') do @echo HDD;Free;B;%%a;%%b >> C:\VapourApps\connector\config\monitoring.txt & echo HDD;Total;B;%%a;%%c >> C:\VapourApps\connector\config\monitoring.txt 


endlocal

