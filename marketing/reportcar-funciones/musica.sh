# Base musical original (sin licencias de terceros): pad suave Am - F - C - G, 4 s por acorde, con
# pulso leve de corcheas a 120 bpm. Sale audio/musica.mp3 (32 s; render.mjs la repite en loop).
set -e; mkdir -p audio
acorde(){ # $1 nombre, $2 $3 $4 frecuencias
  ffmpeg -loglevel error -y -f lavfi -i "aevalsrc='(0.32*sin(2*PI*$2*t)+0.26*sin(2*PI*$3*t)+0.22*sin(2*PI*$4*t)+0.12*sin(2*PI*($2/2)*t)+0.05*sin(4*PI*$3*t))*(0.75+0.25*sin(2*PI*4*t)^2)*min(1\,t/0.6)*min(1\,(4-t)/0.6)|(0.32*sin(2*PI*$2*1.003*t)+0.26*sin(2*PI*$3*0.997*t)+0.22*sin(2*PI*$4*t)+0.12*sin(2*PI*($2/2)*t)+0.05*sin(4*PI*$3*t))*(0.75+0.25*sin(2*PI*4*t)^2)*min(1\,t/0.6)*min(1\,(4-t)/0.6)':s=48000:d=4" "audio/_$1.wav"
}
acorde am 220 261.63 329.63; acorde f 174.61 220 261.63; acorde c 196 261.63 329.63; acorde g 196 246.94 293.66
printf "file '_am.wav'\nfile '_f.wav'\nfile '_c.wav'\nfile '_g.wav'\n" > audio/_lista.txt
ffmpeg -loglevel error -y -f concat -safe 0 -i audio/_lista.txt -af "aloop=loop=1:size=768000,lowpass=f=1800,aecho=0.6:0.5:420|700:0.25|0.18,volume=0.5,loudnorm=I=-20" -ar 44100 -b:a 160k audio/musica.mp3
rm audio/_*.wav audio/_lista.txt
