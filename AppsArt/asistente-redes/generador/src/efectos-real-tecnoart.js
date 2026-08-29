'use strict';
/* Tratamiento visual retro-futurista para VIDEO REAL (a diferencia de video-tecnoart.js,
   que son prompts de texto para que Runway anime una foto). Acá no hay ningún modelo
   generativo de por medio — el video real ya existe, así que el "efecto" se aplica con
   filtros de ffmpeg puros y deterministas (grano/interferencia + aberración cromática +
   pulso de luz neón con cambio de color + zoom), nunca describiéndoselo a una IA.

   Segunda vuelta de feedback: los efectos eran demasiado sutiles, y el cliente pidió algo
   más agresivo tipo interferencia/neón. Se sube la intensidad base y se suma un pulso de
   "luz neón" real (no solo brillo: gamma por canal de color, para que de verdad cambie de
   color como un cartel de neón, usando eq — que sí soporta expresiones con tiempo, a
   diferencia de rgbashift/blend que solo aceptan valores fijos).

   Para que dos posts seguidos no salgan iguales aunque toque la misma variante, cada
   parámetro numérico se sortea dentro de un rango en vez de ser un valor fijo. */

function entre(min, max){ return min + Math.random() * (max - min); }
function elegir(lista){ return lista[Math.floor(Math.random() * lista.length)]; }

const COLORES_NEON = [
  { gb: 1, gr: 0 },   // cian/azul
  { gb: 0, gr: 1 },   // magenta/rojo
  { gb: 1, gr: 1 }    // ambos (violeta)
];

function pulsoNeon(){
  const color = elegir(COLORES_NEON);
  const velocidad = entre(0.5, 1.1).toFixed(2);
  const intensidad = entre(0.4, 0.65).toFixed(2);
  const fase = entre(0, 3).toFixed(2);
  const partes = [];
  if(color.gb) partes.push(`gamma_b='1+${intensidad}*sin(2*PI*t/${velocidad})'`);
  if(color.gr) partes.push(`gamma_r='1+${intensidad}*sin(2*PI*t/${velocidad}+${fase})'`);
  return `eq=${partes.join(':')}:saturation=${entre(1.3, 1.7).toFixed(2)}`;
}

const VARIANTES = [
  // glitch-entrada: interferencia + aberración cromática fuerte
  () => `noise=alls=${Math.round(entre(28, 40))}:allf=t+u,rgbashift=rh=${Math.round(entre(10, 16))}:bh=${Math.round(entre(-16, -10))},${pulsoNeon()}`,
  // escaneo-wireframe: parpadeo de contraste/brillo tipo CRT + neón
  () => `noise=alls=${Math.round(entre(20, 28))}:allf=t+u,eq=contrast='1+${entre(0.5, 0.8).toFixed(2)}*sin(2*PI*t/${entre(0.6, 1.0).toFixed(2)})':brightness='${entre(0.08, 0.14).toFixed(2)}*sin(2*PI*t/${entre(0.6, 1.0).toFixed(2)})',${pulsoNeon()}`,
  // zoom-pulso-neon: zoom continuo + pulso de neón marcado
  () => `noise=alls=${Math.round(entre(16, 24))}:allf=t+u,zoompan=z='min(zoom+${entre(0.0015, 0.003).toFixed(4)},1.4)':d=1:s=720x1280:fps=24,${pulsoNeon()}`,
  // cortes-vhs: aberración cromática oscilante + tinte de color rotando
  () => `noise=alls=${Math.round(entre(26, 36))}:allf=t+u,rgbashift=rh=${Math.round(entre(12, 18))}:bh=${Math.round(entre(-18, -12))},hue=h='${Math.round(entre(30, 55))}*sin(2*PI*t/${entre(0.4, 0.7).toFixed(2)})',${pulsoNeon()}`
];

const NOMBRES = ['glitch-entrada', 'escaneo-wireframe', 'zoom-pulso-neon', 'cortes-vhs'];

function elegirEfectoReal(){
  const idx = Math.floor(Math.random() * VARIANTES.length);
  return { nombre: NOMBRES[idx], filtro: VARIANTES[idx]() };
}

module.exports = { elegirEfectoReal };
