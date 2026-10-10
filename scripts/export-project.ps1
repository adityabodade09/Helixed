# Clean source export. Does not read or copy runtime .env files or local data.
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$exportRoot = Join-Path $projectRoot 'exports'
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$staging = Join-Path $exportRoot "helixed-$stamp"
New-Item -ItemType Directory -Path $staging | Out-Null
$excluded = @('node_modules', 'dist', '.seed-dist', 'coverage', '.vite', '.git', 'test-results', 'playwright-report', 'exports', '.agents', '.codex')
function Copy-SourceTree([string]$Source, [string]$Destination) {
  New-Item -ItemType Directory -Path $Destination -Force | Out-Null
  foreach ($item in Get-ChildItem -LiteralPath $Source -Force) {
    if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { continue }
    if ($item.PSIsContainer) {
      if ($item.Name -notin $excluded) { Copy-SourceTree $item.FullName (Join-Path $Destination $item.Name) }
    } else {
      if ($item.Name -like '.env*' -and $item.Name -notin @('.env.example', '.env.production.example')) { continue }
      if ($item.Extension -in @('.log', '.zip', '.tsbuildinfo', '.pem', '.key', '.pfx', '.sqlite', '.db')) { continue }
      Copy-Item -LiteralPath $item.FullName -Destination (Join-Path $Destination $item.Name)
    }
  }
}
foreach ($directory in @('frontend', 'backend', 'docs', 'scripts')) {
  Copy-SourceTree (Join-Path $projectRoot $directory) (Join-Path $staging $directory)
}
# Login imports this approved reference directly; it is a required build asset.
New-Item -ItemType Directory -Path (Join-Path $staging 'design') | Out-Null
Copy-Item -LiteralPath (Join-Path $projectRoot 'design/ChatGPT Image Sep 30, 2026, 01_59_22 PM.png') -Destination (Join-Path $staging 'design')
foreach ($file in @('package.json', 'package-lock.json', 'eslint.config.js', '.prettierrc.json', '.prettierignore', '.gitignore', '.node-version', 'vercel.json', 'README.md')) {
  Copy-Item -LiteralPath (Join-Path $projectRoot $file) -Destination $staging
}
$archive = "$staging.zip"
Compress-Archive -Path (Join-Path $staging '*'), (Join-Path $staging '.gitignore'), (Join-Path $staging '.prettierrc.json'), (Join-Path $staging '.prettierignore'), (Join-Path $staging '.node-version') -DestinationPath $archive
Write-Output $archive
