$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$outputDir = Join-Path $root "permanent-output"
$stagingDir = Join-Path $outputDir "site"
$archivePath = Join-Path $outputDir "father-memorial-site.zip"

$publicFiles = @(
    ".nojekyll",
    "CNAME",
    "README.md",
    "admin.css",
    "admin.html",
    "admin.js",
    "album-data.js",
    "index.html",
    "script.js",
    "site-data.js",
    "style.css"
)

if (Test-Path -LiteralPath $stagingDir) {
    Remove-Item -LiteralPath $stagingDir -Recurse -Force
}

New-Item -ItemType Directory -Path $stagingDir | Out-Null
New-Item -ItemType Directory -Path (Join-Path $stagingDir "images") | Out-Null

foreach ($file in $publicFiles) {
    $source = Join-Path $root $file
    if (Test-Path -LiteralPath $source) {
        Copy-Item -LiteralPath $source -Destination (Join-Path $stagingDir $file) -Force
    }
}

Copy-Item -LiteralPath (Join-Path $root "images\*") -Destination (Join-Path $stagingDir "images") -Recurse -Force

if (Test-Path -LiteralPath $archivePath) {
    Remove-Item -LiteralPath $archivePath -Force
}

Compress-Archive -Path (Join-Path $stagingDir "*") -DestinationPath $archivePath -Force

$hash = Get-FileHash -Algorithm SHA256 -LiteralPath $archivePath
$manifest = [ordered]@{
    generatedAt = (Get-Date).ToUniversalTime().ToString("o")
    archive = "father-memorial-site.zip"
    sha256 = $hash.Hash.ToLowerInvariant()
    source = "https://github.com/zjg1128/father-memorial"
    liveUrl = "https://zjg1128.github.io/father-memorial/"
    customDomain = "www.mingfu.ccwu.cc"
}

$manifest | ConvertTo-Json -Depth 4 | Set-Content -Encoding UTF8 -LiteralPath (Join-Path $outputDir "manifest.json")

Write-Output "Archive created: $archivePath"
Write-Output "SHA256: $($hash.Hash.ToLowerInvariant())"
