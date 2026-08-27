'use strict';
/* 4 variantes de tratamiento retro-futurista para el reel de producto de Tecno Art,
   sorteadas al azar por post (una sola vez, no por corte) para que dos posts seguidos
   no salgan con la misma estructura. El prompt describe SOLO la prenda real (foto real,
   nunca inventada) — el logo NUNCA se le pide a Runway que lo dibuje o anime (ver regla
   en memoria del proyecto: el logo real no pasa por modelos generativos), por eso cada
   plantilla cierra con "no text overlays, no logos added". Calcado del estilo real ya
   verificado en @tecnologiartesanal: reels de producto = foto/detalle real de la prenda,
   sin locución de por medio hoy; acá se le suma narración real sin tocar esa base visual. */

/* La primera corrida real salió con movimiento casi imperceptible (Runway interpretó
   "subtle"/"slowly" de forma demasiado literal) — se reescriben con lenguaje mucho más
   enfático e insistente sobre la intensidad/velocidad del efecto, repitiendo la idea de
   varias formas dentro del mismo prompt para que el modelo no lo suavice. */
const VARIANTES = [
  // 1. Glitch de entrada
  (color) => `Extreme close-up of a folded ${color} cotton t-shirt with a screen-printed graphic design. INTENSE, AGGRESSIVE VHS glitch throughout the entire shot: heavy static noise, strong RGB color-channel splitting, tracking lines violently rolling and jumping across the frame, the image tearing and glitching repeatedly, fast and chaotic — never fully calm. Constant camera drift pushing in. High-energy retro-futuristic mood, dramatic contrast, no text overlays, no logos added.`,
  // 2. Escaneo wireframe
  (color) => `Extreme close-up of a folded ${color} cotton t-shirt with a screen-printed graphic design. A bright, thick, high-contrast scan-line of glowing light sweeps FAST and repeatedly from top to bottom and back, like an aggressive radar/CRT sweep, leaving strong glowing afterimage trails each pass — continuous fast motion for the whole shot, never static. Camera also slowly rotates around the fabric. Dark high-contrast background, dramatic retro-futuristic sci-fi atmosphere, no text overlays, no logos added.`,
  // 3. Zoom lento + pulso neón
  (color) => `Extreme close-up of a folded ${color} cotton t-shirt with a screen-printed graphic design. Fast, continuous cinematic push-in zoom throughout the whole shot, the fabric texture and print detail rushing closer. A strong, high-contrast neon glow pulses rapidly and dramatically in the rim light, brightening and dimming noticeably again and again. Intense retro-futuristic lighting, no text overlays, no logos added.`,
  // 4. Cortes tipo VHS
  (color) => `A fast-paced series of 4-5 quick jump cuts between different extreme close-up angles of a folded ${color} cotton t-shirt with a screen-printed graphic design, each cut punctuated by a strong, violent VHS tape glitch — heavy color bleed, tracking distortion, full-frame static flash. High energy, constant motion, dramatic retro-futuristic mood, no text overlays, no logos added.`
];

const NOMBRES_VARIANTES = ['glitch-entrada', 'escaneo-wireframe', 'zoom-pulso-neon', 'cortes-vhs'];

function elegirPromptVideo(producto){
  const idx = Math.floor(Math.random() * VARIANTES.length);
  const colores = producto.colores || [];
  const color = (colores[Math.floor(Math.random() * colores.length)] || 'dark').toLowerCase();
  return { promptVideo: VARIANTES[idx](color), variante: NOMBRES_VARIANTES[idx] };
}

module.exports = { elegirPromptVideo };
