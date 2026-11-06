# uso: bash lib/hoja.sh salida.png captura1.png captura2.png ...  (capturas en fila, a 1/3 de escala)
out="$1"; shift; a=(); f=""; n=0
for i in "$@"; do a+=(-i "$i"); f+="[$n]scale=iw/3:-1[v$n];"; n=$((n+1)); done
ins=""; for ((k=0;k<n;k++)); do ins+="[v$k]"; done
if [ $n -eq 1 ]; then ffmpeg -loglevel error -y "${a[@]}" -vf scale=iw/3:-1 "$out"; else ffmpeg -loglevel error -y "${a[@]}" -filter_complex "$f${ins}hstack=$n" "$out"; fi
