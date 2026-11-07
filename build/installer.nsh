; NanoTimer installer additions.
;
; electron-builder creates the desktop shortcut unconditionally when
; `createDesktopShortcut` is true. We turn that off and ask on our own page
; instead, so the user can keep the desktop clean.
;
; Notes:
;  - This file is included before MUI2, so no MUI_HEADER_TEXT here.
;  - The script is compiled twice (installer and uninstaller); the page and its
;    variables must be guarded by !ifndef BUILD_UNINSTALLER, otherwise NSIS
;    warns about unreferenced code and electron-builder treats that as error.

!include nsDialogs.nsh
!include LogicLib.nsh
!include WinMessages.nsh

!ifndef BUILD_UNINSTALLER

Var DesktopShortcutCheckbox
Var DesktopShortcutState

!macro customPageAfterChangeDir
  Page custom DesktopShortcutPageCreate DesktopShortcutPageLeave
!macroend

Function DesktopShortcutPageCreate
  nsDialogs::Create 1018
  Pop $0
  ${If} $0 == error
    Abort
  ${EndIf}

  ; The wizard header still shows the directory page text, so set our own.
  GetDlgItem $0 $HWNDPARENT 1037
  SendMessage $0 ${WM_SETTEXT} 0 "STR:安裝選項 / Installation options"
  GetDlgItem $0 $HWNDPARENT 1038
  SendMessage $0 ${WM_SETTEXT} 0 "STR:選擇安裝時要建立的捷徑。 / Choose the shortcuts to create."

  ${NSD_CreateCheckbox} 0 6u 100% 14u "建立桌面捷徑 / Create a desktop shortcut"
  Pop $DesktopShortcutCheckbox
  ${NSD_Check} $DesktopShortcutCheckbox

  ${NSD_CreateLabel} 0 26u 100% 30u "開始選單的捷徑一定會建立。/ A Start menu shortcut is always created."
  Pop $0

  nsDialogs::Show
FunctionEnd

Function DesktopShortcutPageLeave
  ${NSD_GetState} $DesktopShortcutCheckbox $DesktopShortcutState
FunctionEnd

!endif

!macro customInstall
  ${If} $DesktopShortcutState == ${BST_CHECKED}
    CreateShortCut "$DESKTOP\${SHORTCUT_NAME}.lnk" "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
  ${EndIf}
!macroend

!macro customUnInstall
  Delete "$DESKTOP\${SHORTCUT_NAME}.lnk"
!macroend
