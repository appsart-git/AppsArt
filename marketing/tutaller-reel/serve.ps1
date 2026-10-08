param([int]$Port = 8795)
# Sirve demo-tutaller-src en / y la carpeta del estudio de video en /studio/.
# ?cap=<seccion>&scroll=<px>&nonav=1 inyecta un script para posicionar la app (capturas headless).
# POST /save/<nombre> guarda el body en ./out/<nombre>.
$app = "C:\Users\moyola\Desktop\AppsArt\demo-tutaller-src"
$studio = Split-Path -Parent $MyInvocation.MyCommand.Path
$out = Join-Path $studio "out"
New-Item -ItemType Directory -Force $out | Out-Null
$l = New-Object System.Net.HttpListener
$l.Prefixes.Add("http://localhost:$Port/")
$l.Start()
"Serving on http://localhost:$Port/"
$mime = @{".html"="text/html; charset=utf-8";".js"="application/javascript";".json"="application/json";".png"="image/png";".jpg"="image/jpeg";".css"="text/css";".ttf"="font/ttf"}
while ($true) {
  $c = $l.GetContext(); $q = $c.Request; $r = $c.Response
  try {
    $p = $q.Url.LocalPath
    if ($q.HttpMethod -eq "POST" -and $p.StartsWith("/save/")) {
      $name = [System.IO.Path]::GetFileName($p.Substring(6))
      $fs = [System.IO.File]::Create((Join-Path $out $name)); $q.InputStream.CopyTo($fs); $fs.Close()
      $b = [Text.Encoding]::UTF8.GetBytes("ok"); $r.OutputStream.Write($b,0,$b.Length); continue
    }
    if ($p -eq "/") { $p = "/index.html" }
    if ($p.StartsWith("/studio/")) { $f = Join-Path $studio $p.Substring(8) } else { $f = Join-Path $app $p.TrimStart("/") }
    if (Test-Path $f -PathType Leaf) {
      $ext = [IO.Path]::GetExtension($f).ToLower(); $ct = $mime[$ext]; if (-not $ct) { $ct = "application/octet-stream" }
      $bytes = [IO.File]::ReadAllBytes($f)
      if ($p -eq "/index.html" -and $q.QueryString["cap"]) {
        $html = [Text.Encoding]::UTF8.GetString($bytes)
        $inj = "<script>window.addEventListener('load',function(){setTimeout(function(){try{goSection('" + $q.QueryString["cap"] + "');" + $q.QueryString["js"] + "}catch(e){document.title='ERR '+e}; " + $(if($q.QueryString["nonav"]){"document.getElementById('bottomNav').style.display='none';"}else{""}) + "setTimeout(function(){window.scrollTo(0," + [int]$q.QueryString["scroll"] + ")},150)},400)})</script></body>"
        $html = $html.Replace("</body>", $inj)
        $bytes = [Text.Encoding]::UTF8.GetBytes($html)
      }
      $r.ContentType = $ct; $r.ContentLength64 = $bytes.Length; $r.OutputStream.Write($bytes,0,$bytes.Length)
    } else { $r.StatusCode = 404 }
  } catch { $r.StatusCode = 500 } finally { $r.OutputStream.Close() }
}
