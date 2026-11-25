// @ts-check
// Fase 4: filtros y armado de negocios a partir de resultados de Google Places (API New).
// Funciones puras, compartidas por el script del generador (Bun) y, si hace falta, el panel.
import { normalizarTelefono } from './phone.js';
import { normalizarTexto, slugify } from './importar.js';

/** Campos pedidos a Places Text Search (cuantos menos, más barato). */
export const FIELD_MASK = [
  'places.id', 'places.displayName', 'places.formattedAddress', 'places.addressComponents', 'places.location',
  'places.nationalPhoneNumber', 'places.internationalPhoneNumber', 'places.rating', 'places.userRatingCount',
  'places.websiteUri', 'places.googleMapsUri', 'places.types', 'places.businessStatus', 'places.reviews', 'nextPageToken',
].join(',');

/** @param {{lat:number,lng:number}} a @param {{lat:number,lng:number}} b */
export function distanciaKm(a, b) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Nombre único de una entrada de ciudades.json (las ciudades grandes se parten en zonas). @param {any} ciudad */
export function claveCiudad(ciudad) {
  return ciudad.zona ? `${ciudad.nombre} · ${ciudad.zona}` : ciudad.nombre;
}

/** Textos de búsqueda para una ciudad (la zona solo cambia el centro de la búsqueda, no el texto). @param {any} rubro @param {any} ciudad */
export function consultasPara(rubro, ciudad) {
  return (rubro.busquedas || []).map((b) => b.replace('{ciudad}', ciudad.nombre));
}

/** @param {any} place @param {string} tipo */
function componente(place, tipo) {
  return (place.addressComponents || []).find((c) => (c.types || []).includes(tipo))?.longText || '';
}

/**
 * ¿Pasa los filtros del rubro? Devuelve null si pasa, o el motivo por el que se descarta.
 * @param {any} place @param {any} rubro @param {any} ciudad
 * @returns {string | null}
 */
export function motivoExclusion(place, rubro, ciudad) {
  const tipos = place.types || [];
  if (place.businessStatus && place.businessStatus !== 'OPERATIONAL') return 'cerrado';
  if ((rubro.tiposIncluidos || []).length && !tipos.some((t) => rubro.tiposIncluidos.includes(t))) return 'tipo no incluido';
  if (tipos.some((t) => (rubro.tiposExcluidos || []).includes(t))) return 'tipo excluido';
  const nombre = normalizarTexto(place.displayName?.text || '');
  const palabra = (rubro.palabrasExcluidas || []).find((p) => nombre.includes(normalizarTexto(p)));
  if (palabra) return `palabra excluida (${palabra})`;
  if ((place.userRatingCount || 0) < (rubro.minResenas || 0)) return 'pocas reseñas';
  if (place.location && ciudad.lat != null) {
    const d = distanciaKm({ lat: ciudad.lat, lng: ciudad.lng }, { lat: place.location.latitude, lng: place.location.longitude });
    if (d > (ciudad.radioKm || 15) * 1.5) return 'fuera del radio';
  }
  return null;
}

/** Hasta 5 reseñas sin autor: solo texto y rating (regla 4). @param {any} place */
export function resenasSinAutor(place) {
  return (place.reviews || []).slice(0, 5)
    .map((r) => ({ rating: r.rating ?? null, texto: (r.originalText?.text || r.text?.text || '').slice(0, 1200) }))
    .filter((r) => r.texto);
}

/**
 * Negocio nuevo a partir de un place (sin análisis; se agrega después).
 * @param {any} place @param {any} ciudad @param {any} rubro @param {'A'|'B'} variante
 */
export function placeANegocio(place, ciudad, rubro, variante) {
  const nombre = place.displayName?.text || '';
  const ciudadReal = componente(place, 'locality') || ciudad.nombre;
  const provincia = componente(place, 'administrative_area_level_1') || ciudad.provincia || '';
  const telefono = place.nationalPhoneNumber || place.internationalPhoneNumber || null;
  const tel = normalizarTelefono(place.internationalPhoneNumber || place.nationalPhoneNumber);
  return {
    id: place.id,
    placeId: place.id,
    rubro: rubro.id,
    slug: slugify(nombre),
    nombre,
    ciudad: ciudadReal,
    provincia,
    direccion: place.formattedAddress || '',
    telefono, ...tel,
    web: place.websiteUri || '',
    mapsUrl: place.googleMapsUri || '',
    rating: place.rating ?? null,
    cantResenas: place.userRatingCount ?? null,
    tipos: place.types || [],
    prioridad: 'B',
    gancho: '',
    ganchoCorto: '',
    estado: 'sin_contactar',
    paso: 0,
    proximoToque: null,
    primerContacto: null,
    variante,
    canal: tel.esCelularProbable ? 'whatsapp' : 'llamada',
    noContactar: false,
    ola: ciudad.ola ?? null,
    origen: 'places',
  };
}

/** Datos de contacto a refrescar si tienen más de 30 días (regla 3). Nunca toca estado, notas ni eventos. @param {any} place */
export function datosRefrescables(place) {
  const tel = normalizarTelefono(place.internationalPhoneNumber || place.nationalPhoneNumber);
  return {
    direccion: place.formattedAddress || '',
    telefono: place.nationalPhoneNumber || place.internationalPhoneNumber || null,
    ...tel,
    web: place.websiteUri || '',
    mapsUrl: place.googleMapsUri || '',
    rating: place.rating ?? null,
    cantResenas: place.userRatingCount ?? null,
    tipos: place.types || [],
  };
}

/** Recorta a N palabras. @param {string} s @param {number} n */
export function recortarPalabras(s, n) {
  const p = String(s || '').trim().split(/\s+/).filter(Boolean);
  return p.length <= n ? p.join(' ') : p.slice(0, n).join(' ');
}
