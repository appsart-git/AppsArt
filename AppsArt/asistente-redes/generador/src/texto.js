'use strict';
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function pedirJSON(prompt, maxTokens){
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: maxTokens || 1024,
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
  "caption": "el texto del posteo en español, con 2 a 4 hashtags relevantes al final (todo en minúsculas y sin espacios ni separadores dentro de cada hashtag, ej. #economiacircular)",
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
   exacta (no aproximada por un modelo de imágenes). La lámina 2 tiene 3 formas
   posibles (dolor / antes-ahora / grilla de íconos), elegida al azar en el render,
   así que acá se le pide a Claude el contenido de las 3 en un solo llamado. */
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
- Lámina 1 (portada): titular corto (2-6 palabras) que sea un gancho — que en 2 segundos de scroll
  haga que alguien pare el dedo — y un subtítulo de una línea que lo respalde con un beneficio concreto.
- Lámina 2 (contenido): el render elige al azar una de TRES formas de mostrarla, así que necesito
  que completes las 3 (no dupliques texto entre sí, cada una parada sola):
  · Como titular corrido (el dolor concreto de este tema, nada genérico): hasta 3 líneas cortas +
    una línea de apoyo más chica que lo aterriza en la vida diaria del dueño de PyME/comercio/
    industria (planillas sueltas, datos desactualizados, tiempo perdido, decisiones a ciegas —
    específico al tema, no genérico).
  · Como contraste antes/ahora: "antes" describe el problema actual en pocas palabras (sin la palabra
    "antes"), "ahora" describe cómo queda resuelto con un sistema a medida (sin la palabra "ahora").
  · Como grilla de 6 beneficios concretos y tangibles relacionados con el tema (no funcionalidades
    técnicas genéricas), cada uno con un ícono de esta lista fija (elegí el que mejor calce
    semánticamente, podés repetir si hace falta): ${ICONOS_VALIDOS.join(', ')}. Cada label corto
    (3-5 palabras) tiene que poder leerse de un vistazo.
- Lámina 3 (cierre): la solución que refuerza el gancho de la portada (no un genérico "contactanos"),
  + CTA claro y de baja fricción.
El caption complementa el carrusel, no lo repite: agregá contexto o un dato/pregunta que invite a comentar.

Nada de frases corporativas gastadas ("soluciones innovadoras", "revolucioná tu negocio"). Y ojo con
emparejar palabras que no combinan en sentido: releé cada titular y preguntate si las palabras que
elegiste realmente van juntas (ej. "una oportunidad de error" no tiene sentido — "oportunidad" es
positivo, "error" no; sería "cada actualización manual es un riesgo de error", por ejemplo).

Podés marcar UNA palabra o frase corta clave dentro de un "titulo" envolviéndola en asteriscos,
ej: "Un stock *siempre* bajo control" — se resalta en el color de acento. Usalo como mucho una vez por lámina.

Devolvé SOLO un objeto JSON válido (sin texto extra, sin bloque de markdown) con esta forma exacta:
{
  "caption": "el texto del posteo en español, con 2 a 4 hashtags relevantes al final (todo en minúsculas y sin espacios ni separadores dentro de cada hashtag, ej. #economiacircular)",
  "slides": [
    {"tipo":"portada", "eyebrow":"texto corto en mayúsculas, ej: NOMBRE · TEMA", "titulo":"titular corto y potente (2-6 palabras)", "subtitulo":"una línea que respalda el titular con un beneficio concreto"},
    {"tipo":"contenido", "titulo":"titular del dolor concreto (hasta 3 líneas cortas)", "subtitulo":"línea de apoyo más chica que lo aterriza", "antes":"el problema actual en pocas palabras", "ahora":"cómo queda resuelto, en pocas palabras", "items":[
      {"icono":"uno de los íconos fijos", "label":"beneficio corto"}
    ] (exactamente 6 items)},
    {"tipo":"cierre", "titulo":"titular corto de cierre (la solución)", "cta":"texto corto para un botón, ej: Diagnóstico gratuito — escribinos"}
  ]
}`.trim();

  const data = await pedirJSON(prompt, 2048);
  if(!data.caption || !Array.isArray(data.slides) || data.slides.length !== 3){
    throw new Error('La respuesta de Claude no tiene caption/slides válidos para el carrusel.');
  }
  const contenido = data.slides.find(s => s.tipo === 'contenido');
  if(!contenido || !contenido.titulo || !contenido.antes || !contenido.ahora){
    throw new Error('La lámina "contenido" del carrusel no tiene los campos de titular/antes/ahora.');
  }
  if(!Array.isArray(contenido.items) || contenido.items.length !== 6){
    throw new Error('La lámina "contenido" del carrusel no tiene los 6 items de la variante grilla.');
  }
  return data;
}

/* Ficha de producto de Entre PyMES: las specs vienen de datos reales scrapeados de
   entrepymes.com.ar (ver generador/src/entrepymes-productos.json) — a Claude solo se
   le pide elegir y pulir la redacción de las más relevantes, nunca inventar ninguna. */
async function generarTextoFichaProducto(cuenta, producto){
  const prompt = `
Sos el/la community manager de "${cuenta.nombre}" (${cuenta.rubro || ''}), un marketplace B2B de
maquinaria industrial usada.
Descripción del negocio: ${cuenta.descripcionNegocio || '-'}
Voz de marca / tono: ${cuenta.vozMarca || '-'}
Público objetivo: ${cuenta.publicoObjetivo || '-'}
Instrucciones extra: ${cuenta.promptExtra || '-'}

Vas a armar el posteo de Instagram para esta máquina real, publicada en la web de la empresa:
Nombre: ${producto.nombre}
Descripción: ${producto.descripcionCorta || '-'}
Características reales (tal como están cargadas en la web — no inventes ninguna, no agregues datos
que no estén acá, y si algo dice "a confirmar" o similar, no lo presentes como un dato cerrado):
${(producto.caracteristicas || []).map(c => `- ${c}`).join('\n')}

Tarea:
1. Elegí las 3 o 4 características de la lista de arriba que más le importan a un comprador industrial
   (capacidad, estado, marca, medidas, tipo de accionamiento) y reescribilas cortas y claras para leer
   de un vistazo en una imagen — sin inventar ni agregar ningún dato que no esté en la lista.
2. Escribí un caption de Instagram (2-4 líneas + 2-4 hashtags relevantes al final, todo en minúsculas y
   sin espacios ni separadores dentro de cada hashtag, ej. #maquinariaindustrial) que genere interés
   real en compradores industriales, sin exagerar ni prometer nada que no esté respaldado por la
   descripción o las características de arriba.
3. Un texto corto para el botón CTA (ej: "Consultá disponibilidad", "Escribinos por esta máquina").

Devolvé SOLO un objeto JSON válido (sin texto extra, sin bloque de markdown) con esta forma exacta:
{
  "caption": "...",
  "specs": ["...", "...", "...", "..."],
  "cta": "..."
}`.trim();

  const data = await pedirJSON(prompt, 1024);
  if(!data.caption || !Array.isArray(data.specs) || data.specs.length === 0){
    throw new Error('La respuesta de Claude no tiene caption/specs válidos para la ficha de producto.');
  }
  return data;
}

/* Institucional (Quiénes somos, Misión, Visión, etc.): grounded únicamente en los
   datos reales de la cuenta (descripcionNegocio/vozMarca/publicoObjetivo) — sin
   inventar casos de clientes, cifras ni logros que no se puedan sostener con eso. */
async function generarTextoInstitucional(cuenta, tema){
  const prompt = `
Sos el/la community manager de "${cuenta.nombre}" (${cuenta.rubro || ''}).
Descripción del negocio: ${cuenta.descripcionNegocio || '-'}
Voz de marca / tono: ${cuenta.vozMarca || '-'}
Público objetivo: ${cuenta.publicoObjetivo || '-'}
Instrucciones extra: ${cuenta.promptExtra || '-'}

Armá un posteo institucional de Instagram sobre: "${tema}". Basate únicamente en la descripción del
negocio de arriba — no inventes casos de clientes, cifras, alianzas ni afirmaciones que no se puedan
sostener con esa descripción.

Devolvé SOLO un objeto JSON válido (sin texto extra, sin bloque de markdown) con esta forma exacta:
{
  "caption": "el texto del posteo en español, con 2 a 4 hashtags relevantes al final (todo en minúsculas y sin espacios ni separadores dentro de cada hashtag, ej. #economiacircular)",
  "eyebrow": "texto corto en mayúsculas para la placa, ej: QUIÉNES SOMOS",
  "titulo": "titular corto y potente (hasta 8 palabras)",
  "texto": "1-2 líneas de apoyo que desarrollan el titular"
}`.trim();

  const data = await pedirJSON(prompt, 1024);
  if(!data.caption || !data.titulo){
    throw new Error('La respuesta de Claude no tiene caption/titulo válidos para el institucional.');
  }
  return data;
}

module.exports = { generarTexto, generarTextoCarrusel, generarTextoFichaProducto, generarTextoInstitucional };
