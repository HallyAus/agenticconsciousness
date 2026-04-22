# Rebuild RBAC for Applications scope + role assignments for the
# Agentic Consciousness app against the daniel@agenticconsciousness.com.au
# shared mailbox. Uses GUID-based scope filter for unambiguous match.
#
# Run from PowerShell. MFA popup will appear once for Connect-ExchangeOnline.

$ErrorActionPreference = "Stop"
$AppId = "83141279-32dc-40c4-91d6-2a296db61c98"
$SenderMailbox = "daniel@agenticconsciousness.com.au"
$AdminUpn = "daniel@printforge.com.au"
$SpObjectId = "19545b03-018d-4b22-ae65-7c9d90cd10c2"
$DisplayName = "Agentic Consciousness"
$NewScopeName = "AgenticMailboxByGuid"

Write-Host ""
Write-Host "=== Rebuild RBAC for Applications ===" -ForegroundColor Cyan
Write-Host ""

if (-not (Get-Module -ListAvailable -Name ExchangeOnlineManagement)) {
    Write-Host "Installing ExchangeOnlineManagement module..." -ForegroundColor Yellow
    Install-Module -Name ExchangeOnlineManagement -Scope CurrentUser -Force -AllowClobber
}

Write-Host "Connecting to Exchange Online via device code..." -ForegroundColor Cyan
Write-Host "You'll see a URL + code below. Open the URL, enter the code, sign in as $AdminUpn." -ForegroundColor Yellow
Connect-ExchangeOnline -UserPrincipalName $AdminUpn -UseDeviceAuthentication -ShowBanner:$false

Write-Host "Resolving target mailbox..." -ForegroundColor Cyan
$mbx = Get-Mailbox -Identity $SenderMailbox
if (-not $mbx) { throw "Mailbox $SenderMailbox not found" }
$mbxGuid = $mbx.GUID.ToString()
Write-Host ("  Found: {0} (GUID: {1})" -f $mbx.DisplayName, $mbxGuid) -ForegroundColor Green

$smtpMatch = Get-EXOMailbox -Filter "PrimarySmtpAddress -eq '$SenderMailbox'" -ErrorAction SilentlyContinue
if ($smtpMatch) {
    Write-Host "  SMTP filter DOES match (old scope syntax was fine)" -ForegroundColor Green
} else {
    Write-Host "  SMTP filter returns nothing (old scope was broken)" -ForegroundColor Yellow
}

Write-Host "Removing old role assignments..." -ForegroundColor Cyan
Get-ManagementRoleAssignment -RoleAssignee $AppId -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host ("  Removing: {0}" -f $_.Name)
    Remove-ManagementRoleAssignment -Identity $_.Name -Confirm:$false -ErrorAction SilentlyContinue
}

$oldScope = Get-ManagementScope -Identity "AgenticConsciousnessMailboxScope" -ErrorAction SilentlyContinue
if ($oldScope) {
    Write-Host "Removing old scope AgenticConsciousnessMailboxScope..." -ForegroundColor Cyan
    Remove-ManagementScope -Identity "AgenticConsciousnessMailboxScope" -Confirm:$false
}

$existingNew = Get-ManagementScope -Identity $NewScopeName -ErrorAction SilentlyContinue
if ($existingNew) {
    Write-Host "Removing existing $NewScopeName for clean re-create..." -ForegroundColor Cyan
    Remove-ManagementScope -Identity $NewScopeName -Confirm:$false
}

$sp = Get-ServicePrincipal -Identity $DisplayName -ErrorAction SilentlyContinue
if (-not $sp) {
    Write-Host "Creating Exchange service principal..." -ForegroundColor Cyan
    New-ServicePrincipal -AppId $AppId -ObjectId $SpObjectId -DisplayName $DisplayName | Out-Null
} else {
    Write-Host "Service principal already exists: $($sp.DisplayName)" -ForegroundColor Green
}

$scopeFilter = "GUID -eq '$mbxGuid'"
Write-Host "Creating new management scope $NewScopeName with filter: $scopeFilter" -ForegroundColor Cyan
New-ManagementScope -Name $NewScopeName -RecipientRestrictionFilter $scopeFilter | Out-Null

Write-Host "Assigning Application Mail.ReadWrite..." -ForegroundColor Cyan
New-ManagementRoleAssignment -App $AppId -Role "Application Mail.ReadWrite" -CustomResourceScope $NewScopeName | Out-Null

Write-Host "Assigning Application Mail.Send..." -ForegroundColor Cyan
New-ManagementRoleAssignment -App $AppId -Role "Application Mail.Send" -CustomResourceScope $NewScopeName | Out-Null

Write-Host ""
Write-Host "=== Verification ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Role assignments:" -ForegroundColor Yellow
Get-ManagementRoleAssignment -RoleAssignee $AppId | Format-Table Name, Role, CustomResourceScope -AutoSize

Write-Host "Test-ServicePrincipalAuthorization (bypasses cache):" -ForegroundColor Yellow
Test-ServicePrincipalAuthorization -Identity $DisplayName -Resource $SenderMailbox | Format-List RoleName, GrantedPermissions, AllowedResourceScope, InScope, IsValid

Write-Host ""
Write-Host "Done. Wait ~30 minutes without calling the Graph endpoint, then hit graph-diag." -ForegroundColor Green
Write-Host ""

Disconnect-ExchangeOnline -Confirm:$false
