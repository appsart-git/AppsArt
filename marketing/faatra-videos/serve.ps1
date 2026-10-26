param([int]$Port = 8796)
# Estudio de los videos FAATRA.
#   /            -> esta carpeta (capture.html, studio.html, scenes.js, assets/, out/)
#   /tt/...      -> demo-tutaller-src   (demo ReportCar / talleres)
#   /rp/...      -> demo-repuestospro-src (demo casas de repuestos)
#   POST /save/<ruta> guarda el body en ./out/<ruta> (admite subcarpetas)
$root = "C:\Users\moyola\Desktop\AppsArt"
$studio = "$root\marketing\faatra-videos"
$out = Join-Path $studio "out"
New-Item -ItemType Directory -Force $out | Out-Null
$l = New-Object System.Net.HttpListener
$l.Prefixes.Add("http://localhost:$Port/")
$l.Start()
"Serving on http://localhost:$Port/"
$mime = @{".html"="text/html; charset=utf-8";".js"="application/javascript; charset=utf-8";".json"="application/json";".png"="image/png";".jpg"="image/jpeg";".jpeg"="image/jpeg";".css"="text/css";".ttf"="font/ttf";".woff2"="font/woff2";".svg"="image/svg+xml";".mp4"="video/mp4";".webmanifest"="application/manifest+json"}
while ($true) {
  $c = $l.GetContext(); $q = $c.Request; $r = $c.Response
  try {
    $p = [Uri]::UnescapeDataString($q.Url.AbsolutePath)
    if ($q.HttpMethod -eq "POST" -and $p.StartsWith("/save/")) {
      $rel = $p.Substring(6) -replace '\.\.', ''
      $dest = Join-Path $out $rel
      New-Item -ItemType Directory -Force (Split-Path -Parent $dest) | Out-Null
      $fs = [System.IO.File]::Create($dest); $q.InputStream.CopyTo($fs); $fs.Close()
      $b = [Text.Encoding]::UTF8.GetBytes("ok"); $r.OutputStream.Write($b,0,$b.Length); continue
    }
    if ($p.StartsWith("/tt/")) { $f = Join-Path "$root\demo-tutaller-src" $p.Substring(4) }
    elseif ($p.StartsWith("/rp/")) { $f = Join-Path "$root\demo-repuestospro-src" $p.Substring(4) }
    else { if ($p -eq "/") { $p = "/studio.html" }; $f = Join-Path $studio $p.TrimStart("/") }
    if ((Test-Path $f -PathType Container)) { $f = Join-Path $f "index.html" }
    if (Test-Path $f -PathType Leaf) {
      $ext = [IO.Path]::GetExtension($f).ToLower(); $ct = $mime[$ext]; if (-not $ct) { $ct = "application/octet-stream" }
      $bytes = [IO.File]::ReadAllBytes($f)
      $r.Headers.Add("Cache-Control", "no-store")
      $r.ContentType = $ct; $r.ContentLength64 = $bytes.Length; $r.OutputStream.Write($bytes,0,$bytes.Length)
    } else { $r.StatusCode = 404 }
  } catch { $r.StatusCode = 500 } finally { $r.OutputStream.Close() }
}
