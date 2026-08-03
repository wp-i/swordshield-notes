Var LegacyInstallDetected
Var LegacyAutoStartDetected
Var LegacyUninstaller

!macro NSIS_HOOK_PREINSTALL
  ; The product name is part of Tauri's default installation directory. Remove
  ; the former installation before registering the renamed product so an
  ; upgrade leaves one current executable instead of two parallel installs.
  StrCpy $LegacyInstallDetected "0"
  StrCpy $LegacyAutoStartDetected "0"

  ReadRegStr $0 HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "剑盾记事"
  ${If} $0 != ""
    StrCpy $LegacyAutoStartDetected "1"
  ${EndIf}

  ReadRegStr $LegacyUninstaller HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\剑盾记事" "UninstallString"
  ${If} $LegacyUninstaller != ""
    StrCpy $LegacyInstallDetected "1"
    ExecWait '$LegacyUninstaller /S' $0
  ${EndIf}
!macroend

!macro NSIS_HOOK_POSTINSTALL
  ; Remove visible launch entries that still use the former product name.
  Delete "$DESKTOP\剑盾记事.lnk"
  Delete "$SMPROGRAMS\剑盾记事.lnk"

  ; The widget intentionally has no taskbar or tray entry, so the desktop
  ; shortcut is its explicit relaunch path after the user closes it.
  Call CreateOrUpdateDesktopShortcut
  ; Use a fingerprinted standalone icon path so Explorer cannot reuse a stale
  ; icon cached for the executable path after a visual identity update.
  CreateShortCut "$DESKTOP\${PRODUCTNAME}.lnk" "$INSTDIR\${MAINBINARYNAME}.exe" "" "$INSTDIR\product-mark-a983b021.ico" 0 SW_SHOWNORMAL "" "${PRODUCTNAME}"

  ; Preserve the user's startup choice while migrating the registry value.
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "剑盾记事"
  ${If} $LegacyAutoStartDetected == "1"
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "${PRODUCTNAME}" '"$INSTDIR\${MAINBINARYNAME}.exe"'
  ${ElseIf} $LegacyInstallDetected == "0"
    ${If} $UpdateMode <> 1
      WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "${PRODUCTNAME}" '"$INSTDIR\${MAINBINARYNAME}.exe"'
    ${EndIf}
  ${EndIf}

  ; The new product registry entry is already written before this hook runs.
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\剑盾记事"
!macroend
