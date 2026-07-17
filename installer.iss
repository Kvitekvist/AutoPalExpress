#define MyAppName "AutoPalExpress"
#define MyAppVersion "1.0.8"
#define MyAppPublisher "AutoPalExpress"
#define MyAppExeName "AutoPalExpress.exe"

[Setup]
AppId={{C9B75D37-C6F7-4487-A49C-FBE76815AF7F}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={commonpf}\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
OutputDir=installer_output
OutputBaseFilename=AutoPalExpress-Setup
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
; Always requires administrator rights (one UAC prompt) and always defaults
; to the real Program Files (TICKET-0136) - matches how most traditional
; Windows installers behave. The user can still Browse to a different folder
; on the destination page; this only changes what's suggested by default and
; removes the earlier no-admin "install for me only" choice (TICKET-0129)
; the user asked to drop in favor of a predictable Program Files default.
; Safe regardless of where {app} ends up, since app data (TICKET-0129) lives
; under the user's Documents folder, not inside {app}.
PrivilegesRequired=admin
UninstallDisplayIcon={app}\{#MyAppExeName}

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a &desktop shortcut"; GroupDescription: "Additional shortcuts:"
Name: "startuprecovery"; Description: "Start AutoPalExpress with Windows (helps restart your server after this machine reboots)"; GroupDescription: "Startup recovery:"; Flags: unchecked

[InstallDelete]
; Removes the stale old-named exe left behind in an existing install folder
; when upgrading from a version before this app was renamed to AutoPalExpress.
Type: files; Name: "{app}\PalworldServerAdmin.exe"

[Files]
Source: "dist\AutoPalExpress.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "support\diagnose-autopalexpress.ps1"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\Diagnose AutoPalExpress"; Filename: "{sys}\WindowsPowerShell\v1.0\powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\diagnose-autopalexpress.ps1"" -DataDir ""{userdocs}\AutoPalExpress\data"" -ReportDir ""{userdocs}\AutoPalExpress\diagnostics"""; WorkingDir: "{app}"
Name: "{group}\Uninstall {#MyAppName}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Launch {#MyAppName}"; Flags: nowait postinstall skipifsilent; Check: ShouldOfferLaunch

[Registry]
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; ValueName: "AutoPalExpress"; ValueData: """{app}\{#MyAppExeName}"""; Flags: uninsdeletevalue; Tasks: startuprecovery

; App data lives in {userdocs}\AutoPalExpress\data - the user's real Documents
; folder, not inside {app} (TICKET-0129; briefly inside {app} under TICKET-0123,
; and %LOCALAPPDATA%\PalworldServerAdmin before that - AutoPalExpress migrates
; any existing data from either old location automatically the first time it
; runs after an update). Most of it is deliberately left in place on
; uninstall (instances.json - references to real, separately-installed
; Palworld server folders - plus mods and backups), so a reinstall doesn't
; lose track of anything real; nothing in [Files]/[InstallDelete] touches this
; folder at all, so it survives on disk untouched unless explicitly cleared
; below. The admin account (users.json) and app-level settings
; (system_settings.json) are the exception: CurUninstallStepChanged in [Code]
; clears those specifically, so reinstalling after a real uninstall asks to
; set up a fresh admin account instead of silently reusing the old one
; (TICKET-0063).

[Code]
procedure ExitProcess(uExitCode: UINT);
  external 'ExitProcess@kernel32.dll stdcall';

var
  InstallModePage: TInputOptionWizardPage;
  SuperAdminPage: TInputQueryWizardPage;
  SetupProgressPage: TOutputProgressWizardPage;
  AdminAccountExists: Boolean;
  AppAlreadyLaunched: Boolean;

// RunFirstTimeSetup already launches the app to apply the seed file when
// there's something to provision (a fresh install). The [Run] section's own
// "Launch AutoPalExpress" step on the Finished page should only be offered
// when that DIDN'T happen (an update/reinstall where nothing needed
// seeding, so RunFirstTimeSetup was skipped entirely) - otherwise it's a
// redundant "launch now?" for an app that's already running.
function ShouldOfferLaunch(): Boolean;
begin
  Result := not AppAlreadyLaunched;
end;

// Looks in {userdocs}\AutoPalExpress\data first (TICKET-0129's current
// home), then falls back to the two older locations this app has used
// (TICKET-0123's {app}\data, and the original %LOCALAPPDATA% one) - the app
// itself only migrates legacy data on its own first run, which happens
// after this wizard has already decided which pages to show, so someone
// upgrading from any earlier version still needs to be recognized as
// already set up.
function HasAdminAccount(): Boolean;
begin
  Result := FileExists(ExpandConstant('{userdocs}\AutoPalExpress\data\users.json')) or
    FileExists(ExpandConstant('{app}\data\users.json')) or
    FileExists(ExpandConstant('{localappdata}\PalworldServerAdmin\data\users.json'));
end;

// Setup always elevates now (TICKET-0136), so this should always pass in
// practice - kept as defense-in-depth for the rare genuinely-unwritable
// custom folder (e.g. some restrictive network path) a user might Browse
// to, so that failure surfaces here with a clear message instead of as a
// bare, unhelpful "Access is denied" during the real file copy later. Only
// guards {app} itself (the program files) - app data (TICKET-0129) lives
// under Documents, never affected by this.
function CanWriteToDir(Dir: String): Boolean;
var
  TestFile: String;
begin
  ForceDirectories(Dir);
  TestFile := Dir + '\.autopalexpress_write_test.tmp';
  Result := SaveStringToFile(TestFile, 'test', False);
  if Result then
    DeleteFile(TestFile);
end;

// Whether AutoPalExpress is actually currently installed (a real Inno
// uninstall entry exists), as opposed to HasAdminAccount above, which only
// checks for a leftover admin account - most app data is deliberately kept
// after an uninstall (see the [Registry] section comment), so that would
// otherwise falsely say "installed" right after a full uninstall.
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
  // AdminAccountExists is NOT set here - HasAdminAccount's legacy-location
  // fallback checks expand {app}, which Inno has not initialized yet this
  // early (InitializeWizard runs before the Select Destination Location page
  // has even been shown, causing "attempt was made to expand app constant
  // before it was initialized"). It's set instead in NextButtonClick once
  // the user has confirmed a destination folder - see the wpSelectDir case
  // below.
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

  // No first-server deploy page here (TICKET-0132 removed it) - creating a
  // server is a long-running SteamCMD download that used to run as a
  // fire-and-forget background task on first launch, with no reliable way
  // for the wizard (or the app's own UI right after) to know it had actually
  // finished. The app itself now forces the super admin to create their
  // first server through its own, already-reliable Deploy/Import flow the
  // first time they log in and none exists yet.
  SuperAdminPage := CreateInputQueryPage(wpSelectTasks,
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
  Result := AdminAccountExists and (PageID = SuperAdminPage.ID);
end;

function NextButtonClick(CurPageID: Integer): Boolean;
begin
  Result := True;
  if CurPageID = wpSelectDir then
  begin
    if not CanWriteToDir(ExpandConstant('{app}')) then
    begin
      MsgBox('AutoPalExpress could not write to this folder even with administrator rights:' + #13#10 + #13#10 +
             ExpandConstant('{app}') + #13#10 + #13#10 +
             'Please choose a different folder instead.',
             mbError, MB_OK);
      Result := False;
      Exit;
    end;
    // {app} is only valid from this point on (the user has just confirmed a
    // destination folder) - see the comment in InitializeWizard above.
    AdminAccountExists := HasAdminAccount;
    Exit;
  end;
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
  Result := '{' + NL + Body + NL + '}' + NL;
end;

procedure SaveStartupRecoverySettings;
var
  SettingsDir: String;
  SettingsPath: String;
  NL: String;
  Body: String;
begin
  if not WizardIsTaskSelected('startuprecovery') then
    Exit;

  NL := Chr(13) + Chr(10);
  SettingsDir := ExpandConstant('{userdocs}\AutoPalExpress\data');
  SettingsPath := SettingsDir + '\system_settings.json';
  ForceDirectories(SettingsDir);
  Body := '{' + NL +
          '  "bootWithWindows": true,' + NL +
          '  "autoStartActiveServer": true' + NL +
          '}' + NL;
  SaveStringToFile(SettingsPath, Body, False);
end;

// Creates the visible Documents\AutoPalExpress\Servers folder right away
// (TICKET-0133), instead of waiting for the app to lazily create it on
// first deploy - so it's there to browse/drop things into immediately
// after install finishes. This is also the real default deploy location
// (app/paths.py's default_servers_dir()), not just a decorative folder.
procedure EnsureDataFolders;
begin
  ForceDirectories(ExpandConstant('{userdocs}\AutoPalExpress'));
  ForceDirectories(ExpandConstant('{userdocs}\AutoPalExpress\Servers'));
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
  ExePath := ExpandConstant('{app}\{#MyAppExeName}');
  LogPath := ExpandConstant('{userdocs}\AutoPalExpress\data\first_run_progress.log');

  SetupProgressPage.SetText('Starting the app to apply your answers...', '');
  SetupProgressPage.Show;
  try
    if not Exec(ExePath, '', '', SW_SHOWNORMAL, ewNoWait, ResultCode) then
    begin
      SetupProgressPage.SetText('Couldn''t start the app automatically - open it yourself to finish setup.', '');
      Sleep(2000);
      Exit;
    end;
    AppAlreadyLaunched := True;

    Done := False;
    ElapsedSeconds := 0;
    LogLines := TStringList.Create;
    try
      // Up to 15 minutes, though creating just the admin account (TICKET-0132
      // removed the first-server deploy this used to also wait through) is
      // near-instant in practice. If it somehow never finishes in time, the
      // wizard just moves on - the app's own first-visit Setup screen is a
      // manual fallback for the account too, so this is a convenience, not
      // the only way it can happen.
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
    EnsureDataFolders;
    SaveStartupRecoverySettings;
    SeedPath := ExpandConstant('{app}\first_run_seed.json');
    // Nothing left to provision once an admin account already exists -
    // first_run_setup.py safely no-ops create_first_super_admin if one is
    // somehow already there regardless, so this is just avoiding a needless
    // re-run, not the only thing keeping it safe.
    if AdminAccountExists then
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
    DataDir := ExpandConstant('{userdocs}\AutoPalExpress\data');
    DeleteFile(DataDir + '\users.json');
    DeleteFile(DataDir + '\system_settings.json');
  end;
end;
