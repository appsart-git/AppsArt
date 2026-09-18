Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$src = $PSScriptRoot
$zipPath = Join-Path $src "cuidahoy-deploy.zip"

if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

$exclude = @("_serve.ps1", "README.md", "firebase.json", ".firebaserc", "build-zip.ps1", "cuidahoy-deploy.zip", "functions", ".github-workflow", "img/brand-guide.pdf", "img/README.md")

$zip = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Create)
try {
    Get-ChildItem -Path $src -Recurse -File | ForEach-Object {
        $relative = $_.FullName.Substring($src.Length + 1).Replace('\', '/')
        $topLevel = $relative.Split('/')[0]
        if ($exclude -contains $topLevel -or $exclude -contains $relative) { return }
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $relative) | Out-Null
    }
} finally {
    $zip.Dispose()
}

Write-Host "Listo: $zipPath"
