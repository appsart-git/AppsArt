'use strict';
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/* Red de seguridad: todas las funciones piden a Claude "2-4 hashtags al final", pero un
   llamado puntual puede devolver el caption sin ninguno (pasó de verdad en un posteo real
   de Quinta Tres Estaciones) — más confiable garantizarlo acá que confiar en que el
   modelo lo cumpla siempre. */
function asegurarHashtags(caption, hashtagsBase){
  if(/#\w/.test(caption || '')) return caption;
  const tags = (hashtagsBase || []).slice(0, 4).join(' ');
  return tags ? `${caption}\n\n${tags}` : caption;
}

/* Regla de gancho: en redes la decisión de quedarse o seguir de largo se toma en los
   primeros segundos/la primera línea, no describiendo — inspirado en cómo enseña a
   armar contenido Mati Box (@mati.boxx, "experto en contenido que vende"): mostrar el
   beneficio/la experiencia y enganchar rápido, no presentar. Se repite en cada prompt
   (caption y, donde aplica, título/guion) en vez de confiar en un único recordatorio
   general, porque cada formato tiene su propio "primer momento" que hay que cuidar. */
const REGLA_GANCHO = 'La primera línea tiene que ser un gancho, no una descripción ni una presentación: una pregunta directa, una afirmación fuerte o algo inesperado que frene el scroll en los primeros segundos. Nunca arranques con un dato genérico, el nombre de la marca o una frase de introducción tranquila.';

/* Varias corridas reales (AppsArt sobre todo, pero también Entre PyMES y Quinta Tres
   Estaciones) venían fallando con "Unterminated string"/"Expected ',' or '}'" al parsear
   el JSON — Claude cortaba la respuesta justo antes de cerrarla porque el max_tokens
   quedaba corto (más notorio en el carrusel de AppsArt, que ya de por sí pide bastante
   contenido: 3 láminas + grilla de 6 items). En vez de solo subir los números a mano
   (que vuelve a quedar corto apenas el copy crece un poco), se detecta el corte real
   (stop_reason === 'max_tokens') y se reintenta UNA vez con el doble de presupuesto —
   así el sistema se auto-corrige en vez de depender de una estimación fija para siempre. */
async function pedirJSON(prompt, maxTokens){
  let presupuesto = maxTokens || 1536;
  for(let intento = 0; intento < 2; intento++){
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: presupuesto,
      messages: [{ role: 'user', content: prompt }]
    });
    const raw = msg.content.map(b => (b.type === 'text' ? b.text : '')).join('').trim();
    const jsonStr = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

    if(msg.stop_reason === 'max_tokens' && intento === 0){
      presupuesto *= 2;
      continue;
    }
    try{
      return JSON.parse(jsonStr);
    }catch(e){
      if(intento === 0){ presupuesto *= 2; continue; }
      throw new Error(`No se pudo parsear la respuesta de Claude como JSON: ${e.message}. Respuesta cruda: ${raw.slice(0,300)}`);
    }
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

${REGLA_GANCHO}

Devolvé SOLO un objeto JSON válido (sin texto extra, sin bloque de markdown) con esta forma exacta:
{
  "caption": "el texto del posteo en español (primera línea = gancho), con 2 a 4 hashtags relevantes al final (todo en minúsculas y sin espacios ni separadores dentro de cada hashtag, ej. #economiacircular)",
  "promptImagen": "prompt en inglés, detallado, para un generador de imágenes, coherente con la identidad visual de la marca"${necesitaVideo ? `,
  "guion": "guion narrado en español, pensado para 10 a 20 segundos hablados, para un reel corto",
  "promptVideo": "prompt en inglés, detallado, describiendo la escena/movimiento de cámara para un generador de video"` : ''}
}`.trim();

  const data = await pedirJSON(prompt);
  if(!data.caption || !data.promptImagen) throw new Error('La respuesta de Claude no tiene caption/promptImagen.');
  if(necesitaVideo && (!data.guion || !data.promptVideo)) throw new Error('La respuesta de Claude no tiene guion/promptVideo para una cuenta con video.');
  data.caption = asegurarHashtags(data.caption, cuenta.hashtagsBase);
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
${REGLA_GANCHO} (aplica tanto al titular de portada como a la primera línea del caption).

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

  const data = await pedirJSON(prompt, 2560);
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
  data.caption = asegurarHashtags(data.caption, cuenta.hashtagsBase);
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
   descripción o las características de arriba. ${REGLA_GANCHO}
3. Un texto corto para el botón CTA (ej: "Consultá disponibilidad", "Escribinos por esta máquina").

Devolvé SOLO un objeto JSON válido (sin texto extra, sin bloque de markdown) con esta forma exacta:
{
  "caption": "...",
  "specs": ["...", "...", "...", "..."],
  "cta": "..."
}`.trim();

  const data = await pedirJSON(prompt, 1280);
  if(!data.caption || !Array.isArray(data.specs) || data.specs.length === 0){
    throw new Error('La respuesta de Claude no tiene caption/specs válidos para la ficha de producto.');
  }
  data.caption = asegurarHashtags(data.caption, cuenta.hashtagsBase);
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

${REGLA_GANCHO} (aplica tanto al "titulo" como a la primera línea del caption).

Devolvé SOLO un objeto JSON válido (sin texto extra, sin bloque de markdown) con esta forma exacta:
{
  "caption": "el texto del posteo en español, con 2 a 4 hashtags relevantes al final (todo en minúsculas y sin espacios ni separadores dentro de cada hashtag, ej. #economiacircular)",
  "eyebrow": "texto corto en mayúsculas para la placa, ej: QUIÉNES SOMOS",
  "titulo": "titular corto y potente (hasta 8 palabras)",
  "texto": "1-2 líneas de apoyo que desarrollan el titular"
}`.trim();

  const data = await pedirJSON(prompt, 1280);
  if(!data.caption || !data.titulo){
    throw new Error('La respuesta de Claude no tiene caption/titulo válidos para el institucional.');
  }
  data.caption = asegurarHashtags(data.caption, cuenta.hashtagsBase);
  return data;
}

/* Reel de producto de Tecno Art: el guion se basa en el copy real ya escrito por la
   marca para esa remera (tono propio, con mayúsculas/frases de impacto) — acá se le pide
   a Claude que lo adapte a una locución hablada natural de 10-20s, no que lo lea tal cual
   a los gritos, y que varíe la apertura para que dos reels seguidos no arranquen igual. */
async function generarTextoVideoProducto(cuenta, producto){
  const prompt = `
Sos el/la community manager de "${cuenta.nombre}" (${cuenta.rubro || ''}).
Voz de marca / tono: ${cuenta.vozMarca || '-'}
Público objetivo: ${cuenta.publicoObjetivo || '-'}
Instrucciones extra: ${cuenta.promptExtra || '-'}

Vas a armar un reel de Instagram para esta remera real, de la colección "${producto.coleccion || '-'}":
Nombre: ${producto.nombre}
Precio: ${producto.precio || '-'}
Copy real de la marca para este diseño (está en mayúsculas y con mucha carga emocional —
usalo como base de sentido, no lo repitas literal a los gritos en la locución hablada):
${producto.descripcion}

Tarea:
1. Guion narrado en español, CORTO Y CON PUNCH — pensado para hablarse en 6 a 8 segundos
   como máximo (aproximadamente 15 a 22 palabras, ni una más). Frases cortas, directas,
   sin subordinadas ni vueltas — cada frase pega una idea y sigue, ritmo de hype/anuncio,
   no de descripción tranquila. Cálido pero con energía (no gritado como el copy escrito,
   pero tampoco plano). El video dura 10 segundos y necesita silencio al final para el
   cierre de marca, así que priorizá que sea corto y contundente por sobre completo. Variá
   la frase de apertura — no empieces siempre con la misma estructura ("Esta remera es...",
   etc.) entre un reel y otro. La primera frase hablada decide si alguien se queda mirando
   o sigue de largo — tiene que ser la más fuerte del guion, nunca una presentación tranquila
   del producto ("te presentamos...", "esta es..."): arrancá con la emoción/actitud del diseño.
2. Caption de Instagram (2-4 líneas + 2-4 hashtags relevantes al final, todo en minúsculas
   y sin espacios ni separadores dentro de cada hashtag, ej. #ritmosdelalma). ${REGLA_GANCHO}

Devolvé SOLO un objeto JSON válido (sin texto extra, sin bloque de markdown):
{
  "guion": "...",
  "caption": "..."
}`.trim();

  const data = await pedirJSON(prompt, 1280);
  if(!data.guion || !data.caption){
    throw new Error('La respuesta de Claude no tiene guion/caption válidos para el reel de producto.');
  }
  data.caption = asegurarHashtags(data.caption, cuenta.hashtagsBase);
  return data;
}

/* Post editorial de Quinta Tres Estaciones: foto REAL del predio (nunca inventada),
   así que el copy tiene que anclarse en lo que esa foto puntual efectivamente muestra
   (pileta, quincho, horno de barro, jardín, cocina, entrada) — no en la propuesta general
   del predio, para que título/texto no prometan algo que la imagen no respalda. */
async function generarTextoEspacio(cuenta, tema, descripcionFoto){
  const prompt = `
Sos el/la community manager de "${cuenta.nombre}" (${cuenta.rubro || ''}).
Descripción del negocio: ${cuenta.descripcionNegocio || '-'}
Voz de marca / tono: ${cuenta.vozMarca || '-'}
Público objetivo: ${cuenta.publicoObjetivo || '-'}
Identidad visual: ${cuenta.identidadVisual || '-'}
Instrucciones extra: ${cuenta.promptExtra || '-'}

Vas a armar un posteo de Instagram sobre: "${tema}". La foto real que acompaña el posteo muestra
específicamente esto (no inventes ni asumas que se ve algo distinto): ${descripcionFoto}

${REGLA_GANCHO} (aplica tanto al "titulo" sobre la foto como a la primera línea del caption — hacé
que quien vea la foto se imagine ahí, no que lea una descripción del lugar).

Devolvé SOLO un objeto JSON válido (sin texto extra, sin bloque de markdown) con esta forma exacta:
{
  "caption": "el texto del posteo en español, cálido y aspiracional, con 2 a 4 hashtags relevantes al final (todo en minúsculas y sin espacios ni separadores dentro de cada hashtag, ej. #paradarobles)",
  "eyebrow": "texto corto en mayúsculas para la placa, ej: EL ESPACIO",
  "titulo": "titular corto y evocador (hasta 6 palabras), anclado en lo que la foto muestra",
  "texto": "1-2 líneas de apoyo que inviten a imaginarse ahí, sin prometer nada que la foto no respalde",
  "cta": "texto corto para un botón, ej: Consultá por WhatsApp"
}`.trim();

  const data = await pedirJSON(prompt, 1280);
  if(!data.caption || !data.titulo){
    throw new Error('La respuesta de Claude no tiene caption/titulo válidos para el post de espacio.');
  }
  data.caption = asegurarHashtags(data.caption, cuenta.hashtagsBase);
  return data;
}

/* Carrusel editorial de Quinta Tres Estaciones: varias fotos reales del mismo tema
   en un solo posteo (ver espacio-carrusel.js). Igual criterio que generarTextoEspacio —
   cada lámina de contenido tiene que anclarse en lo que ESA foto puntual muestra, nunca
   en la propuesta general del predio, así que se le pasa a Claude la descripción real de
   cada foto en orden y se le pide una línea corta por cada una (nunca texto genérico que
   podría aplicar a cualquier foto del predio). */
async function generarTextoEspacioCarrusel(cuenta, tema, descripciones){
  const listaFotos = descripciones.map((d, i) => `${i + 1}. ${d}`).join('\n');
  const prompt = `
Sos el/la community manager de "${cuenta.nombre}" (${cuenta.rubro || ''}).
Descripción del negocio: ${cuenta.descripcionNegocio || '-'}
Voz de marca / tono: ${cuenta.vozMarca || '-'}
Público objetivo: ${cuenta.publicoObjetivo || '-'}
Identidad visual: ${cuenta.identidadVisual || '-'}
Instrucciones extra: ${cuenta.promptExtra || '-'}

Vas a armar un carrusel de Instagram de ${descripciones.length + 1} láminas sobre: "${tema}".
Hay ${descripciones.length} fotos reales, en este orden (la lámina 1/portada usa la foto 1, y cada
lámina de contenido siguiente usa la foto correspondiente — no inventes ni asumas que una foto
muestra algo distinto a esto):
${listaFotos}

La última lámina no lleva foto (es un cierre de marca con el logo).

Tarea:
1. Portada (usa la foto 1): eyebrow corto en mayúsculas + titular evocador (hasta 6 palabras) +
   subtítulo de una línea, todo anclado en lo que la foto 1 muestra.
2. Una línea corta (hasta 12 palabras) por cada foto RESTANTE (${descripciones.length - 1} en total,
   en el mismo orden), que sume algo nuevo a la portada, no la repita.
3. Cierre: titular corto (la invitación a contactar) + texto para el botón CTA.
4. Caption de Instagram que complementa el carrusel (no lo repite), cálido y aspiracional, con 2 a 4
   hashtags relevantes al final (todo en minúsculas y sin espacios ni separadores dentro de cada
   hashtag, ej. #paradarobles).

${REGLA_GANCHO} (aplica al titular de portada y a la primera línea del caption).

Devolvé SOLO un objeto JSON válido (sin texto extra, sin bloque de markdown) con esta forma exacta:
{
  "caption": "...",
  "portada": {"eyebrow": "...", "titulo": "...", "subtitulo": "..."},
  "slides": ["línea corta para la foto 2", "línea corta para la foto 3", "..."],
  "cierre": {"titulo": "...", "cta": "..."}
}`.trim();

  // El presupuesto escala con la cantidad de fotos (hasta 6 en el pool más grande):
  // una lámina de contenido más significa más JSON que generar antes de cerrarlo.
  const data = await pedirJSON(prompt, 1400 + descripciones.length * 200);
  if(!data.caption || !data.portada || !data.portada.titulo || !Array.isArray(data.slides) || data.slides.length !== descripciones.length - 1 || !data.cierre || !data.cierre.titulo){
    throw new Error('La respuesta de Claude no tiene la forma esperada para el carrusel de espacio.');
  }
  data.caption = asegurarHashtags(data.caption, cuenta.hashtagsBase);
  return data;
}

module.exports = { generarTexto, generarTextoCarrusel, generarTextoFichaProducto, generarTextoInstitucional, generarTextoVideoProducto, generarTextoEspacio, generarTextoEspacioCarrusel };
