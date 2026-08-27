'use strict';
/* 4 variantes de tratamiento retro-futurista para el reel de producto de Tecno Art,
   sorteadas al azar por post (una sola vez, no por corte) para que dos posts seguidos
   no salgan con la misma estructura. El prompt describe SOLO la prenda real (foto real,
   nunca inventada) — el logo NUNCA se le pide a Runway que lo dibuje o anime (ver regla
   en memoria del proyecto: el logo real no pasa por modelos generativos), por eso cada
   plantilla cierra con "no text overlays, no logos added". Calcado del estilo real ya
   verificado en @tecnologiartesanal: reels de producto = foto/detalle real de la prenda,
   sin locución de por medio hoy; acá se le suma narración real sin tocar esa base visual. */

const VARIANTES = [
  // 1. Glitch de entrada
  (color) => `A close-up of a folded ${color} cotton t-shirt with a screen-printed graphic design, resting on a plain surface. The shot begins with heavy VHS glitch and static distortion, tracking lines rolling across the frame, then stabilizes into a smooth, subtle slow zoom-in on the fabric and print detail. Retro-futuristic mood, moody lighting, no text overlays, no logos added.`,
  // 2. Escaneo wireframe
  (color) => `A close-up of a folded ${color} cotton t-shirt with a screen-printed graphic design. A thin horizontal scan-line of bright glowing light sweeps slowly from top to bottom across the fabric, like an old CRT display or radar scanner, leaving a brief afterglow trail. Dark moody background, retro-futuristic sci-fi atmosphere, camera holds steady, no text overlays, no logos added.`,
  // 3. Zoom lento + pulso neón
  (color) => `A slow, cinematic push-in zoom on a folded ${color} cotton t-shirt with a screen-printed graphic design, the fabric texture and print detail becoming gradually clearer. A soft neon glow subtly pulses in the background rim light, breathing in and out slowly. Moody, retro-futuristic lighting, no text overlays, no logos added.`,
  // 4. Cortes tipo VHS
  (color) => `A series of 2-3 quick cuts between different close-up angles of a folded ${color} cotton t-shirt with a screen-printed graphic design, each transition marked by a brief VHS tape glitch — color bleed, tracking distortion, a quick static flash. Retro-futuristic mood, moody lighting, handheld camera feel, no text overlays, no logos added.`
];

const NOMBRES_VARIANTES = ['glitch-entrada', 'escaneo-wireframe', 'zoom-pulso-neon', 'cortes-vhs'];

function elegirPromptVideo(producto){
  const idx = Math.floor(Math.random() * VARIANTES.length);
  const colores = producto.colores || [];
  const color = (colores[Math.floor(Math.random() * colores.length)] || 'dark').toLowerCase();
  return { promptVideo: VARIANTES[idx](color), variante: NOMBRES_VARIANTES[idx] };
}

module.exports = { elegirPromptVideo };
