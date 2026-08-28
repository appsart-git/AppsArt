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
   enfático. Segunda ronda de feedback: seguía sintiéndose estática/lenta para el ritmo
   de reels — ahora TODAS las variantes comparten una base de cortes rápidos (4-5 jump
   cuts, calcado de lo que antes solo tenía la variante 4), y cada una le suma su firma
   visual propia arriba de esa base, para que ninguna quede "tranquila". */
const VARIANTES = [
  // 1. Glitch de entrada
  (color) => `A fast-paced series of 4-5 quick jump cuts between different extreme close-up angles of a folded ${color} cotton t-shirt with a screen-printed graphic design. INTENSE, AGGRESSIVE VHS glitch throughout: heavy static noise, strong RGB color-channel splitting, tracking lines violently rolling and jumping, the image tearing and glitching on every cut — fast and chaotic, never calm. High-energy retro-futuristic mood, dramatic contrast, no text overlays, no logos added.`,
  // 2. Escaneo wireframe
  (color) => `A fast-paced series of 4-5 quick jump cuts between different extreme close-up angles of a folded ${color} cotton t-shirt with a screen-printed graphic design. On every cut, a bright, thick, high-contrast scan-line of glowing light sweeps FAST across the fabric, like an aggressive radar/CRT sweep, leaving strong glowing afterimage trails — continuous fast motion, never static. Dark high-contrast background, dramatic retro-futuristic sci-fi atmosphere, no text overlays, no logos added.`,
  // 3. Zoom + pulso neón
  (color) => `A fast-paced series of 4-5 quick jump cuts, each one a fast push-in zoom on a different extreme close-up angle of a folded ${color} cotton t-shirt with a screen-printed graphic design, the fabric texture and print detail rushing closer on every cut. A strong, high-contrast neon glow pulses rapidly and dramatically in the rim light on each cut, brightening and dimming noticeably. Intense retro-futuristic lighting, high energy, no text overlays, no logos added.`,
  // 4. Cortes tipo VHS
  (color) => `A fast-paced series of 5-6 quick jump cuts between different extreme close-up angles of a folded ${color} cotton t-shirt with a screen-printed graphic design, each cut punctuated by a strong, violent VHS tape glitch — heavy color bleed, tracking distortion, full-frame static flash. High energy, constant motion, dramatic retro-futuristic mood, no text overlays, no logos added.`
];

const NOMBRES_VARIANTES = ['glitch-entrada', 'escaneo-wireframe', 'zoom-pulso-neon', 'cortes-vhs'];

function elegirPromptVideo(producto){
  const idx = Math.floor(Math.random() * VARIANTES.length);
  const colores = producto.colores || [];
  const color = (colores[Math.floor(Math.random() * colores.length)] || 'dark').toLowerCase();
  return { promptVideo: VARIANTES[idx](color), variante: NOMBRES_VARIANTES[idx] };
}

module.exports = { elegirPromptVideo };
