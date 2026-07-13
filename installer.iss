#define MyAppName "Palworld Server Admin"
#define MyAppVersion "1.0.7"
#define MyAppPublisher "Palworld Server Admin"
#define MyAppExeName "PalworldServerAdmin.exe"
#define MyAppExeNameSilent "PalworldServerAdminSilent.exe"

[Setup]
AppId={{C9B75D37-C6F7-4487-A49C-FBE76815AF7F}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
OutputDir=installer_output
OutputBaseFilename=PalworldServerAdmin-Setup
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
UninstallDisplayIcon={app}\{#MyAppExeName}

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a &desktop shortcut"; GroupDescription: "Additional shortcuts:"
Name: "startuprecovery"; Description: "Start AutoPalExpress with Windows (helps restart your server after this machine reboots)"; GroupDescription: "Startup recovery:"; Flags: unchecked

[Files]
Source: "dist\PalworldServerAdmin.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "dist\PalworldServerAdminSilent.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "support\diagnose-autopalexpress.ps1"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Check: not ShouldRunSilently
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeNameSilent}"; Check: ShouldRunSilently
Name: "{group}\Diagnose AutoPalExpress"; Filename: "{sys}\WindowsPowerShell\v1.0\powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\diagnose-autopalexpress.ps1"" -DataDir ""{localappdata}\PalworldServerAdmin\data"" -ReportDir ""{localappdata}\PalworldServerAdmin\diagnostics"""; WorkingDir: "{app}"
Name: "{group}\Uninstall {#MyAppName}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon; Check: not ShouldRunSilently
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeNameSilent}"; Tasks: desktopicon; Check: ShouldRunSilently

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Launch {#MyAppName}"; Flags: nowait postinstall skipifsilent; Check: not ShouldRunSilently
Filename: "{app}\{#MyAppExeNameSilent}"; Description: "Launch {#MyAppName}"; Flags: nowait postinstall skipifsilent; Check: ShouldRunSilently

[Registry]
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; ValueName: "AutoPalExpress"; ValueData: """{app}\{#MyAppExeName}"""; Flags: uninsdeletevalue; Tasks: startuprecovery; Check: not ShouldRunSilently
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; ValueName: "AutoPalExpress"; ValueData: """{app}\{#MyAppExeNameSilent}"""; Flags: uninsdeletevalue; Tasks: startuprecovery; Check: ShouldRunSilently

; App data lives in %LOCALAPPDATA%\PalworldServerAdmin. Most of it is
; deliberately left in place on uninstall (instances.json - references to
; real, separately-installed Palworld server folders - plus mods and
; backups), so a reinstall doesn't lose track of anything real. The admin
; account (users.json) and app-level settings (system_settings.json) are the
; exception: CurUninstallStepChanged in [Code] clears those specifically, so
; reinstalling after a real uninstall asks to set up a fresh admin account
; instead of silently reusing the old one (TICKET-0063).

[Code]
procedure ExitProcess(uExitCode: UINT);
  external 'ExitProcess@kernel32.dll stdcall';

var
  InstallModePage: TInputOptionWizardPage;
  RunSilentlyPage: TInputOptionWizardPage;
  ServerNamePage: TInputQueryWizardPage;
  ServerInstallDirPage: TInputDirWizardPage;
  SuperAdminPage: TInputQueryWizardPage;
  SetupProgressPage: TOutputProgressWizardPage;
  AdminAccountExists: Boolean;
  ServerDataExists: Boolean;

// Deliberately two independent checks, not one combined "existing setup"
// flag - a real uninstall (see CurUninstallStepChanged below) clears the
// admin account but keeps instances.json, so right after an uninstall then
// reinstall, AdminAccountExists is False while ServerDataExists is still
// True. Collapsing these back into one flag is what originally caused the
// Super Admin page to wrongly stay hidden after a real uninstall (TICKET-0063).
function HasAdminAccount(): Boolean;
begin
  Result := FileExists(ExpandConstant('{localappdata}\PalworldServerAdmin\data\users.json'));
end;

// Crude substring check rather than real JSON parsing - Inno's Pascal has
// no JSON library, and the app itself only ever writes this file compactly
// (Python's json.dumps default separators, or this installer's own
// hand-built compact JSON), so this is good enough to read one boolean back.
function CurrentRunSilentlySetting(): Boolean;
var
  SettingsPath: String;
  Contents: AnsiString;
begin
  Result := False;
  SettingsPath := ExpandConstant('{localappdata}\PalworldServerAdmin\data\system_settings.json');
  if not FileExists(SettingsPath) then
    Exit;
  if not LoadStringFromFile(SettingsPath, Contents) then
    Exit;
  Result := (Pos('"runSilently": true', Contents) > 0) or (Pos('"runSilently":true', Contents) > 0);
end;

function HasServerData(): Boolean;
begin
  Result := FileExists(ExpandConstant('{localappdata}\PalworldServerAdmin\data\instances.json'));
end;

// Whether AutoPalExpress is actually currently installed (a real Inno
// uninstall entry exists), as opposed to HasAdminAccount/HasServerData
// above, which only check for leftover app data - most app data is
// deliberately kept after an uninstall (see the [Registry] section
// comment), so those would otherwise falsely say "installed" right after a
// full uninstall.
function GetUninstallString(): String;
var
  UninstallKey: String;
  UninstallCommand: String;
begin
  UninstallKey := 'Software\Microsoft\Windows\CurrentVersion\Uninstall\{C9B75D37-C6F7-4487-A49C-FBE76815AF7F}_is1';
  UninstallCommand := '';
  if not RegQueryStringValue(HKA, UninstallKey, 'UninstallString', UninstallCommand) then
    RegQueryStringValue(HKA, UninstallKey, 'QuietUninstallString', UninstallCommand);
  Result := UninstallCommand;
end;

function IsAppInstalled(): Boolean;
begin
  Result := GetUninstallString() <> '';
end;

// Used as the Check: condition on the paired [Icons]/[Run]/[Registry]
// entries above, so exactly one of each pair actually applies.
function ShouldRunSilently(): Boolean;
begin
  Result := RunSilentlyPage.SelectedValueIndex = 1;
end;

procedure RunUninstallAndExit();
var
  UninstallCommand: String;
  ResultCode: Integer;
begin
  UninstallCommand := GetUninstallString();
  if UninstallCommand = '' then
    Exit;

  SetupProgressPage.SetText('Uninstalling AutoPalExpress...', '');
  SetupProgressPage.Show;
  try
    Exec(RemoveQuotes(UninstallCommand), '/SILENT', '', SW_SHOW, ewWaitUntilTerminated, ResultCode);
  finally
    SetupProgressPage.Hide;
  end;
  MsgBox('AutoPalExpress has been uninstalled. Your Palworld server files, mods, and backups were kept - your ' +
         'admin account and app settings were reset, so installing again will ask you to set those up fresh.',
         mbInformation, MB_OK);
  ExitProcess(0);
end;

procedure InitializeWizard;
begin
  AdminAccountExists := HasAdminAccount;
  ServerDataExists := HasServerData;

  InstallModePage := CreateInputOptionPage(wpWelcome,
    'Setup Mode', 'What would you like to do?',
    'Choose an option, then click Next.', True, False);
  InstallModePage.Add('Install AutoPalExpress');
  InstallModePage.Add('Update AutoPalExpress');
  InstallModePage.Add('Uninstall AutoPalExpress');
  if IsAppInstalled then
    InstallModePage.SelectedValueIndex := 1
  else
    InstallModePage.SelectedValueIndex := 0;

  // Shown on every install AND update (deliberately not in ShouldSkipPage's
  // skip list below) - console visibility is fixed per-executable at build
  // time (PalworldServerAdmin.exe vs PalworldServerAdminSilent.exe), so
  // there's no reliable way to change it later without running this
  // installer again anyway.
  RunSilentlyPage := CreateInputOptionPage(InstallModePage.ID,
    'Run Silently', 'Hide the console windows?',
    'AutoPalExpress normally leaves a console window open so you can see it''s running, plus the Palworld ' +
    'server''s own window. Choose to hide both instead if you''d rather have a clean desktop - you can change ' +
    'this later by running this installer again.', True, False);
  RunSilentlyPage.Add('Show the console windows (recommended)');
  RunSilentlyPage.Add('Run silently in the background (hide both console windows)');
  if CurrentRunSilentlySetting then
    RunSilentlyPage.SelectedValueIndex := 1
  else
    RunSilentlyPage.SelectedValueIndex := 0;

  ServerNamePage := CreateInputQueryPage(wpSelectTasks,
    'New Server', 'Deploy a Palworld Dedicated Server now',
    'Give your first server a name and it will be downloaded via SteamCMD into this tool''s own "servers" ' +
    'folder as soon as setup finishes. Leave this blank to skip - you can deploy one later from the app instead.');
  ServerNamePage.Add('Server name (optional):', False);

  ServerInstallDirPage := CreateInputDirPage(ServerNamePage.ID,
    'Server Install Location', 'Choose where the first Palworld server will be stored',
    'AutoPalExpress will create a server folder named after your server inside this location.',
    False, '');
  ServerInstallDirPage.Add('Parent folder for the first server:');
  ServerInstallDirPage.Values[0] := ExpandConstant('{localappdata}\PalworldServerAdmin\data\servers');

  SuperAdminPage := CreateInputQueryPage(ServerInstallDirPage.ID,
    'Super Admin Account', 'Create the account that fully controls this tool',
    'This machine gets exactly one super admin - that''s you. Friends you invite later register as regular ' +
    'admins with day-to-day access (start/stop, mods, players), not this level of control.');
  SuperAdminPage.Add('Username:', False);
  SuperAdminPage.Add('Password (at least 8 characters):', True);
  SuperAdminPage.Add('Confirm password:', True);

  SetupProgressPage := CreateOutputProgressPage('Finishing Setup',
    'Applying what you entered - this window updates automatically.');
end;

function ShouldSkipPage(PageID: Integer): Boolean;
begin
  Result := False;

  if AdminAccountExists and (PageID = SuperAdminPage.ID) then
    Result := True;

  if ServerDataExists then
  begin
    if (PageID = ServerNamePage.ID) or (PageID = ServerInstallDirPage.ID) then
      Result := True;
  end
  else if PageID = ServerInstallDirPage.ID then
    Result := Trim(ServerNamePage.Values[0]) = '';
end;

function NextButtonClick(CurPageID: Integer): Boolean;
begin
  Result := True;
  if CurPageID = InstallModePage.ID then
  begin
    if InstallModePage.SelectedValueIndex = 2 then
    begin
      if not IsAppInstalled then
      begin
        MsgBox('AutoPalExpress is not currently installed, so there is nothing to uninstall.', mbError, MB_OK);
        Result := False;
      end
      else if MsgBox('This will uninstall AutoPalExpress. Your Palworld server files, mods, and backups will be kept, ' +
                      'but your admin account and app settings will be reset. Continue?',
                      mbConfirmation, MB_YESNO) = IDYES then
        RunUninstallAndExit
      else
        Result := False;
    end;
    Exit;
  end;
  if CurPageID = SuperAdminPage.ID then
  begin
    if Trim(SuperAdminPage.Values[0]) = '' then
    begin
      MsgBox('Enter a username for the super admin account.', mbError, MB_OK);
      Result := False;
    end
    else if Length(SuperAdminPage.Values[1]) < 8 then
    begin
      MsgBox('The password must be at least 8 characters.', mbError, MB_OK);
      Result := False;
    end
    else if SuperAdminPage.Values[1] <> SuperAdminPage.Values[2] then
    begin
      MsgBox('Passwords do not match.', mbError, MB_OK);
      Result := False;
    end;
  end;
end;

function JsonEscape(S: String): String;
var
  R: String;
  I: Integer;
  C: Char;
  Cr, Lf: Char;
begin
  Cr := Chr(13);
  Lf := Chr(10);
  R := '';
  for I := 1 to Length(S) do
  begin
    C := S[I];
    if C = '"' then
      R := R + '\"'
    else if C = '\' then
      R := R + '\\'
    else if C = Cr then
      R := R + ''
    else if C = Lf then
      R := R + '\n'
    else
      R := R + C;
  end;
  Result := R;
end;

function BuildSeedJson(): String;
var
  Body: String;
  NL: String;
begin
  NL := Chr(13) + Chr(10);
  Body := '  "superAdminUsername": "' + JsonEscape(SuperAdminPage.Values[0]) + '",' + NL +
          '  "superAdminPassword": "' + JsonEscape(SuperAdminPage.Values[1]) + '"';
  if Trim(ServerNamePage.Values[0]) <> '' then
  begin
    Body := Body + ',' + NL + '  "serverName": "' + JsonEscape(ServerNamePage.Values[0]) + '"';
    if Trim(ServerInstallDirPage.Values[0]) <> '' then
      Body := Body + ',' + NL + '  "serverInstallParentDir": "' + JsonEscape(ServerInstallDirPage.Values[0]) + '"';
  end;
  Result := '{' + NL + Body + NL + '}' + NL;
end;

// Always writes all three fields fresh from the wizard's current answers,
// rather than only writing (and only when checked) like the old
// startup-recovery-only version of this did - that meant unchecking
// "start with Windows" on an update never actually cleared a previously
// saved `true`, since the old code just skipped writing entirely in that
// case. Run Silently needs writing every time regardless, since it's asked
// on every install/update, not gated behind a task checkbox.
procedure SaveSystemSettings;
var
  SettingsDir: String;
  SettingsPath: String;
  NL: String;
  Body: String;
  StartupRecoveryEnabled: String;
  RunSilentlyValue: String;
begin
  NL := Chr(13) + Chr(10);
  SettingsDir := ExpandConstant('{localappdata}\PalworldServerAdmin\data');
  SettingsPath := SettingsDir + '\system_settings.json';
  ForceDirectories(SettingsDir);

  if WizardIsTaskSelected('startuprecovery') then
    StartupRecoveryEnabled := 'true'
  else
    StartupRecoveryEnabled := 'false';

  if ShouldRunSilently then
    RunSilentlyValue := 'true'
  else
    RunSilentlyValue := 'false';

  Body := '{' + NL +
          '  "bootWithWindows": ' + StartupRecoveryEnabled + ',' + NL +
          '  "autoStartActiveServer": ' + StartupRecoveryEnabled + ',' + NL +
          '  "runSilently": ' + RunSilentlyValue + NL +
          '}' + NL;
  SaveStringToFile(SettingsPath, Body, False);
end;

procedure RunFirstTimeSetup;
var
  ResultCode: Integer;
  ExePath: String;
  LogPath: String;
  LogLines: TStringList;
  ElapsedSeconds: Integer;
  Done: Boolean;
begin
  if ShouldRunSilently then
    ExePath := ExpandConstant('{app}\{#MyAppExeNameSilent}')
  else
    ExePath := ExpandConstant('{app}\{#MyAppExeName}');
  LogPath := ExpandConstant('{localappdata}\PalworldServerAdmin\data\first_run_progress.log');

  SetupProgressPage.SetText('Starting the app to apply your answers...', '');
  SetupProgressPage.Show;
  try
    if not Exec(ExePath, '', '', SW_SHOWNORMAL, ewNoWait, ResultCode) then
    begin
      SetupProgressPage.SetText('Couldn''t start the app automatically - open it yourself to finish setup.', '');
      Sleep(2000);
      Exit;
    end;

    Done := False;
    ElapsedSeconds := 0;
    LogLines := TStringList.Create;
    try
      // Up to 15 minutes - long enough for a full SteamCMD download on a slow
      // connection. If it never finishes in time, the wizard just moves on;
      // every step here (account, deploy) has a manual fallback
      // already built into the app, so this is a convenience, not the only
      // way any of it can happen.
      // Short sleep + explicit repaint each tick, rather than one long
      // Sleep - Inno Setup's [Code] runs on the same thread as the wizard
      // window, so this keeps the progress text visibly updating and the
      // window responsive instead of appearing frozen for minutes at a time.
      while (not Done) and (ElapsedSeconds < 3600) do
      begin
        Sleep(250);
        ElapsedSeconds := ElapsedSeconds + 1;
        WizardForm.Repaint;
        if (ElapsedSeconds mod 4 = 0) and FileExists(LogPath) then
        begin
          LogLines.LoadFromFile(LogPath);
          if LogLines.Count > 0 then
            SetupProgressPage.SetText(LogLines[LogLines.Count - 1], '');
          if LogLines.IndexOf('DONE') >= 0 then
            Done := True;
        end;
      end;
    finally
      LogLines.Free;
    end;
  finally
    SetupProgressPage.Hide;
  end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  SeedPath: String;
begin
  if CurStep = ssPostInstall then
  begin
    SaveSystemSettings;
    SeedPath := ExpandConstant('{app}\first_run_seed.json');
    // Nothing left to provision only when both an admin account and server
    // data already exist - a post-uninstall reinstall has AdminAccountExists
    // = False (see CurUninstallStepChanged) even though ServerDataExists is
    // still True, so this still runs to recreate just the admin account.
    // BuildSeedJson only fills in serverName if ServerNamePage was actually
    // shown and filled in, and first_run_setup.py safely no-ops
    // create_first_super_admin if an account is somehow already there - so
    // this is safe to run whenever either half is missing.
    if AdminAccountExists and ServerDataExists then
    begin
      DeleteFile(SeedPath);
      Exit;
    end;

    if not WizardSilent() then
    begin
      SaveStringToFile(SeedPath, BuildSeedJson(), False);
      RunFirstTimeSetup;
    end;
  end;
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  DataDir: String;
begin
  // Runs inside the compiled unins000.exe itself, so this applies no matter
  // how the user uninstalls - the installer's own Uninstall option
  // (RunUninstallAndExit above), Control Panel, or the Start Menu shortcut
  // all end up running this same uninstaller. Only the admin account and
  // app-level settings are cleared; instances.json (references to real,
  // separately-installed Palworld server folders), mods, and backups are
  // deliberately left alone - see the [Registry] section comment.
  if CurUninstallStep = usPostUninstall then
  begin
    DataDir := ExpandConstant('{localappdata}\PalworldServerAdmin\data');
    DeleteFile(DataDir + '\users.json');
    DeleteFile(DataDir + '\system_settings.json');
  end;
end;
