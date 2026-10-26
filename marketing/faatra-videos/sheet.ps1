# Tira de cuadros sueltos (out/still-<v>-*.png) en una sola imagen: out/sheet-<v>.png
param([string]$V)
Add-Type -AssemblyName System.Drawing
$out = "C:\Users\moyola\Desktop\AppsArt\marketing\faatra-videos\out"
$files = Get-ChildItem $out -Filter "still-$V-*.png" | Sort-Object { [double]($_.BaseName -replace "still-$V-", '') }
$tw = 360; $th = 640
$bmp = New-Object System.Drawing.Bitmap ($tw * $files.Count + 8 * ($files.Count + 1)), ($th + 16)
$g = [System.Drawing.Graphics]::FromImage($bmp); $g.Clear([System.Drawing.Color]::Gray); $g.InterpolationMode = 'HighQualityBicubic'
$i = 0
foreach ($f in $files) { $img = [System.Drawing.Image]::FromFile($f.FullName); $g.DrawImage($img, (8 + $i * ($tw + 8)), 8, $tw, $th); $img.Dispose(); $i++ }
$bmp.Save("$out\sheet-$V.png")
