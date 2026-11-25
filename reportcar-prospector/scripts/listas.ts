// Fase 4 — Generador de listas: Google Places → filtros del rubro → análisis con Claude → Firestore.
//
//   bun run scripts/listas.ts --ciudad "Neuquén" [--dry-run] [--limit 10] [--force]
//   bun run scripts/listas.ts --ola 1
//   bun run scripts/listas.ts --auto        (corre la próxima ciudad solo si quedan pocos sin contactar)
//
// Variables: GOOGLE_PLACES_API_KEY, ANTHROPIC_API_KEY, FIREBASE_SERVICE_ACCOUNT_JSON,
//            ANTHROPIC_MODEL_ANALISIS (default claude-haiku-5-5).
// --dry-run: consulta Places (para ver cuántos pasan los filtros y cuánto cuesta) pero no llama a Claude ni escribe.

import { parseArgs } from 'node:util';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp, type Firestore } from 'firebase-admin/firestore';
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import {
  FIELD_MASK, consultasPara, motivoExclusion, resenasSinAutor, placeANegocio, datosRefrescables, recortarPalabras,
} from '../panel/lib/generador.js';
import { claveNombreCiudad } from '../panel/lib/importar.js';

const { values: args } = parseArgs({
  options: {
    rubro: { type: 'string', default: 'talleres' },
    ciudad: { type: 'string' },
    ola: { type: 'string' },
    auto: { type: 'boolean', default: false },
    'dry-run': { type: 'boolean', default: false },
    limit: { type: 'string' },
    force: { type: 'boolean', default: false },
  },
});
const DRY = args['dry-run'];
const LIMIT = args.limit ? parseInt(args.limit, 10) : Infinity;
const MODELO = process.env.ANTHROPIC_MODEL_ANALISIS || 'claude-haiku-5-5';
const DIAS_REFRESCO = 30;
const UMBRAL_DEFAULT = 25;

type Ciudad = { nombre: string; provincia: string; ola: number; lat: number; lng: number; radioKm: number };

const costos = { placesRequests: 0, tokensIn: 0, tokensOut: 0, llamadasClaude: 0 };

// ───────────────────────── Firestore ─────────────────────────
function conectarFirestore(): Firestore | null {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) return null;
  initializeApp({ credential: cert(JSON.parse(json)) });
  return getFirestore();
}

async function cargarRubro(db: Firestore | null, id: string) {
  if (db) {
    const s = await db.doc(`rubros/${id}`).get();
    if (s.exists) return s.data()!;
  }
  return Bun.file(new URL(`../panel/rubros/${id}.json`, import.meta.url)).json();
}

async function cargarExistentes(db: Firestore | null, rubro: string) {
  if (!db) return [] as any[];
  const s = await db.collection('negocios').where('rubro', '==', rubro).get();
  return s.docs.map((d) => ({ ...d.data(), id: d.id })) as any[];
}

// ───────────────────────── Google Places ─────────────────────────
async function buscarPlaces(texto: string, ciudad: Ciudad): Promise<any[]> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) throw new Error('Falta GOOGLE_PLACES_API_KEY');
  const out: any[] = [];
  let pageToken: string | undefined;
  for (let pagina = 0; pagina < 3; pagina++) {
    const body: Record<string, unknown> = {
      textQuery: texto, languageCode: 'es', regionCode: 'AR', pageSize: 20,
      locationBias: { circle: { center: { latitude: ciudad.lat, longitude: ciudad.lng }, radius: Math.min(ciudad.radioKm * 1000, 50000) } },
    };
    if (pageToken) body.pageToken = pageToken;
    const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': FIELD_MASK },
      body: JSON.stringify(body),
    });
    costos.placesRequests++;
    if (!r.ok) throw new Error(`Places ${r.status}: ${await r.text()}`);
    const data: any = await r.json();
    out.push(...(data.places || []));
    pageToken = data.nextPageToken;
    if (!pageToken) break;
    await Bun.sleep(1500); // el token de página tarda un momento en activarse
  }
  return out;
}

// ───────────────────────── Análisis con Claude ─────────────────────────
const AnalisisSchema = z.object({
  prioridad: z.enum(['A', 'B', 'C']),
  score: z.number().describe('0 a 100: qué tan buen prospecto es'),
  tamanoEstimado: z.enum(['chico', 'mediano', 'grande']),
  senalesRecompra: z.array(z.string()),
  senalesEntrega: z.array(z.string()),
  dolores: z.array(z.string()),
  yaHaceManual: z.array(z.string()),
  varianteSugerida: z.enum(['A', 'B']),
  gancho: z.string(),
  ganchoCorto: z.string(),
  alertas: z.array(z.string()),
});
type Analisis = z.infer<typeof AnalisisSchema>;

let anthropic: Anthropic | null = null;

function consigna(rubro: any) {
  return `Sos analista comercial de ${rubro.marca}. Vendemos a ${rubro.nombre || rubro.id} un sistema propio con pago único, sin abono mensual.
La versión base incluye: ${(rubro.producto?.base || []).join('; ')}.
Señales que nos interesan (orientativas, no son una lista cerrada): ${JSON.stringify(rubro.senales || {})}

Con los datos y reseñas de este negocio devolvé SOLO el JSON pedido:
- tamanoEstimado: por volumen de reseñas y menciones de equipo, recepción, turnos, grúa.
- senalesRecompra / senalesEntrega / dolores / yaHaceManual: solo con evidencia en las reseñas (frase corta parafraseada). Nunca inventes; si no hay evidencia, dejá la lista vacía.
- varianteSugerida: "A" si hay señales de clientes que vuelven o de avisos; "B" si es un negocio grande que probablemente ya paga o evalúa un sistema.
- gancho: 1 o 2 frases concretas para que el vendedor entienda a quién le habla.
- ganchoCorto: máximo 10 palabras, elogio o dato verificable para incluir en el primer mensaje (ej. "391 reseñas, impresionante"). Que se lea bien después de "Vi {nombre} en Maps," y no repita el nombre.
- prioridad A = mediano/grande con señales claras; B = mediano sin señales fuertes; C = chico o con alertas.
- score: número de 0 a 100.
- alertas: cosas que lo hacen mal prospecto (cadena, concesionario, cerrado, muchas quejas graves, etc.).
No incluyas nombres de clientes ni de personas.`;
}

async function analizar(place: any, negocio: any, rubro: any): Promise<Analisis> {
  anthropic ??= new Anthropic();
  const datos = {
    nombre: negocio.nombre, ciudad: negocio.ciudad, rating: negocio.rating, cantidadResenas: negocio.cantResenas,
    tipos: negocio.tipos, resenas: resenasSinAutor(place),
  };
  let ultimoError: unknown;
  for (let intento = 0; intento < 2; intento++) {
    try {
      const resp = await anthropic.messages.parse({
        model: MODELO,
        max_tokens: 2000,
        system: consigna(rubro),
        messages: [{ role: 'user', content: JSON.stringify(datos) }],
        output_config: { format: zodOutputFormat(AnalisisSchema), effort: 'low' },
      });
      costos.llamadasClaude++;
      costos.tokensIn += resp.usage.input_tokens;
      costos.tokensOut += resp.usage.output_tokens;
      if (resp.stop_reason === 'refusal') throw new Error('Claude rechazó el pedido');
      if (!resp.parsed_output) throw new Error('Respuesta sin JSON válido');
      const a = resp.parsed_output;
      return { ...a, ganchoCorto: recortarPalabras(a.ganchoCorto, 10), score: Math.max(0, Math.min(100, Math.round(a.score))) };
    } catch (e) {
      ultimoError = e;
      if (e instanceof Anthropic.RateLimitError) await Bun.sleep(20000);
    }
  }
  throw ultimoError;
}

// ───────────────────────── Una ciudad ─────────────────────────
async function correrCiudad(db: Firestore | null, rubro: any, ciudad: Ciudad, existentes: any[]) {
  console.log(`\n=== ${ciudad.nombre} (${ciudad.provincia}) — ola ${ciudad.ola} ===`);
  const porId = new Map(existentes.map((n) => [n.placeId || n.id, n]));
  const claves = new Set(existentes.map((n) => claveNombreCiudad(n.nombre, n.ciudad)));

  const places = new Map<string, any>();
  for (const q of consultasPara(rubro, ciudad)) {
    const res = await buscarPlaces(q, ciudad);
    console.log(`  "${q}": ${res.length} resultados`);
    for (const p of res) if (!places.has(p.id)) places.set(p.id, p);
  }

  const descartes: Record<string, number> = {};
  const nuevos: { place: any }[] = [];
  const existentesEncontrados: { place: any; negocio: any }[] = [];
  for (const place of places.values()) {
    const ya = porId.get(place.id);
    if (ya) { existentesEncontrados.push({ place, negocio: ya }); continue; }
    const motivo = motivoExclusion(place, rubro, ciudad);
    if (motivo) { descartes[motivo] = (descartes[motivo] || 0) + 1; continue; }
    nuevos.push({ place });
  }
  console.log(`  Únicos: ${places.size} · ya en la base: ${existentesEncontrados.length} · pasan filtros: ${nuevos.length}`);
  console.log(`  Descartados: ${JSON.stringify(descartes)}`);

  // Variante alternada, para que la comparación A/B quede pareja.
  const cuenta = { A: 0, B: 0 };
  for (const n of existentes) if (n.variante === 'A' || n.variante === 'B') cuenta[n.variante as 'A' | 'B']++;
  const proximaVariante = (): 'A' | 'B' => { const v = cuenta.A <= cuenta.B ? 'A' : 'B'; cuenta[v]++; return v; };

  const hoy = Timestamp.now();
  let agregados = 0, duplicadosNombre = 0, errores = 0;
  for (const { place } of nuevos.slice(0, LIMIT)) {
    const negocio = placeANegocio(place, ciudad, rubro, 'A');
    const clave = claveNombreCiudad(negocio.nombre, negocio.ciudad);
    if (claves.has(clave)) { duplicadosNombre++; continue; } // ya importado de la planilla con otro id
    negocio.variante = proximaVariante();
    if (DRY) {
      console.log(`  + ${negocio.nombre} · ${negocio.ciudad} · ${negocio.cantResenas} reseñas · ★${negocio.rating} · ${negocio.canal}`);
      agregados++; claves.add(clave);
      continue;
    }
    try {
      const analisis = await analizar(place, negocio, rubro);
      const { id, ...datos } = negocio;
      const ref = db!.collection('negocios').doc(id);
      await ref.create({
        ...datos, analisis, prioridad: analisis.prioridad, gancho: analisis.gancho, ganchoCorto: analisis.ganchoCorto,
        datosPlacesFecha: hoy, creado: FieldValue.serverTimestamp(), actualizado: FieldValue.serverTimestamp(),
      });
      await ref.collection('eventos').add({ tipo: 'nota', texto: `Alta (generador · ${ciudad.nombre})`, fecha: FieldValue.serverTimestamp(), usuario: 'generador' });
      console.log(`  + ${negocio.nombre} · ${analisis.prioridad} (${analisis.score}) · ${analisis.ganchoCorto}`);
      agregados++; claves.add(clave);
    } catch (e: any) {
      if (e?.code === 6) { duplicadosNombre++; continue; } // ALREADY_EXISTS
      errores++;
      console.error(`  ! ${negocio.nombre}: ${e?.message || e}`);
    }
  }

  // Existentes que volvieron a aparecer: refrescar datos de Maps viejos (regla 3) y, con --force, re-analizar.
  let refrescados = 0, reanalizados = 0;
  if (!DRY && db) {
    const limite = Date.now() - DIAS_REFRESCO * 86400000;
    for (const { place, negocio } of existentesEncontrados) {
      const patch: Record<string, unknown> = {};
      const fecha = negocio.datosPlacesFecha?.toMillis?.() ?? 0;
      if (negocio.origen === 'places' && fecha < limite) { Object.assign(patch, datosRefrescables(place), { datosPlacesFecha: hoy }); refrescados++; }
      if (args.force && !negocio.noContactar) {
        try {
          const analisis = await analizar(place, { ...negocio, ...datosRefrescables(place) }, rubro);
          Object.assign(patch, { analisis, gancho: analisis.gancho, ganchoCorto: analisis.ganchoCorto });
          if (negocio.estado === 'sin_contactar') patch.prioridad = analisis.prioridad;
          reanalizados++;
        } catch (e: any) { errores++; console.error(`  ! ${negocio.nombre}: ${e?.message || e}`); }
      }
      if (Object.keys(patch).length) await db.doc(`negocios/${negocio.id}`).update({ ...patch, actualizado: FieldValue.serverTimestamp() });
    }
  }

  console.log(`  ${DRY ? 'Se agregarían' : 'Agregados'}: ${agregados} · ya importados por nombre: ${duplicadosNombre} · refrescados: ${refrescados} · re-analizados: ${reanalizados} · errores: ${errores}`);
  if (db && !DRY) {
    await db.doc(`generador/${rubro.id}`).set({
      ciudades: { [ciudad.nombre]: { fecha: FieldValue.serverTimestamp(), agregados, encontrados: places.size, pasanFiltros: nuevos.length } },
      ultimaCorrida: FieldValue.serverTimestamp(),
    }, { merge: true });
  }
  return agregados;
}

// ───────────────────────── Main ─────────────────────────
async function main() {
  const db = conectarFirestore();
  if (!db && !DRY) throw new Error('Falta FIREBASE_SERVICE_ACCOUNT_JSON (o usá --dry-run)');
  if (!db) console.log('(Sin Firestore: no se cruzan duplicados con la base)');

  const rubro = await cargarRubro(db, args.rubro!);
  const ciudades: Ciudad[] = await Bun.file(new URL('../data/ciudades.json', import.meta.url)).json();
  let existentes = await cargarExistentes(db, rubro.id);

  let elegidas: Ciudad[] = [];
  if (args.ciudad) {
    const c = ciudades.find((c) => c.nombre.toLowerCase() === args.ciudad!.toLowerCase());
    if (!c) throw new Error(`"${args.ciudad}" no está en data/ciudades.json`);
    elegidas = [c];
  } else if (args.ola) {
    elegidas = ciudades.filter((c) => String(c.ola) === args.ola);
  } else if (args.auto) {
    const cfg = db ? (await db.doc('config/general').get()).data() || {} : {};
    const umbral = cfg.umbralGenerador ?? UMBRAL_DEFAULT;
    const quedan = existentes.filter((n) => n.estado === 'sin_contactar' && !n.noContactar).length;
    console.log(`Quedan ${quedan} sin contactar (umbral ${umbral}).`);
    if (quedan >= umbral) { console.log('No hace falta buscar más por ahora.'); return; }
    const hechas = db ? ((await db.doc(`generador/${rubro.id}`).get()).data()?.ciudades || {}) : {};
    const proxima = [...ciudades].sort((a, b) => a.ola - b.ola).find((c) => !hechas[c.nombre]);
    if (!proxima) { console.log('Ya se recorrieron todas las ciudades de data/ciudades.json: sumá ciudades nuevas.'); return; }
    elegidas = [proxima];
  } else {
    throw new Error('Indicá --ciudad, --ola o --auto');
  }

  let total = 0;
  for (const c of elegidas) {
    total += await correrCiudad(db, rubro, c, existentes);
    if (!DRY) existentes = await cargarExistentes(db, rubro.id);
  }

  const costoClaude = (costos.tokensIn * 0.1 + costos.tokensOut * 0.5) / 1e6; // precios de Haiku 5.5 por millón
  console.log(`\nTotal ${DRY ? 'que se agregarían' : 'agregados'}: ${total}`);
  console.log(`Places: ${costos.placesRequests} consultas · Claude (${MODELO}): ${costos.llamadasClaude} llamadas, ${costos.tokensIn} tokens de entrada, ${costos.tokensOut} de salida (≈ US$ ${costoClaude.toFixed(3)} si es Haiku 5.5)`);
}

main().catch((e) => { console.error(e?.message || e); process.exit(1); });
