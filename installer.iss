#define MyAppName "Palworld Server Admin"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Palworld Server Admin"
#define MyAppExeName "PalworldServerAdmin.exe"

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

[Files]
Source: "dist\PalworldServerAdmin.exe"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\Uninstall {#MyAppName}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Launch {#MyAppName}"; Flags: nowait postinstall skipifsilent

; App data (server configs, mod lists, downloaded archives) lives in
; %LOCALAPPDATA%\PalworldServerAdmin and is deliberately left in place on
; uninstall, since it may reference real, separately-installed Palworld
; server folders and downloaded mods the user wants to keep.

[Code]
var
  ServerNamePage: TInputQueryWizardPage;
  SuperAdminPage: TInputQueryWizardPage;
  NexusPage: TInputQueryWizardPage;
  SetupProgressPage: TOutputProgressWizardPage;

procedure InitializeWizard;
begin
  ServerNamePage := CreateInputQueryPage(wpSelectTasks,
    'New Server', 'Deploy a Palworld Dedicated Server now',
    'Give your first server a name and it will be downloaded via SteamCMD into this tool''s own "servers" ' +
    'folder as soon as setup finishes. Leave this blank to skip - you can deploy one later from the app instead.');
  ServerNamePage.Add('Server name (optional):', False);

  SuperAdminPage := CreateInputQueryPage(ServerNamePage.ID,
    'Super Admin Account', 'Create the account that fully controls this tool',
    'This machine gets exactly one super admin - that''s you. Friends you invite later register as regular ' +
    'admins with day-to-day access (start/stop, mods, players), not this level of control.');
  SuperAdminPage.Add('Username:', False);
  SuperAdminPage.Add('Password (at least 8 characters):', True);
  SuperAdminPage.Add('Confirm password:', True);

  NexusPage := CreateInputQueryPage(SuperAdminPage.ID,
    'Nexus Mods (Optional)', 'Connect your Nexus Mods account',
    'Enables browsing and installing mods from Nexus Mods directly in the app. A free Nexus account can ' +
    'browse mods and install ones you upload yourself; Nexus Premium additionally allows one-click automatic ' +
    'downloads. Get a personal API key at nexusmods.com -> Settings -> API Keys. Leave blank to skip - you can ' +
    'connect this later from Super Admin.');
  NexusPage.Add('Nexus API key (optional):', False);

  SetupProgressPage := CreateOutputProgressPage('Finishing Setup',
    'Applying what you entered - this window updates automatically.');
end;

function NextButtonClick(CurPageID: Integer): Boolean;
begin
  Result := True;
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
  if Trim(NexusPage.Values[0]) <> '' then
    Body := Body + ',' + NL + '  "nexusApiKey": "' + JsonEscape(NexusPage.Values[0]) + '"';
  if Trim(ServerNamePage.Values[0]) <> '' then
    Body := Body + ',' + NL + '  "serverName": "' + JsonEscape(ServerNamePage.Values[0]) + '"';
  Result := '{' + NL + Body + NL + '}' + NL;
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
      // every step here (account, Nexus, deploy) has a manual fallback
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
  if (CurStep = ssPostInstall) and (not WizardSilent()) then
  begin
    SeedPath := ExpandConstant('{app}\first_run_seed.json');
    SaveStringToFile(SeedPath, BuildSeedJson(), False);
    RunFirstTimeSetup;
  end;
end;
