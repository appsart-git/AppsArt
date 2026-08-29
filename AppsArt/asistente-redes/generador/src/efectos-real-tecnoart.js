'use strict';
/* Tratamiento visual retro-futurista para VIDEO REAL (a diferencia de video-tecnoart.js,
   que son prompts de texto para que Runway anime una foto). Acá no hay ningún modelo
   generativo de por medio — el video real ya existe, así que el "efecto" se aplica con
   filtros de ffmpeg puros y deterministas (grano + aberración cromática + pulso de
   contraste/brillo + zoom), nunca describiéndoselo a una IA. Se sortea una variante al
   azar por post, mismo criterio de variedad que las de Runway. */

const VARIANTES = [
  { nombre: 'glitch-entrada', filtro: "noise=alls=25:allf=t+u,rgbashift=rh=6:bh=-6" },
  { nombre: 'escaneo-wireframe', filtro: "noise=alls=18:allf=t+u,eq=contrast='1+0.45*sin(2*PI*t/1.0)':brightness='0.06*sin(2*PI*t/1.0)'" },
  { nombre: 'zoom-pulso-neon', filtro: "noise=alls=12:allf=t+u,zoompan=z='min(zoom+0.0015,1.3)':d=1:s=720x1280:fps=24,eq=brightness='0.08*sin(2*PI*t/2)'" },
  { nombre: 'cortes-vhs', filtro: "noise=alls=22:allf=t+u,rgbashift=rh=10:bh=-10,hue=h='35*sin(2*PI*t/0.6)'" }
];

function elegirEfectoReal(){
  return VARIANTES[Math.floor(Math.random() * VARIANTES.length)];
}

module.exports = { elegirEfectoReal };
