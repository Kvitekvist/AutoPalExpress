param(
    [string]$DataDir = (Join-Path $env:LOCALAPPDATA "PalworldServerAdmin\data"),
    [string]$ReportDir = (Join-Path $env:LOCALAPPDATA "PalworldServerAdmin\diagnostics"),
    [switch]$NoPause
)

$ErrorActionPreference = "Continue"

function New-SafeDirectory {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
    }
}

New-SafeDirectory -Path $ReportDir
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$script:ReportPath = Join-Path $ReportDir "AutoPalExpress-Diagnostics-$stamp.txt"
$script:FailCount = 0
$script:WarnCount = 0
$script:PassCount = 0
$script:FirewallInspectionFailed = $false

function Write-Report {
    param([string]$Line = "")
    $Line | Tee-Object -FilePath $script:ReportPath -Append | ForEach-Object { Write-Host $_ }
}

function Write-Check {
    param(
        [ValidateSet("PASS", "WARN", "FAIL", "INFO")]
        [string]$Level,
        [string]$Title,
        [string]$Detail = ""
    )
    if ($Level -eq "FAIL") { $script:FailCount++ }
    if ($Level -eq "WARN") { $script:WarnCount++ }
    if ($Level -eq "PASS") { $script:PassCount++ }
    $message = "[$Level] $Title"
    if ($Detail) { $message = "$message - $Detail" }
    Write-Report $message
}

function Get-JsonFile {
    param([string]$Path)
    try {
        if (-not (Test-Path -LiteralPath $Path)) { return $null }
        return Get-Content -LiteralPath $Path -Raw -Encoding UTF8 | ConvertFrom-Json
    }
    catch {
        Write-Check "FAIL" "Could not read JSON file" "$Path ($($_.Exception.Message))"
        return $null
    }
}

function Get-Prop {
    param($Object, [string]$Name, $Default = $null)
    if ($null -eq $Object) { return $Default }
    $prop = $Object.PSObject.Properties[$Name]
    if ($null -eq $prop) { return $Default }
    return $prop.Value
}

function Get-OptionSettingsBody {
    param([string]$Text)
    $match = [regex]::Match($Text, "(?m)^OptionSettings=\((.*)\)\s*$")
    if ($match.Success) { return $match.Groups[1].Value }
    return $null
}

function Get-OptionValue {
    param([string]$Body, [string]$Key)
    if (-not $Body) { return $null }
    $escaped = [regex]::Escape($Key)
    $match = [regex]::Match($Body, "(?:^|(?<=[,(]))$escaped=(""[^""]*""|[^,()]*)")
    if (-not $match.Success) { return $null }
    $value = $match.Groups[1].Value
    if ($value.Length -ge 2 -and $value.StartsWith('"') -and $value.EndsWith('"')) {
        return $value.Substring(1, $value.Length - 2)
    }
    return $value
}

function Get-IntValue {
    param($Value, [int]$Default)
    try {
        if ($null -eq $Value -or "$Value" -eq "") { return $Default }
        return [int]$Value
    }
    catch {
        return $Default
    }
}

function Test-PortPattern {
    param($Pattern, [int]$Port)
    if ($null -eq $Pattern) { return $false }
    foreach ($part in ("$Pattern" -split ",")) {
        $item = $part.Trim()
        if ($item -eq "Any") { return $true }
        if ($item -eq "$Port") { return $true }
        if ($item -match "^(\d+)-(\d+)$") {
            if ($Port -ge [int]$Matches[1] -and $Port -le [int]$Matches[2]) { return $true }
        }
    }
    return $false
}

function Find-InboundFirewallAllowRule {
    param([int]$Port, [string]$Protocol)
    try {
        $rules = Get-NetFirewallRule -Enabled True -Direction Inbound -Action Allow -ErrorAction Stop
        foreach ($rule in $rules) {
            $filters = @($rule | Get-NetFirewallPortFilter -ErrorAction SilentlyContinue)
            foreach ($filter in $filters) {
                $protocolMatches = "$($filter.Protocol)" -eq $Protocol -or "$($filter.Protocol)" -eq "Any"
                if ($protocolMatches -and (Test-PortPattern $filter.LocalPort $Port)) {
                    return $rule.DisplayName
                }
            }
        }
    }
    catch {
        $script:FirewallInspectionFailed = $true
        Write-Check "WARN" "Could not inspect Windows Firewall rules" $_.Exception.Message
    }
    return $null
}

function Get-LocalIPv4 {
    try {
        $defaultRoute = Get-NetRoute -DestinationPrefix "0.0.0.0/0" -ErrorAction Stop |
            Sort-Object RouteMetric, InterfaceMetric |
            Select-Object -First 1
        if ($defaultRoute) {
            $routeIp = Get-NetIPAddress -AddressFamily IPv4 -InterfaceIndex $defaultRoute.InterfaceIndex -ErrorAction Stop |
                Where-Object { $_.IPAddress -ne "127.0.0.1" -and $_.IPAddress -notlike "169.254.*" } |
                Select-Object -First 1 -ExpandProperty IPAddress
            if ($routeIp) { return $routeIp }
        }
    }
    catch {
    }
    try {
        $ip = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop |
            Where-Object { $_.IPAddress -ne "127.0.0.1" -and $_.IPAddress -notlike "169.254.*" } |
            Sort-Object InterfaceMetric |
            Select-Object -First 1 -ExpandProperty IPAddress
        if ($ip) { return $ip }
    }
    catch {
    }
    try {
        return [System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName()) |
            Where-Object { $_.AddressFamily -eq "InterNetwork" -and $_.IPAddressToString -ne "127.0.0.1" } |
            Select-Object -First 1 -ExpandProperty IPAddressToString
    }
    catch {
        return $null
    }
}

function Test-PalworldRest {
    param([int]$Port, [string]$Password)
    if (-not $Password) {
        Write-Check "FAIL" "Palworld REST API password is empty" "Set Admin Password or restart through AutoPalExpress so it can create one."
        return
    }
    try {
        $basic = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("admin:$Password"))
        $headers = @{ Authorization = "Basic $basic" }
        $response = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$Port/v1/api/info" -Headers $headers -TimeoutSec 4 -ErrorAction Stop
        Write-Check "PASS" "Palworld REST API authenticated locally" "HTTP $($response.StatusCode) on 127.0.0.1:$Port"
    }
    catch {
        $status = $null
        if ($_.Exception.Response) {
            try { $status = [int]$_.Exception.Response.StatusCode } catch { $status = $null }
        }
        if ($status -eq 401) {
            Write-Check "FAIL" "Palworld REST API rejected the Admin Password" "World Settings Admin Password does not match the running server."
        }
        else {
            Write-Check "FAIL" "Palworld REST API could not be reached locally" "127.0.0.1:$Port ($($_.Exception.Message))"
        }
    }
}

Write-Report "AutoPalExpress Diagnostics"
Write-Report "Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Report "Report: $script:ReportPath"
Write-Report ""

$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
Write-Report "Machine: $env:COMPUTERNAME"
Write-Report "Windows user: $env:USERNAME"
Write-Report "Running as admin: $isAdmin"
Write-Report "Data folder: $DataDir"
Write-Report ""
if (-not $isAdmin) {
    Write-Check "WARN" "Diagnostics is not running as administrator" "Firewall inspection may be incomplete. Right-click this shortcut (or PowerShell) and choose 'Run as administrator' for a full check, or use the Run Diagnostics button in Super Admin."
}

$localIp = Get-LocalIPv4
if ($localIp) {
    Write-Check "INFO" "Local LAN IP" $localIp
}
else {
    Write-Check "WARN" "Could not detect local LAN IP" "Router forwarding instructions may need manual lookup."
}

try {
    $publicIp = (Invoke-RestMethod -Uri "https://api.ipify.org" -TimeoutSec 5 -ErrorAction Stop).ToString()
    Write-Check "INFO" "Detected public IP" $publicIp
}
catch {
    Write-Check "WARN" "Could not detect public IP" "Internet or DNS lookup failed: $($_.Exception.Message)"
}

Write-Report ""
Write-Report "Instance checks"
Write-Report "---------------"

$instancesPath = Join-Path $DataDir "instances.json"
$registry = Get-JsonFile -Path $instancesPath
if ($null -eq $registry) {
    Write-Check "FAIL" "AutoPalExpress instance registry is missing or unreadable" $instancesPath
    Write-Report ""
    Write-Check "FAIL" "Support verdict" "AutoPalExpress has no readable server setup. Create or import a server first."
    Write-Report ""
    Write-Report "Saved report: $script:ReportPath"
    if (-not $NoPause) { Read-Host "Press Enter to close" | Out-Null }
    exit 1
}

$instances = @(Get-Prop $registry "instances" @())
$activeId = Get-Prop $registry "activeId" $null
$active = $instances | Where-Object { (Get-Prop $_ "id" "") -eq $activeId } | Select-Object -First 1
if ($null -eq $active -and $instances.Count -gt 0) {
    $active = $instances[0]
    Write-Check "WARN" "Active server id did not match an instance" "Using first registered server for diagnostics."
}
if ($null -eq $active) {
    Write-Check "FAIL" "No server instances are registered" "Create or import a server in AutoPalExpress."
    Write-Report ""
    Write-Check "FAIL" "Support verdict" "AutoPalExpress has no server to diagnose."
    Write-Report ""
    Write-Report "Saved report: $script:ReportPath"
    if (-not $NoPause) { Read-Host "Press Enter to close" | Out-Null }
    exit 1
}

$serverName = Get-Prop $active "name" "Unknown"
$serverPath = Get-Prop $active "serverPath" ""
$storedGamePort = Get-IntValue (Get-Prop $active "gamePort" 8211) 8211
$storedRestPort = Get-IntValue (Get-Prop $active "rconPort" 8212) 8212
Write-Report "Active server: $serverName"
Write-Report "Server folder: $serverPath"
Write-Report "Stored game port: $storedGamePort"
Write-Report "Stored REST/API port: $storedRestPort"

if (-not (Test-Path -LiteralPath $serverPath)) {
    Write-Check "FAIL" "Server folder does not exist" $serverPath
}
else {
    Write-Check "PASS" "Server folder exists" $serverPath
}

$palServerExe = Join-Path $serverPath "PalServer.exe"
if (Test-Path -LiteralPath $palServerExe) {
    Write-Check "PASS" "PalServer.exe exists" $palServerExe
}
else {
    Write-Check "FAIL" "PalServer.exe is missing" "The selected folder may not be a Palworld Dedicated Server install."
}

$iniPath = Join-Path $serverPath "Pal\Saved\Config\WindowsServer\PalWorldSettings.ini"
$iniGamePort = $null
$iniRestPort = $null
$restEnabled = $null
$adminPassword = $null
if (Test-Path -LiteralPath $iniPath) {
    Write-Check "PASS" "PalWorldSettings.ini exists" $iniPath
    try {
        $iniText = Get-Content -LiteralPath $iniPath -Raw -Encoding UTF8
        $body = Get-OptionSettingsBody $iniText
        if ($body) {
            $iniGamePort = Get-IntValue (Get-OptionValue $body "PublicPort") $storedGamePort
            $iniRestPort = Get-IntValue (Get-OptionValue $body "RESTAPIPort") $storedRestPort
            $restEnabled = (Get-OptionValue $body "RESTAPIEnabled") -eq "True"
            $adminPassword = Get-OptionValue $body "AdminPassword"
            $iniServerName = Get-OptionValue $body "ServerName"
            if ($iniServerName) { Write-Report "Configured Palworld server name: $iniServerName" }
            Write-Report "Configured game port: $iniGamePort"
            Write-Report "Configured REST/API port: $iniRestPort"
            Write-Report "REST API enabled in ini: $restEnabled"
        }
        else {
            Write-Check "WARN" "PalWorldSettings.ini has no OptionSettings line" "Using stored AutoPalExpress ports."
        }
    }
    catch {
        Write-Check "WARN" "Could not parse PalWorldSettings.ini" $_.Exception.Message
    }
}
else {
    Write-Check "WARN" "PalWorldSettings.ini is missing" "Server may not have been started yet; using stored AutoPalExpress ports."
}

$gamePort = if ($iniGamePort) { [int]$iniGamePort } else { $storedGamePort }
$restPort = if ($iniRestPort) { [int]$iniRestPort } else { $storedRestPort }
Write-Report "Effective game port checked: $gamePort"
Write-Report "Effective REST/API port checked: $restPort"

if ($iniGamePort -and $storedGamePort -ne 8211 -and $iniGamePort -ne $storedGamePort) {
    Write-Check "WARN" "Stored game port and ini game port differ" "Stored=$storedGamePort, ini=$iniGamePort. Restart through AutoPalExpress should enforce the stored Super Admin port."
}

Write-Report ""
Write-Report "Runtime checks"
Write-Report "--------------"

$serverProcesses = @()
try {
    $allProcesses = @(Get-CimInstance Win32_Process -ErrorAction Stop | Where-Object {
        $_.Name -in @("PalServer.exe", "PalServer-Win64-Shipping-Cmd.exe")
    })
    $normalizedServerPath = ""
    try { $normalizedServerPath = (Resolve-Path -LiteralPath $serverPath -ErrorAction Stop).Path.ToLowerInvariant() } catch { $normalizedServerPath = "$serverPath".ToLowerInvariant() }
    $serverProcesses = @($allProcesses | Where-Object {
        $cmd = "$($_.CommandLine)".ToLowerInvariant()
        $cmd.Contains($normalizedServerPath.ToLowerInvariant())
    })
    if ($serverProcesses.Count -eq 0 -and $allProcesses.Count -gt 0) {
        Write-Check "WARN" "Palworld process is running but not from the active server folder" "Found $($allProcesses.Count) Palworld process(es) on this PC."
    }
    elseif ($serverProcesses.Count -gt 0) {
        Write-Check "PASS" "Palworld process is running for the active server" "$($serverProcesses.Count) matching process(es)."
        foreach ($proc in $serverProcesses) {
            Write-Report "Process $($proc.ProcessId) $($proc.Name): $($proc.CommandLine)"
        }
    }
    else {
        Write-Check "FAIL" "Palworld server process is not running" "Start the server in AutoPalExpress, then run diagnostics again."
    }
}
catch {
    Write-Check "WARN" "Could not inspect running Palworld processes" $_.Exception.Message
}

$udpEndpoints = @()
try { $udpEndpoints = @(Get-NetUDPEndpoint -LocalPort $gamePort -ErrorAction SilentlyContinue) } catch { $udpEndpoints = @() }
if ($udpEndpoints.Count -gt 0) {
    Write-Check "PASS" "Game UDP port is listening locally" "UDP $gamePort"
}
else {
    Write-Check "FAIL" "Game UDP port is not listening locally" "Palworld is not bound to UDP $gamePort, or it started on a different port."
}

$tcpRest = @()
try { $tcpRest = @(Get-NetTCPConnection -LocalPort $restPort -State Listen -ErrorAction SilentlyContinue) } catch { $tcpRest = @() }
if ($restEnabled -eq $true) {
    if ($tcpRest.Count -gt 0) {
        Write-Check "PASS" "Palworld REST/API TCP port is listening locally" "TCP $restPort"
        Test-PalworldRest -Port $restPort -Password $adminPassword
    }
    else {
        Write-Check "FAIL" "Palworld REST/API port is not listening locally" "REST is enabled in ini, but TCP $restPort is closed."
    }
}
elseif ($restEnabled -eq $false) {
    Write-Check "WARN" "Palworld REST API is disabled in the ini" "Dashboard roster, metrics, saves, and player actions require RESTAPIEnabled=True."
}
else {
    Write-Check "WARN" "Palworld REST API status is unknown" "Could not confirm RESTAPIEnabled from PalWorldSettings.ini."
}

Write-Report ""
Write-Report "Firewall checks"
Write-Report "---------------"

$script:FirewallInspectionFailed = $false
$gameFirewallRule = Find-InboundFirewallAllowRule -Port $gamePort -Protocol "UDP"
if ($script:FirewallInspectionFailed) {
    Write-Check "WARN" "Could not confirm game firewall rule" "Run the diagnostics command as administrator to verify UDP $gamePort."
}
elseif ($gameFirewallRule) {
    Write-Check "PASS" "Windows Firewall allows the game UDP port" "$gameFirewallRule (UDP $gamePort)"
}
else {
    Write-Check "FAIL" "Windows Firewall has no inbound allow rule for the game UDP port" "Allow UDP $gamePort or use Super Admin firewall tools."
}

$script:FirewallInspectionFailed = $false
$adminPanelFirewallRule = Find-InboundFirewallAllowRule -Port 8000 -Protocol "TCP"
if ($script:FirewallInspectionFailed) {
    Write-Check "WARN" "Could not confirm AutoPalExpress panel firewall rule" "Only needed if friends connect to this admin panel from another machine."
}
elseif ($adminPanelFirewallRule) {
    Write-Check "PASS" "Windows Firewall allows AutoPalExpress remote panel port" "$adminPanelFirewallRule (TCP 8000)"
}
else {
    Write-Check "WARN" "Windows Firewall has no inbound allow rule for AutoPalExpress remote panel" "Only needed if friends connect to this admin panel from another machine."
}

Write-Report ""
Write-Report "Support verdict"
Write-Report "---------------"

if ($script:FailCount -gt 0) {
    Write-Check "FAIL" "Support verdict" "Fix the FAIL item(s) above first. This is a local machine/app/server configuration problem, not just a router guess."
}
elseif ($script:WarnCount -gt 0) {
    Write-Check "WARN" "Support verdict" "No hard local blocker was found, but WARN items should be reviewed. If friends still cannot connect, check router forwarding and ISP NAT next."
}
else {
    Write-Check "PASS" "Support verdict" "Local checks passed. If direct connect still fails from outside your home network, the remaining cause is router forwarding, ISP CGNAT/double NAT, wrong public IP, or an upstream firewall. Forward UDP $gamePort to $localIp."
}

Write-Report ""
Write-Report "Summary: $script:PassCount passed, $script:WarnCount warnings, $script:FailCount failures"
Write-Report "Saved report: $script:ReportPath"
Write-Report ""
Write-Report "Share this report with support if you still need help."

if (-not $NoPause) {
    Read-Host "Press Enter to close" | Out-Null
}
