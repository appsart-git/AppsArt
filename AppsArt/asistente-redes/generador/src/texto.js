'use strict';
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function pedirJSON(prompt){
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }]
  });
  const raw = msg.content.map(b => (b.type === 'text' ? b.text : '')).join('').trim();
  const jsonStr = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
  try{
    return JSON.parse(jsonStr);
  }catch(e){
    throw new Error(`No se pudo parsear la respuesta de Claude como JSON: ${e.message}. Respuesta cruda: ${raw.slice(0,300)}`);
  }
}

/* Devuelve {caption, promptImagen} y, si la cuenta también genera video,
   además {guion, promptVideo}. Todo en un solo llamado para que el guion
   y la imagen salgan coherentes entre sí (mismo tema, mismo tono). */
async function generarTexto(cuenta, tema){
  const necesitaVideo = cuenta.mediaType === 'imagen+video';

  const prompt = `
Sos el/la community manager de "${cuenta.nombre}" (${cuenta.rubro || ''}).
Descripción del negocio: ${cuenta.descripcionNegocio || '-'}
Voz de marca / tono: ${cuenta.vozMarca || '-'}
Público objetivo: ${cuenta.publicoObjetivo || '-'}
Identidad visual: ${cuenta.identidadVisual || '-'}
Hashtags base disponibles: ${(cuenta.hashtagsBase || []).join(' ') || '-'}
Instrucciones extra: ${cuenta.promptExtra || '-'}

Generá contenido para un posteo de Instagram sobre este tema/colección: "${tema}".

Devolvé SOLO un objeto JSON válido (sin texto extra, sin bloque de markdown) con esta forma exacta:
{
  "caption": "el texto del posteo en español, con 2 a 4 hashtags relevantes al final",
  "promptImagen": "prompt en inglés, detallado, para un generador de imágenes, coherente con la identidad visual de la marca"${necesitaVideo ? `,
  "guion": "guion narrado en español, pensado para 10 a 20 segundos hablados, para un reel corto",
  "promptVideo": "prompt en inglés, detallado, describiendo la escena/movimiento de cámara para un generador de video"` : ''}
}`.trim();

  const data = await pedirJSON(prompt);
  if(!data.caption || !data.promptImagen) throw new Error('La respuesta de Claude no tiene caption/promptImagen.');
  if(necesitaVideo && (!data.guion || !data.promptVideo)) throw new Error('La respuesta de Claude no tiene guion/promptVideo para una cuenta con video.');
  return data;
}

const ICONOS_VALIDOS = ['stock', 'pago', 'produccion', 'informes', 'ficha', 'clientes'];

/* Para cuentas con formatoCarrusel: en vez de un prompt de imagen suelto, le pide a
   Claude el copy de cada lámina (portada + contenido + cierre), que después
   generador/src/carrusel.js renderiza como HTML/CSS real con la identidad de marca
   exacta (no aproximada por un modelo de imágenes). */
async function generarTextoCarrusel(cuenta, tema){
  const prompt = `
Sos el/la community manager senior de "${cuenta.nombre}" (${cuenta.rubro || ''}), especializado/a en
Instagram B2B, con años de experiencia haciendo crecer cuentas de software/tecnología.
Descripción del negocio: ${cuenta.descripcionNegocio || '-'}
Voz de marca / tono: ${cuenta.vozMarca || '-'}
Público objetivo: ${cuenta.publicoObjetivo || '-'}
Instrucciones extra: ${cuenta.promptExtra || '-'}

Armá un carrusel de Instagram de 3 láminas sobre: "${tema}". Pensalo con criterio de experto, no como
un redactor genérico:
- Lámina 1 (portada): debajo del logo va un titular corto (2-5 palabras) que sea un gancho — que en
  2 segundos de scroll haga que alguien pare el dedo — y un subtítulo de una línea que lo respalde con
  un beneficio concreto. Nada de frases corporativas gastadas ("soluciones innovadoras", "revolucioná
  tu negocio"). Hablale directo al dolor concreto del dueño de PyME/comercio/industria (tiempo perdido,
  errores manuales, caos de papeles, no saber qué pasa en el negocio).
- Lámina 2 (contenido): 6 beneficios concretos y tangibles, no features técnicas — cada label corto
  (3-5 palabras) tiene que poder leerse de un vistazo en el feed.
- Lámina 3 (cierre): remate que refuerce el gancho de la portada (no un genérico "contactanos"), + CTA
  claro y de baja fricción.
El caption complementa el carrusel, no lo repite: agregá contexto o un dato/pregunta que invite a comentar.

La lámina "contenido" debe listar exactamente 6 funcionalidades/beneficios concretos, cada uno con
un ícono de esta lista fija (elegí el que mejor calce semánticamente, podés repetir si hace falta):
${ICONOS_VALIDOS.join(', ')}.

Podés marcar UNA palabra o frase corta clave dentro de "titulo" envolviéndola en asteriscos,
ej: "Un stock *siempre* bajo control" — se resalta en el color de acento. Usalo como mucho una vez por lámina.

Devolvé SOLO un objeto JSON válido (sin texto extra, sin bloque de markdown) con esta forma exacta:
{
  "caption": "el texto del posteo en español, con 2 a 4 hashtags relevantes al final",
  "slides": [
    {"tipo":"portada", "eyebrow":"texto corto en mayúsculas, ej: NOMBRE · TEMA", "titulo":"titular corto y potente (2-5 palabras)", "subtitulo":"una línea que respalda el titular con un beneficio concreto"},
    {"tipo":"contenido", "eyebrow":"texto corto en mayúsculas", "titulo":"titular corto", "items":[
      {"icono":"uno de los íconos fijos", "label":"texto corto del beneficio"}
    ] (exactamente 6 items)},
    {"tipo":"cierre", "titulo":"titular corto de cierre", "cta":"texto corto para un botón, ej: Diagnóstico gratuito — escribinos"}
  ]
}`.trim();

  const data = await pedirJSON(prompt);
  if(!data.caption || !Array.isArray(data.slides) || data.slides.length !== 3){
    throw new Error('La respuesta de Claude no tiene caption/slides válidos para el carrusel.');
  }
  const contenido = data.slides.find(s => s.tipo === 'contenido');
  if(!contenido || !Array.isArray(contenido.items) || contenido.items.length !== 6){
    throw new Error('La lámina "contenido" del carrusel no tiene exactamente 6 items.');
  }
  return data;
}

module.exports = { generarTexto, generarTextoCarrusel };
