# Hoja de contactos de una escena (para revisar capturas): out/contact-<escena>.png
param([string]$Scene, [int]$Vw = 390, [int]$Vh = 760)
Add-Type -AssemblyName System.Drawing
$dir = "C:\Users\moyola\Desktop\AppsArt\marketing\faatra-videos\out\shots"
$files = Get-ChildItem $dir -Filter "$Scene-*.png" | Sort-Object { [int]($_.BaseName -replace '.*-', '') }
$tw = [int]($Vw * 1.0); $th = [int]($Vh * 1.0)
$bmp = New-Object System.Drawing.Bitmap ($tw * $files.Count + 10 * ($files.Count + 1)), ($th + 20)
$g = [System.Drawing.Graphics]::FromImage($bmp); $g.Clear([System.Drawing.Color]::DimGray)
$g.InterpolationMode = 'HighQualityBicubic'
$i = 0
foreach ($f in $files) {
  $img = [System.Drawing.Image]::FromFile($f.FullName)
  $g.DrawImage($img, (New-Object System.Drawing.Rectangle (10 + $i * ($tw + 10)), 10, $tw, $th), (New-Object System.Drawing.Rectangle 0, 0, ($Vw * 3), ($Vh * 3)), 'Pixel')
  $j = "$dir\$($f.BaseName).json"
  if (Test-Path $j) { $m = Get-Content -Raw $j | ConvertFrom-Json; if ($m.tap) { $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::OrangeRed), 4; $g.DrawEllipse($pen, (10 + $i * ($tw + 10) + $m.tap.x - 20), (10 + $m.tap.y - 20), 40, 40) } }
  $img.Dispose(); $i++
}
$bmp.Save("C:\Users\moyola\Desktop\AppsArt\marketing\faatra-videos\out\contact-$Scene.png")
