$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("C:\Users\user\Desktop\GIJO Smart MD Studio.lnk")
$Shortcut.TargetPath = "C:\Users\user\Desktop\GIJO Smart MD Studio.bat"
$Shortcut.IconLocation = "shell32.dll,70"
$Shortcut.Save()
