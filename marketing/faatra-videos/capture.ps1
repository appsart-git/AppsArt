# Graba las capturas de una o más escenas: una corrida de Edge headless por paso.
# Uso (con serve.ps1 corriendo):  capture.ps1 v1s2 v1s3 ...
# Deja out/shots/<escena>-<paso>.png + .json (rectángulo del toque y texto de la pantalla).
param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Scenes)
$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$shots = "C:\Users\moyola\Desktop\AppsArt\marketing\faatra-videos\out\shots"
New-Item -ItemType Directory -Force $shots | Out-Null
$dsf = 3
foreach ($s in $Scenes) {
  $step = 0
  while ($step -lt 40) {
    $json = Join-Path $shots "$s-$step.json"
    Remove-Item $json -ErrorAction SilentlyContinue
    $prof = Join-Path $env:TEMP ("faatra-prof-" + [guid]::NewGuid())
    # ventana más ancha que el iframe: headless no baja de ~500px; el montaje recorta al viewport
    $url = "http://localhost:8796/capture.html?scene=$s&step=$step"
    $png = Join-Path $shots "$s-$step.png"
    $p = Start-Process -FilePath $edge -ArgumentList @("--headless=old", "--disable-gpu", "--hide-scrollbars", "--no-first-run",
      "--user-data-dir=$prof", "--window-size=900,1400", "--force-device-scale-factor=$dsf",
      "--virtual-time-budget=20000", "--screenshot=$png", $url) -PassThru -WindowStyle Hidden
    $p.WaitForExit(90000) | Out-Null
    Remove-Item $prof -Recurse -Force -ErrorAction SilentlyContinue
    if (-not (Test-Path $json)) { "$s-$step : sin json"; break }
    $m = Get-Content -Raw $json | ConvertFrom-Json
    if ($m.error) { "$s-$step : ERROR $($m.error)" } else { "$s-$step ok" }
    if ($m.last) { break }
    $step++
  }
}
