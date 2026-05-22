Set objShell = CreateObject("WScript.Shell")
strPath = Left(WScript.ScriptFullName, InStrRev(WScript.ScriptFullName, "\"))
objShell.Run """" & strPath & "fmps-coordination-tool-bundled.html""", 1, False
