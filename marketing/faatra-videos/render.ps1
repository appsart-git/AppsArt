# Render de los videos (con serve.ps1 corriendo).
#   <v> = 1 talleres, 2 repuestos; con "t" al final (1t, 2t) = formato tablet horizontal 1920x1080
#   render.ps1 still 1 12.5 30 40     -> out/still-1-<t>.png (cuadros sueltos para revisar)
#   render.ps1 qr 1t                  -> out/qr-check-1-tab.txt (decodifica el QR de la placa final)
#   render.ps1 enc 1 [bitrate]        -> out/appsart-talleres-vertical.mp4 (2: repuestos, 1t/2t: *-tablet.mp4)
#   render.ps1 verify 2t              -> out/verify-<archivo>.png/.txt (abre el MP4 y saca cuadros reales)
param([string]$Mode, [string]$V, [Parameter(ValueFromRemainingArguments = $true)][string[]]$Rest)
$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$out = "C:\Users\moyola\Desktop\AppsArt\marketing\faatra-videos\out"
function Prof { Join-Path $env:TEMP ("faatra-prof-" + [guid]::NewGuid()) }
$tab = $V.EndsWith("t"); $n = $V.TrimEnd("t")
$fq = $(if ($tab) { "&f=tab" } else { "" }); $sfx = $(if ($tab) { "-tab" } else { "" })
$win = $(if ($tab) { "960,540" } else { "540,960" })
if ($Mode -eq "still") {
  foreach ($t in $Rest) {
    $prof = Prof
    $png = Join-Path $out "still-$V-$t.png"
    $p = Start-Process -FilePath $edge -ArgumentList @("--headless=old", "--disable-gpu", "--hide-scrollbars", "--user-data-dir=$prof",
      "--window-size=$win", "--force-device-scale-factor=2", "--virtual-time-budget=15000", "--screenshot=$png",
      "http://localhost:8796/studio.html?v=$n&t=$t$fq") -PassThru -WindowStyle Hidden
    $p.WaitForExit(60000) | Out-Null; Remove-Item $prof -Recurse -Force -ErrorAction SilentlyContinue
    "still $V $t"
  }
  exit
}
# qr / enc / verify: Edge headless queda abierto (remote debugging) hasta que aparece el archivo de salida
if ($Mode -eq "qr") { $flag = Join-Path $out "qr-check-$n$sfx.txt"; $url = "http://localhost:8796/studio.html?v=$n&qr=1$fq" }
elseif ($Mode -eq "verify") {
  $f = @{"1"="appsart-talleres";"2"="appsart-repuestos"}[$n] + $(if ($tab) { "-tablet.mp4" } else { "-vertical.mp4" })
  $flag = Join-Path $out "verify-$f.txt"; $url = "http://localhost:8796/verify.html?f=$f"
}
else {
  $flag = Join-Path $out "enc-log-$n$sfx.txt"; $url = "http://localhost:8796/studio.html?v=$n&enc=1$fq"
  if ($Rest) { $url += "&br=$($Rest[0])" }
}
Remove-Item $flag -ErrorAction SilentlyContinue
$prof = Prof
$p = Start-Process -FilePath $edge -ArgumentList @("--headless=new", "--remote-debugging-port=9339", "--user-data-dir=$prof",
  "--window-size=$win", "--autoplay-policy=no-user-gesture-required", $url) -PassThru -WindowStyle Hidden
$t0 = Get-Date
while (-not (Test-Path $flag) -and ((Get-Date) - $t0).TotalSeconds -lt 900) { Start-Sleep -Milliseconds 1500 }
Start-Sleep -Milliseconds 800
Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" | Where-Object { $_.CommandLine -like "*$prof*" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Start-Sleep -Milliseconds 500
Remove-Item $prof -Recurse -Force -ErrorAction SilentlyContinue
if (Test-Path $flag) { Get-Content $flag } else { "timeout" }
"segundos: " + [int]((Get-Date) - $t0).TotalSeconds
