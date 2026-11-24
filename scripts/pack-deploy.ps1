# Package the static (prerendered SPA) build into deploy.zip for cPanel.
#
#   powershell -ExecutionPolicy Bypass -File scripts/pack-deploy.ps1
#
# Expects `npm run build:deploy` to have produced .output/public first.
param(
  [string]$Source = ".output/public",
  [string]$Zip    = "deploy.zip"
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.IO.Compression.FileSystem

$root = (Get-Location).Path

# Windows (antivirus / indexer / preview panes) intermittently locks freshly
# written images, so the staging folder is created fresh for every run instead
# of being emptied in place.
$stage = Join-Path $root ("deploy-stage-" + (Get-Date -Format "yyyyMMddHHmmss"))

function Remove-Path([string]$Path) {
  for ($i = 1; $i -le 10; $i++) {
    try {
      if ([System.IO.Directory]::Exists($Path)) {
        [System.IO.Directory]::Delete($Path, $true)
      } elseif ([System.IO.File]::Exists($Path)) {
        [System.IO.File]::SetAttributes($Path, [System.IO.FileAttributes]::Normal)
        [System.IO.File]::Delete($Path)
      }
      return $true
    } catch {
      if ($i -eq 10) { return $false }
      Start-Sleep -Milliseconds 300
    }
  }
  return $false
}

if (-not (Test-Path $Source)) {
  throw "Build output not found at '$Source'. Run: npm run build:deploy"
}
if (-not (Test-Path (Join-Path $Source "index.html"))) {
  throw "'$Source/index.html' is missing - the build was not prerendered."
}

# Best-effort cleanup of previous runs (safe to fail; they are gitignored).
Get-ChildItem -Path $root -Directory -Filter "deploy-stage-*" -ErrorAction SilentlyContinue |
  ForEach-Object { Remove-Path $_.FullName | Out-Null }

New-Item -ItemType Directory -Path $stage | Out-Null
Copy-Item -Path (Join-Path $Source "*") -Destination $stage -Recurse -Force

# Never ship the retired static landing page.
Remove-Path (Join-Path $stage "legacy-index.html") | Out-Null

# cPanel/Apache SPA fallback: serve real files, otherwise hand every path to
# index.html so the client router resolves /v/<code>, /batches, etc.
$htaccess = @"
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.html [L]

<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType application/javascript "access plus 1 year"
  ExpiresByType image/png "access plus 1 month"
  ExpiresByType image/jpeg "access plus 1 month"
  ExpiresByType image/svg+xml "access plus 1 month"
</IfModule>
<IfModule mod_headers.c>
  <FilesMatch "\.(js|css)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
  <FilesMatch "\.html$">
    Header set Cache-Control "no-cache"
  </FilesMatch>
</IfModule>
"@
Set-Content -Path (Join-Path $stage ".htaccess") -Value $htaccess -Encoding ascii

# Build to a temp file, then swap it in.
$tmpZip = Join-Path $root "$Zip.new"
Remove-Path $tmpZip | Out-Null
[System.IO.Compression.ZipFile]::CreateFromDirectory(
  $stage,
  $tmpZip,
  [System.IO.Compression.CompressionLevel]::Optimal,
  $false
)

# Some Windows setups deny in-place overwrites of an existing archive, so the
# old zip is renamed away first and the new one moved into its place.
$target = Join-Path $root $Zip
if ([System.IO.File]::Exists($target)) {
  $backup = Join-Path $root "$Zip.old"
  Remove-Path $backup | Out-Null
  Move-Item -LiteralPath $target -Destination $backup -Force
}
Move-Item -LiteralPath $tmpZip -Destination $target -Force
Remove-Path (Join-Path $root "$Zip.old") | Out-Null

$zipInfo = Get-Item $target
$archive = [System.IO.Compression.ZipFile]::OpenRead($zipInfo.FullName)
$count = $archive.Entries.Count
$archive.Dispose()
Write-Output ("Packaged {0} files -> {1} ({2:N0} KB)" -f $count, $Zip, ($zipInfo.Length / 1KB))

Remove-Path $stage | Out-Null
