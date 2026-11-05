'use strict';
/* ===================== FICHA PÚBLICA DEL AUTO (lo que ve quien escanea el sticker) ===================== */
// Lo usan la app (para la vista previa y el QR de pantalla) y ficha.html (la página pública), así las
// dos muestran exactamente lo mismo. A propósito NO incluye precios, nombre ni teléfono del cliente:
// solo el auto, sus trabajos con fecha y km, y cuándo le toca volver.
//
// En la instalación real ficha.html lee estos datos de la base del taller (Firestore) con el código
// del sticker. En la demo, como todo vive en el navegador, el QR que se muestra en pantalla lleva la
// ficha adentro (comprimida en el link) para que se pueda probar escaneando con cualquier celular.

function fichaAddMonths(iso, n){
  const d = new Date(iso + 'T00:00:00');
  d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0,10);
}
function fichaKmNum(km){
  const n = parseInt(String(km == null ? '' : km).replace(/\D/g,''), 10);
  return isNaN(n) || n <= 0 ? null : n;
}
const FICHA_RE_SERVICE = /service|aceite|filtro/i;
const FICHA_RE_CORREA = /distribuci[oó]n/i;

function construirFicha(datos, vehiculoId, numero){
  const v = (datos.vehiculos || []).find(x => x.id === vehiculoId);
  if(!v) return null;
  const neg = datos.negocio || {};
  const texto = (t) => (t.trabajosRealizados || []).join(' ');
  const ts = (datos.trabajos || []).filter(t => t.vehiculoId === vehiculoId)
    .sort((a,b) => (b.fecha || '').localeCompare(a.fecha || ''));
  const ings = (datos.ingresos || []).filter(i => i.vehiculoId === vehiculoId)
    .sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));
  const service = ts.find(t => FICHA_RE_SERVICE.test(texto(t))) || ts[0];
  const correa = ts.find(t => FICHA_RE_CORREA.test(texto(t)));
  let km = ts.length ? fichaKmNum(ts[0].km) : null;
  if(km == null && ings[0]) km = fichaKmNum(ings[0].km);
  return {
    t: neg.nombre || 'Tu Taller', w: neg.telefono || '', n: numero || '',
    v: `${v.marca || ''} ${v.modelo || ''}`.trim(), a: v.anio || '', p: (v.patente || '').toUpperCase(),
    us: service ? service.fecha : null,
    sk: service ? fichaKmNum(service.km) : null,
    km,
    ps: service ? fichaAddMonths(service.fecha, neg.intervaloServicioMeses || 6) : null,
    co: correa ? fichaAddMonths(correa.fecha, neg.intervaloCorreaMeses || 48) : null,
    h: ts.slice(0,4).map(t => [t.fecha, (t.trabajosRealizados || [])[0] ? String(t.trabajosRealizados[0]).slice(0,48) : '', fichaKmNum(t.km)])
  };
}

/* La ficha viaja en el link como JSON en base64 "url-safe" (sin + / =), para que el QR no se rompa. */
function fichaCodificar(f){
  const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(f))));
  return b64.replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function fichaDecodificar(s){
  try{
    let b64 = String(s || '').replace(/-/g,'+').replace(/_/g,'/');
    while(b64.length % 4) b64 += '=';
    return JSON.parse(decodeURIComponent(escape(atob(b64))));
  }catch(e){ return null; }
}

const FICHA_MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
function fichaFecha(iso){
  if(!iso) return '—';
  const [y,m,d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
function fichaMesAnio(iso){
  if(!iso) return '—';
  const [y,m] = iso.split('-').map(Number);
  const mes = FICHA_MESES[m-1];
  return mes.charAt(0).toUpperCase() + mes.slice(1) + ' ' + y;
}
function fichaKm(n){ return n == null ? '—' : n.toLocaleString('es-AR') + ' km'; }
