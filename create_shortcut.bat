@echo off
set SCRIPT="%TEMP%\%RANDOM%-%RANDOM%-%RANDOM%-%RANDOM%.vbs"
echo Set oWS = WScript.CreateObject("WScript.Shell") >> %SCRIPT%
echo sLinkFile = "%USERPROFILE%\Desktop\Android-Auto-Car-Screen.lnk" >> %SCRIPT%
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> %SCRIPT%
echo oLink.TargetPath = "C:\Users\Shihab\AppData\Local\Android\Sdk\extras\google\auto\desktop-head-unit.exe" >> %SCRIPT%
echo oLink.WorkingDirectory = "C:\Users\Shihab\AppData\Local\Android\Sdk\extras\google\auto\" >> %SCRIPT%
echo oLink.Save >> %SCRIPT%
cscript /nologo %SCRIPT%
del %SCRIPT%
