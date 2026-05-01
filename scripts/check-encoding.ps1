param(
    [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$ErrorActionPreference = "Stop"
$extensions = @(".md", ".html", ".js", ".java", ".sql", ".properties", ".xml")
$excludePathParts = @("\.git\", "\.gradle\", "\build\", "\target\", "\vendor\", "\dump\", "\logs\")
$patterns = @(
    '\uFFFD',
    '\u4E8C',
    '\u5BC3',
    '\u79FB',
    '\uF9DE',
    '\uCA0D',
    '\uCA4C',
    '\uC9DA',
    '\uC9D5'
)

$hits = @()
Get-ChildItem -Path $Root -Recurse -File |
    Where-Object { $extensions -contains $_.Extension.ToLowerInvariant() } |
    Where-Object {
        $path = $_.FullName
        -not ($excludePathParts | Where-Object { $path -like "*$_*" })
    } |
    ForEach-Object {
        $file = $_.FullName
        $lines = Get-Content -Encoding UTF8 -Path $file
        for ($i = 0; $i -lt $lines.Count; $i++) {
            foreach ($pattern in $patterns) {
                if ($lines[$i] -match $pattern) {
                    $hits += [pscustomobject]@{
                        File = $file
                        Line = $i + 1
                        Pattern = $pattern
                        Text = $lines[$i].Trim()
                    }
                    break
                }
            }
        }
    }

if ($hits.Count -gt 0) {
    $hits | Format-Table -AutoSize
    throw "Potential mojibake text found: $($hits.Count)"
}

Write-Host "Encoding check passed."
