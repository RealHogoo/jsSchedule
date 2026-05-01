param(
    [string]$AdminBaseUrl = "https://adm.js65.myds.me",
    [string]$ScheduleBaseUrl = "https://sch.js65.myds.me",
    [string]$ExpectedAdminRevision = "",
    [string]$ExpectedScheduleRevision = ""
)

$ErrorActionPreference = "Stop"

function Normalize-BaseUrl([string]$Url) {
    return $Url.TrimEnd("/")
}

function Invoke-JsonPost([string]$Url) {
    $response = Invoke-RestMethod -Method Post -Uri $Url -ContentType "application/json" -Body "{}"
    return $response
}

function Assert-Ok([bool]$Condition, [string]$Message) {
    if (-not $Condition) {
        throw $Message
    }
    Write-Host "[OK] $Message"
}

function Check-Version([string]$Name, [string]$BaseUrl, [string]$ExpectedRevision) {
    $version = Invoke-JsonPost "$BaseUrl/version.json"
    Assert-Ok ($null -ne $version) "$Name version endpoint responded"
    if ($ExpectedRevision) {
        Assert-Ok (($version.data.revision -like "$ExpectedRevision*") -or ($version.revision -like "$ExpectedRevision*")) "$Name revision matches $ExpectedRevision"
    }
}

function Check-Ready([string]$Name, [string]$BaseUrl) {
    $ready = Invoke-JsonPost "$BaseUrl/health/ready.json"
    Assert-Ok ($null -ne $ready) "$Name ready endpoint responded"
}

function Check-ScheduleRedirect([string]$AdminUrl, [string]$ScheduleUrl) {
    $scheduleHost = ([Uri]$ScheduleUrl).Host
    try {
        Invoke-WebRequest -Method Get -Uri "$ScheduleUrl/wbs.html" -MaximumRedirection 0 -Headers @{
            "X-Forwarded-Proto" = "https"
            "X-Forwarded-Host" = $scheduleHost
            "X-Forwarded-Port" = "80"
        } | Out-Null
        throw "Expected schedule WBS request to redirect"
    } catch {
        $response = $_.Exception.Response
        if ($null -eq $response) {
            throw
        }
        $location = $response.Headers["Location"]
        Assert-Ok ($location -like "$AdminUrl/service-login-page.do*") "schedule unauthenticated WBS redirects to admin login"
        Assert-Ok ($location -like "*return_url=*https%3A%2F%2F$scheduleHost%2Fwbs.html*") "schedule return_url uses https public host"
        Assert-Ok ($location -notlike "*%3A80*") "schedule return_url does not include port 80"
    }
}

$adminUrl = Normalize-BaseUrl $AdminBaseUrl
$scheduleUrl = Normalize-BaseUrl $ScheduleBaseUrl

Check-Ready "admin" $adminUrl
Check-Version "admin" $adminUrl $ExpectedAdminRevision
Check-Ready "schedule" $scheduleUrl
Check-Version "schedule" $scheduleUrl $ExpectedScheduleRevision
Check-ScheduleRedirect $adminUrl $scheduleUrl

Write-Host "Deployment smoke check completed."
