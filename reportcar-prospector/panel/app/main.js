import { crearStore } from './store.js';
import { hoyAR, fechaCorta, sumarDias } from '../lib/fechas.js';
import { normalizarTelefono } from '../lib/phone.js';
import { mensajeParaContacto, linkWhatsApp, renderPlantilla } from '../lib/plantillas.js';
import { csvAObjetos, aCSV } from '../lib/csv.js';
import {
  embudo, embudoPor, canalOrigen, objecionesTop, contactosPorDia, inicioVentana, lecturaReferencia, REFERENCIA_RESPUESTA,
} from '../lib/metricas.js';
import { planificarImportacion, negociosAFilasPlanilla, COLUMNAS_EXPORT, slugify, claveNombreCiudad } from '../lib/importar.js';
import {
  armarHoy, marcarContacto, marcarRespondio, marcarDescartado, posponer, sinWhatsApp, cambiarEstado,
  puedeReactivar, reactivar, ESTADOS, ESTADO_LABEL, TOTAL_CONTACTOS,
} from '../lib/secuencia.js';

const $ = (s, el = document) => el.querySelector(s);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const vista = $('#vista');

const S = {
  store: null, user: null, config: null, rubro: null,
  negocios: [], borradores: {}, guionAbierto: new Set(),
  filtros: { q: '', estado: '', ciudad: '', provincia: '', prioridad: '', variante: '', ola: '' },
  vistaLista: localStorage.getItem('prospector:vistaLista') || 'lista',
  importPlan: null,
};
const porId = (id) => S.negocios.find((n) => n.id === id);
const CANAL_LABEL = { whatsapp: 'WhatsApp', llamada: 'Llamada', instagram: 'Instagram', visita: 'Visita' };

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), 2600);
}

/** Guarda el cambio en la base y en la copia local. */
async function aplicar(id, { patch, evento }) {
  await S.store.actualizar(id, patch, evento);
  const n = porId(id);
  Object.assign(n, patch, { actualizado: new Date() });
}

/** Diálogo simple: devuelve los valores del form o null si se cancela. */
function dialogo(html) {
  const dlg = $('#dlg'), form = $('#dlg-form');
  form.innerHTML = html;
  return new Promise((resolve) => {
    const cerrar = () => {
      dlg.removeEventListener('close', cerrar);
      if (dlg.returnValue === 'ok' || (dlg.returnValue && dlg.returnValue !== 'cancelar')) {
        const datos = Object.fromEntries(new FormData(form));
        datos._boton = dlg.returnValue;
        resolve(datos);
      } else resolve(null);
    };
    dlg.returnValue = '';
    dlg.addEventListener('close', cerrar);
    dlg.showModal();
  });
}

// ───────────────────────── Arranque y sesión ─────────────────────────
async function iniciar() {
  S.store = await crearStore();
  if (!S.store) {
    vista.innerHTML = `<div class="centro"><h1>Falta configurar Firebase</h1>
      <p class="tenue">Completá <span class="mono">app/firebase-config.js</span> con los datos del proyecto.</p>
      <p><a class="btn primario" href="?demo">Probar en modo demo</a></p></div>`;
    return;
  }
  if (S.store.modo === 'demo') $('#modo').textContent = 'MODO DEMO';
  S.store.onUsuario(async (user, autorizado) => {
    S.user = user;
    if (!user) return pantallaLogin();
    if (!autorizado) return pantallaSinPermiso(user);
    vista.innerHTML = '<p class="cargando">Cargando negocios…</p>';
    try {
      S.config = await S.store.cargarConfig();
      S.rubro = await S.store.cargarRubro(S.config.rubroActivo);
      S.negocios = await S.store.listarNegocios(S.rubro.id);
    } catch (e) {
      console.error(e);
      vista.innerHTML = `<div class="centro"><h2>No se pudieron cargar los datos</h2><p class="tenue">${esc(e.message)}</p></div>`;
      return;
    }
    $('#tabs').hidden = false;
    if (!location.hash) location.hash = '#/hoy'; else render();
  });
}

function pantallaLogin() {
  $('#tabs').hidden = true;
  vista.innerHTML = `<div class="centro"><h1>Prospección</h1><p class="tenue">Entrá con tu cuenta de Google.</p>
    <button class="primario" id="btn-login">Entrar con Google</button></div>`;
  $('#btn-login').onclick = () => S.store.login().catch((e) => toast(e.message));
}

function pantallaSinPermiso(user) {
  $('#tabs').hidden = true;
  vista.innerHTML = `<div class="centro"><h2>Tu usuario no tiene acceso todavía</h2>
    <p class="tenue">En la consola de Firebase → Firestore, creá el documento <span class="mono">usuarios/${esc(user.uid)}</span>
    con el campo <span class="mono">rol: "admin"</span> y recargá.</p>
    <p class="mono chico">${esc(user.email)}</p>
    <button id="btn-copiar">Copiar UID</button> <button id="btn-salir">Salir</button></div>`;
  $('#btn-copiar').onclick = () => navigator.clipboard.writeText(user.uid).then(() => toast('UID copiado'));
  $('#btn-salir').onclick = () => S.store.logout();
}

// ───────────────────────── Router ─────────────────────────
function render() {
  if (!S.rubro) return;
  const [, ruta = 'hoy', arg] = location.hash.split('/');
  const tab = { n: 'lista', nuevo: 'lista', plantillas: 'mas' }[ruta] || ruta;
  document.querySelectorAll('#tabs a').forEach((a) => a.classList.toggle('activa', a.dataset.tab === tab));
  if (ruta === 'lista') return renderLista();
  if (ruta === 'n' && arg) return renderFicha(decodeURIComponent(arg));
  if (ruta === 'nuevo') return renderAlta();
  if (ruta === 'mas') return renderMas();
  if (ruta === 'metricas') return renderMetricas();
  if (ruta === 'plantillas') return renderPlantillas();
  return renderHoy();
}
window.addEventListener('hashchange', () => { window.scrollTo(0, 0); render(); });

// ───────────────────────── Hoy ─────────────────────────
function renderHoy() {
  const hoy = hoyAR();
  const { items, contador: c } = armarHoy(S.negocios, { hoy, maxContactosDia: S.config.maxContactosDia });
  const partes = [`${c.seguimientos} seguimiento${c.seguimientos === 1 ? '' : 's'}`, `${c.llamadas} llamada${c.llamadas === 1 ? '' : 's'}`, `${c.nuevos} nuevo${c.nuevos === 1 ? '' : 's'}`];
  let vacio = '';
  if (!items.length) {
    vacio = c.sinContactarRestantes
      ? `<div class="vacio">Ya hiciste los ${S.config.maxContactosDia} primeros contactos de hoy. 💪</div>`
      : `<div class="vacio">Se terminó la lista: no quedan negocios sin contactar.<br>Importá más o corré el generador para una ciudad nueva.</div>`;
  }
  vista.innerHTML = `
    <div class="contador">
      <div class="linea"><b>Hoy:</b> ${partes.join(', ')}${c.atrasados ? ` <span class="atras">(${c.atrasados} atrasado${c.atrasados === 1 ? '' : 's'})</span>` : ''}</div>
      <div class="tenue chico">Primeros contactos hoy: ${c.primerosHechosHoy}/${S.config.maxContactosDia} · Quedan ${c.sinContactarRestantes} sin contactar</div>
    </div>
    ${items.map((it) => cardHoy(it, hoy)).join('')}${vacio}`;
}

function cardHoy({ n, tipo, contacto, canal }, hoy) {
  const { texto, fuente } = mensajeParaContacto(n, contacto, S.rubro);
  const borrador = S.borradores[n.id] ?? texto;
  const esLlamada = canal === 'llamada';
  const guion = mensajeParaContacto(n, 3, S.rubro).texto;
  const avisoFijo = !esLlamada && n.telefonoWa && n.esCelularProbable === false
    ? '<div class="aviso">⚠️ Parece un teléfono fijo: puede no tener WhatsApp.</div>' : '';
  const sinWa = !esLlamada && !n.telefonoWa
    ? `<div class="aviso">Sin número para WhatsApp: llamá${n.instagram ? ' o escribí por Instagram' : ''}.</div>` : '';
  const chipTipo = tipo === 'atrasado' ? `<span class="chip rojo">Atrasado ${fechaCorta(n.proximoToque)}</span>`
    : tipo === 'seguimiento' ? '<span class="chip">Seguimiento</span>' : '<span class="chip verde">Nuevo</span>';
  const tel = n.telefonoWa ? `+${n.telefonoWa}` : n.telefono;
  return `<div class="card ${tipo}" data-id="${esc(n.id)}">
    <div class="cab">
      <div><a class="nombre" href="#/n/${encodeURIComponent(n.id)}">${esc(n.nombre)}</a>
        <div class="meta">${esc(n.ciudad)}${n.cantResenas ? ` · ${n.cantResenas} reseñas` : ''}${n.rating ? ` · ★ ${n.rating}` : ''}</div></div>
      <div class="chips"><span class="chip rust">${esc(n.prioridad)}</span><span class="chip">Var. ${esc(n.variante)}</span>${chipTipo}</div>
    </div>
    ${n.gancho ? `<div class="gancho">${esc(n.gancho)}</div>` : ''}
    <div class="paso">Contacto ${contacto} de ${TOTAL_CONTACTOS} · ${CANAL_LABEL[canal] || canal}${fuente === 'claude' ? ' · mensaje de Claude' : ''}</div>
    ${esLlamada
      ? `<div class="guion">${esc(guion)}</div>`
      : `<textarea data-borrador="${esc(n.id)}">${esc(borrador)}</textarea>${avisoFijo}${sinWa}`}
    <div class="botones">
      ${esLlamada ? '' : `<a class="btn wa grande ${n.telefonoWa ? '' : 'off'}" data-act="wa" href="#" >WhatsApp</a>`}
      ${tel ? `<a class="btn ${esLlamada ? 'primario grande' : ''}" href="tel:${esc(tel)}">Llamar</a>` : ''}
      <button class="primario grande" data-act="hecho">${esLlamada ? 'Llamé' : 'Enviado'}</button>
    </div>
    <div class="botones">
      <button data-act="respondio">Respondió</button>
      ${!esLlamada ? '<button data-act="sinwa">Sin WhatsApp</button>' : ''}
      ${!esLlamada ? `<button data-act="guion">Guion</button>` : ''}
      <button data-act="posponer">Posponer</button>
      <button data-act="descartar">Descartar</button>
    </div>
    ${!esLlamada && S.guionAbierto.has(n.id) ? `<div class="guion">${esc(guion)}</div>` : ''}
  </div>`;
}

vista.addEventListener('input', (e) => {
  const id = e.target.dataset?.borrador;
  if (id) S.borradores[id] = e.target.value;
});

vista.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const card = b.closest('[data-id]');
  const id = card?.dataset.id;
  const n = id && porId(id);
  const act = b.dataset.act;
  if (!n && !['exportar', 'importar-ok', 'guardar-config', 'salir'].includes(act)) return;
  e.preventDefault();
  try {
    await acciones[act]?.(n, card, b);
  } catch (err) {
    console.error(err);
    toast('Error: ' + err.message);
  }
});

const textoDeCard = (card) => card?.querySelector('textarea[data-borrador]')?.value ?? '';

const acciones = {
  async wa(n, card) {
    if (!n.telefonoWa) return;
    window.open(linkWhatsApp(n.telefonoWa, textoDeCard(card)), '_blank');
  },
  guion(n) {
    S.guionAbierto.has(n.id) ? S.guionAbierto.delete(n.id) : S.guionAbierto.add(n.id);
    render();
  },
  async hecho(n, card) {
    const texto = textoDeCard(card);
    const r = marcarContacto(n, S.rubro.cadenciaDias, hoyAR(), texto);
    if (r.evento.canal !== 'llamada') {
      // Para comparar después plantilla contra Claude (Fase 5) y saber cuánto se retoca.
      const { texto: original, fuente } = mensajeParaContacto(n, r.evento.paso, S.rubro);
      Object.assign(r.evento, { mensaje: fuente, editado: texto.trim() !== original.trim() });
    }
    await aplicar(n.id, r);
    delete S.borradores[n.id];
    toast(n.proximoToque ? `Listo. Próximo toque: ${fechaCorta(n.proximoToque)}` : 'Listo. Secuencia terminada.');
    render();
  },
  async respondio(n) {
    const d = await dialogo(`<h2>Respondió: ${esc(n.nombre)}</h2>
      <label>¿Qué dijo?</label><textarea name="texto" required></textarea>
      <label>Objeción (si hubo)</label><input name="objecion" list="objeciones" placeholder="Ej.: ya tengo sistema, no tengo tiempo…">
      <datalist id="objeciones">${objecionesUsadas().map((o) => `<option value="${esc(o)}">`).join('')}</datalist>
      <div class="botones"><button value="cancelar" formnovalidate>Cancelar</button><button class="primario grande" value="ok">Guardar</button></div>`);
    if (!d) return;
    await aplicar(n.id, marcarRespondio(d.texto, d.objecion?.trim()));
    toast('Marcado como Respondió'); render();
  },
  async sinwa(n) {
    await aplicar(n.id, sinWhatsApp());
    toast('Pasa a llamada'); render();
  },
  async posponer(n) {
    const d = await dialogo(`<h2>Posponer ${esc(n.nombre)}</h2>
      <div class="botones"><button value="manana" class="grande">A mañana</button><button value="lunes" class="grande">Al lunes</button></div>
      <div class="botones"><button value="cancelar" class="link">Cancelar</button></div>`);
    if (!d) return;
    await aplicar(n.id, posponer(d._boton === 'lunes' ? 'lunes' : 'manana', hoyAR()));
    toast(`Pospuesto al ${fechaCorta(n.proximoToque)}`); render();
  },
  async descartar(n) {
    const d = await dialogo(`<h2>Descartar ${esc(n.nombre)}</h2>
      <label>Motivo</label><input name="motivo" placeholder="Ej.: es concesionario, cerró, no le interesa">
      <label class="check"><input type="checkbox" name="noContactar"> Pidió no ser contactado (no vuelve a aparecer nunca)</label>
      <div class="botones"><button value="cancelar" formnovalidate>Cancelar</button><button class="primario grande" value="ok">Descartar</button></div>`);
    if (!d) return;
    await aplicar(n.id, marcarDescartado(d.motivo, !!d.noContactar, n));
    toast('Descartado'); render();
  },
  // Ficha
  async 'estado'(n, card, b) {
    await cambiarEstadoUI(n, b.dataset.estado);
  },
  // Pipeline: tocar una tarjeta abre el cambio de estado.
  async 'mover'(n) {
    const d = await dialogo(`<h2>${esc(n.nombre)}</h2>
      <p class="tenue chico">${esc(n.ciudad)} · ahora: ${ESTADO_LABEL[n.estado]}</p>
      <div class="opciones-estado">${ESTADOS.filter((e) => e !== n.estado).map((e) => `<button value="${e}">${ESTADO_LABEL[e]}</button>`).join('')}</div>
      <div class="botones"><button value="ficha" class="primario grande">Abrir ficha</button><button value="cancelar" class="link">Cancelar</button></div>`);
    if (!d) return;
    if (d._boton === 'ficha') { location.hash = `#/n/${encodeURIComponent(n.id)}`; return; }
    await cambiarEstadoUI(n, d._boton);
  },
  async reactivar(n) {
    await aplicar(n.id, reactivar(n, hoyAR()));
    toast('Secuencia reactivada: vuelve a aparecer en Hoy'); render();
  },
  async nota(n) {
    const d = await dialogo(`<h2>Nota</h2><textarea name="texto" required></textarea>
      <div class="botones"><button value="cancelar" formnovalidate>Cancelar</button><button class="primario grande" value="ok">Guardar</button></div>`);
    if (!d) return;
    await aplicar(n.id, { patch: {}, evento: { tipo: 'nota', texto: d.texto } });
    render();
  },
  async 'guardar-ficha'(n, card) {
    const f = Object.fromEntries(new FormData(card.querySelector('form')));
    const patch = {};
    for (const k of ['nombre', 'ciudad', 'provincia', 'direccion', 'instagram', 'web', 'mapsUrl', 'gancho', 'ganchoCorto', 'notas', 'objecion', 'fuente']) {
      if (k in f && (f[k] ?? '') !== (n[k] ?? '')) patch[k] = f[k].trim();
    }
    for (const k of ['prioridad', 'variante', 'canal']) if (f[k] && f[k] !== n[k]) patch[k] = f[k];
    if ((f.telefono ?? '') !== (n.telefono ?? '')) Object.assign(patch, { telefono: f.telefono.trim() || null }, normalizarTelefono(f.telefono));
    if (!Object.keys(patch).length) return toast('Sin cambios');
    await aplicar(n.id, { patch, evento: { tipo: 'nota', texto: 'Editó: ' + Object.keys(patch).filter((k) => !['telefonoWa', 'esCelularProbable'].includes(k)).join(', ') } });
    toast('Guardado'); render();
  },
};
const d_fmt = (s) => (s ? s.replace('T', ' ').split(' ').map((p, i) => (i ? p : fechaCorta(p))).join(' ') : '');

/** Cambio de estado desde la ficha o el pipeline: pide fecha para reunión y motivo para descartar. */
async function cambiarEstadoUI(n, estado) {
  if (!estado || estado === n.estado) return;
  if (estado === 'descartado') return acciones.descartar(n);
  let extra = {};
  if (estado === 'reunion') {
    const d = await dialogo(`<h2>Reunión con ${esc(n.nombre)}</h2>
      <label>Fecha y hora</label><input type="datetime-local" name="cuando" required>
      <div class="botones"><button value="cancelar" formnovalidate>Cancelar</button><button class="primario grande" value="ok">Agendar</button></div>`);
    if (!d) return;
    extra = { reunionFecha: d.cuando, reunionAvisada: false };
  }
  const r = cambiarEstado(n, estado, extra, hoyAR());
  if (estado === 'reunion') r.evento.texto += ` · ${d_fmt(extra.reunionFecha)}`;
  await aplicar(n.id, r);
  toast(ESTADO_LABEL[estado]); render();
}

function objecionesUsadas() {
  const c = {};
  for (const n of S.negocios) if (n.objecion) c[n.objecion] = (c[n.objecion] || 0) + 1;
  return Object.entries(c).sort((a, b) => b[1] - a[1]).map(([o]) => o).slice(0, 15);
}

// ───────────────────────── Lista ─────────────────────────
function renderLista() {
  const f = S.filtros;
  const opciones = (campo) => [...new Set(S.negocios.map((n) => n[campo]).filter(Boolean))].sort();
  const sel = (nombre, label, valores, etiqueta = (v) => v) => `<select data-filtro="${nombre}"><option value="">${label}</option>
    ${valores.map((v) => `<option value="${esc(v)}" ${f[nombre] === v ? 'selected' : ''}>${esc(etiqueta(v))}</option>`).join('')}</select>`;
  const columnas = S.vistaLista === 'columnas';
  const olas = [...new Set(S.negocios.map((n) => n.ola).filter(Boolean))].sort().map(String);
  vista.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:.5rem"><h1>Negocios</h1><a class="btn primario" href="#/nuevo">+ Nuevo</a></div>
    <div class="segmento"><button data-vista="lista" class="${columnas ? '' : 'activo'}">Lista</button><button data-vista="columnas" class="${columnas ? 'activo' : ''}">Columnas</button></div>
    <div class="filtros">
      <input type="search" data-filtro="q" placeholder="Buscar por nombre…" value="${esc(f.q)}">
      ${columnas ? '' : sel('estado', 'Estado', ESTADOS, (v) => ESTADO_LABEL[v])}
      ${sel('provincia', 'Provincia', opciones('provincia'))}
      ${sel('ciudad', 'Ciudad', opciones('ciudad'))}
      ${sel('prioridad', 'Prioridad', ['A', 'B', 'C'])}
      ${sel('variante', 'Variante', ['A', 'B'])}
      ${olas.length ? sel('ola', 'Ola', olas, (v) => `Ola ${v}`) : ''}
    </div>
    <div id="resultados"></div>`;
  pintarResultados();
}

function filtrarNegocios({ ignorarEstado = false } = {}) {
  const f = S.filtros, q = f.q.toLowerCase();
  return S.negocios.filter((n) =>
    (!q || n.nombre.toLowerCase().includes(q)) && (ignorarEstado || !f.estado || n.estado === f.estado) &&
    (!f.ciudad || n.ciudad === f.ciudad) && (!f.provincia || n.provincia === f.provincia) &&
    (!f.prioridad || n.prioridad === f.prioridad) && (!f.variante || n.variante === f.variante) &&
    (!f.ola || String(n.ola || '') === f.ola))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}

const MAX_POR_COLUMNA = 60;

function pintarColumnas() {
  const lista = filtrarNegocios({ ignorarEstado: true });
  const porEstado = Object.fromEntries(ESTADOS.map((e) => [e, []]));
  for (const n of lista) (porEstado[n.estado] || porEstado.sin_contactar).push(n);
  $('#resultados').innerHTML = `<p class="tenue chico">${lista.length} de ${S.negocios.length} · tocá una tarjeta para cambiarla de estado, o arrastrala en la compu</p>
    <div class="pipeline">${ESTADOS.map((e) => {
      const items = porEstado[e];
      return `<section class="columna" data-columna="${e}">
        <h3>${ESTADO_LABEL[e]} <span class="tenue mono">${items.length}</span></h3>
        ${items.slice(0, MAX_POR_COLUMNA).map((n) => `<div class="tarjeta" draggable="true" data-id="${esc(n.id)}" data-act="mover">
          <div class="n">${esc(n.nombre)}</div>
          <div class="tenue chico">${esc(n.ciudad)}${n.proximoToque ? ` · ${fechaCorta(n.proximoToque)}` : ''}${n.reunionFecha && e === 'reunion' ? ` · ${d_fmt(n.reunionFecha)}` : ''}</div>
          <div class="chips"><span class="chip rust">${esc(n.prioridad)}</span><span class="chip">${esc(n.variante || '–')}</span></div>
        </div>`).join('')}
        ${items.length > MAX_POR_COLUMNA ? `<p class="tenue chico">+${items.length - MAX_POR_COLUMNA} más: usá los filtros</p>` : ''}
      </section>`;
    }).join('')}</div>`;
}

function pintarResultados() {
  if (S.vistaLista === 'columnas') return pintarColumnas();
  const lista = filtrarNegocios();
  $('#resultados').innerHTML = `<p class="tenue chico">${lista.length} de ${S.negocios.length}</p>` + lista.map((n) => `
    <a class="fila" href="#/n/${encodeURIComponent(n.id)}">
      <div><div class="n">${esc(n.nombre)}</div><div class="tenue chico">${esc(n.ciudad)} · ${ESTADO_LABEL[n.estado]}${n.proximoToque ? ` · próximo ${fechaCorta(n.proximoToque)}` : ''}${n.noContactar ? ' · no contactar' : ''}</div></div>
      <div class="chips"><span class="chip rust">${esc(n.prioridad)}</span><span class="chip">${esc(n.variante || '–')}</span></div>
    </a>`).join('');
}

vista.addEventListener('input', (e) => {
  const k = e.target.dataset?.filtro;
  if (!k) return;
  S.filtros[k] = e.target.value;
  pintarResultados();
});

vista.addEventListener('click', (e) => {
  const b = e.target.closest('[data-vista]');
  if (!b) return;
  S.vistaLista = b.dataset.vista;
  localStorage.setItem('prospector:vistaLista', S.vistaLista);
  renderLista();
});

// Arrastrar tarjetas entre columnas (mouse; en el celular se usa el toque).
vista.addEventListener('dragstart', (e) => {
  const t = e.target.closest?.('.tarjeta');
  if (!t) return;
  e.dataTransfer.setData('text/plain', t.dataset.id);
  e.dataTransfer.effectAllowed = 'move';
});
vista.addEventListener('dragover', (e) => {
  const col = e.target.closest?.('[data-columna]');
  if (!col) return;
  e.preventDefault();
  document.querySelectorAll('.columna.sobre').forEach((c) => c !== col && c.classList.remove('sobre'));
  col.classList.add('sobre');
});
vista.addEventListener('dragleave', (e) => {
  const col = e.target.closest?.('[data-columna]');
  if (col && !col.contains(e.relatedTarget)) col.classList.remove('sobre');
});
vista.addEventListener('drop', async (e) => {
  const col = e.target.closest?.('[data-columna]');
  if (!col) return;
  e.preventDefault();
  col.classList.remove('sobre');
  const n = porId(e.dataTransfer.getData('text/plain'));
  if (!n) return;
  try { await cambiarEstadoUI(n, col.dataset.columna); } catch (err) { console.error(err); toast('Error: ' + err.message); }
});

// ───────────────────────── Ficha ─────────────────────────
async function renderFicha(id) {
  const n = porId(id);
  if (!n) { vista.innerHTML = '<div class="vacio">No existe ese negocio.</div>'; return; }
  const hoy = hoyAR();
  const campo = (k, label, tipo = 'text') => `<div><label>${label}</label><input name="${k}" type="${tipo}" value="${esc(n[k])}"></div>`;
  const opt = (k, label, valores, etiqueta = (v) => v) => `<div><label>${label}</label><select name="${k}">
    ${valores.map((v) => `<option value="${v}" ${n[k] === v ? 'selected' : ''}>${etiqueta(v)}</option>`).join('')}</select></div>`;
  const palabras = (n.ganchoCorto || '').trim().split(/\s+/).filter(Boolean).length;
  const links = [n.mapsUrl && `<a href="${esc(n.mapsUrl)}" target="_blank">Maps</a>`, n.web && `<a href="${esc(n.web)}" target="_blank">Web</a>`,
    n.instagram && `<a href="${esc(n.instagram.startsWith('http') ? n.instagram : 'https://instagram.com/' + n.instagram.replace('@', ''))}" target="_blank">Instagram</a>`,
    !n.mapsUrl && `<a href="https://www.google.com/maps/search/${encodeURIComponent(n.nombre + ' ' + n.ciudad)}" target="_blank">Buscar en Maps</a>`].filter(Boolean);
  const botonEstado = (estado, label) => n.estado === estado ? '' : `<button data-act="estado" data-estado="${estado}">${label}</button>`;

  vista.innerHTML = `<div data-id="${esc(n.id)}">
    <div class="cab" style="display:flex;justify-content:space-between;gap:.5rem">
      <div><h1>${esc(n.nombre)}</h1><div class="tenue">${esc(n.ciudad)}${n.provincia ? ', ' + esc(n.provincia) : ''}</div></div>
      <div class="chips"><span class="chip rust">${esc(n.prioridad)}</span><span class="chip">${ESTADO_LABEL[n.estado]}</span></div>
    </div>
    <p class="chico">${links.join(' · ')}</p>
    <div class="seccion">
      <div class="tenue chico">Contacto ${n.paso || 0} de ${TOTAL_CONTACTOS} hecho${n.proximoToque ? ` · próximo toque ${fechaCorta(n.proximoToque)}` : ''}${n.secuenciaTerminada ? ' · secuencia terminada' : ''}${n.reunionFecha ? ` · reunión ${d_fmt(n.reunionFecha)}` : ''}</div>
      <div class="botones">
        ${botonEstado('reunion', 'Reunión agendada')}${botonEstado('propuesta', 'Propuesta enviada')}${botonEstado('cerrado', 'Cerrado')}
        ${n.estado !== 'descartado' ? '<button data-act="descartar">Descartar</button>' : ''}
        <button data-act="nota">+ Nota</button>
        ${puedeReactivar(n, hoy) ? '<button class="primario" data-act="reactivar">Reactivar secuencia</button>' : ''}
      </div>
      ${n.secuenciaTerminada && !puedeReactivar(n, hoy) && n.ultimoContacto ? `<p class="tenue chico">Se puede reactivar desde el ${fechaCorta(sumarDias(n.ultimoContacto, 60))}.</p>` : ''}
    </div>
    ${seccionAnalisis(n.analisis)}
    <form class="seccion" onsubmit="return false">
      <h3>Datos</h3>
      <div class="grid2">${campo('nombre', 'Nombre')}${campo('ciudad', 'Ciudad')}${campo('provincia', 'Provincia')}${campo('direccion', 'Dirección')}
      ${campo('telefono', 'Teléfono', 'tel')}${campo('instagram', 'Instagram')}${campo('web', 'Web')}${campo('mapsUrl', 'Link de Maps')}
      ${opt('prioridad', 'Prioridad', ['A', 'B', 'C'])}${opt('variante', 'Variante', ['A', 'B'], (v) => `${v} · ${S.rubro.variantes?.[v]?.split(':')[0] || ''}`)}
      ${opt('canal', 'Canal', Object.keys(CANAL_LABEL), (v) => CANAL_LABEL[v])}${campo('fuente', 'Fuente (Meta, FAATRA…)')}</div>
      <p class="tenue chico">WhatsApp: ${n.telefonoWa ? `+${esc(n.telefonoWa)} (${n.esCelularProbable === true ? 'celular' : n.esCelularProbable === false ? 'parece fijo' : 'tipo desconocido'})` : 'sin número válido'}</p>
      <label>Gancho (para vos)</label><textarea name="gancho" style="min-height:4rem">${esc(n.gancho)}</textarea>
      <label>Gancho corto (va en el mensaje, máx. 10 palabras) ${palabras > 10 ? `<span class="atras">· tiene ${palabras}</span>` : ''}</label><input name="ganchoCorto" value="${esc(n.ganchoCorto)}" placeholder="Ej.: 391 reseñas, impresionante">
      <label>Objeción</label><input name="objecion" value="${esc(n.objecion)}">
      <label>Notas</label><textarea name="notas" style="min-height:4rem">${esc(n.notas)}</textarea>
      <div class="botones"><button class="primario grande" data-act="guardar-ficha">Guardar cambios</button></div>
    </form>
    <div class="seccion"><h3>Historial</h3><div id="eventos" class="tenue chico">Cargando…</div></div>
  </div>`;
  const eventos = await S.store.listarEventos(id);
  const cont = $('#eventos');
  if (!cont) return;
  cont.classList.remove('tenue', 'chico');
  cont.innerHTML = eventos.length ? eventos.map((e) => `<div class="evento">
    <div class="f">${e.fecha ? e.fecha.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : ''} · ${esc(e.tipo)}${e.paso ? ` · contacto ${e.paso}` : ''}${e.canal ? ` · ${esc(e.canal)}` : ''}</div>
    ${e.texto ? `<div class="t">${esc(e.texto)}</div>` : ''}</div>`).join('') : '<p class="tenue">Sin eventos.</p>';
}

/** Lo que dijo Claude al analizar las reseñas (Fase 4). */
function seccionAnalisis(a) {
  if (!a) return '';
  const lista = (titulo, items) => (items?.length ? `<div class="chico"><b>${titulo}:</b> ${items.map(esc).join(' · ')}</div>` : '');
  return `<div class="seccion"><h3>Análisis de reseñas</h3>
    <div class="tenue chico">Prioridad ${esc(a.prioridad)} · score ${esc(a.score)} · tamaño ${esc(a.tamanoEstimado)} · variante sugerida ${esc(a.varianteSugerida)}</div>
    ${lista('Recompra', a.senalesRecompra)}${lista('Entrega profesional', a.senalesEntrega)}${lista('Dolores', a.dolores)}
    ${lista('Ya hace a mano', a.yaHaceManual)}${a.alertas?.length ? `<div class="chico aviso"><b>Alertas:</b> ${a.alertas.map(esc).join(' · ')}</div>` : ''}
  </div>`;
}

// ───────────────────────── Alta manual ─────────────────────────
function renderAlta() {
  vista.innerHTML = `<form class="seccion" id="form-alta">
    <h1>Nuevo negocio</h1>
    <div class="grid2">
      <div><label>Nombre *</label><input name="nombre" required></div>
      <div><label>Ciudad *</label><input name="ciudad" required></div>
      <div><label>Provincia</label><input name="provincia"></div>
      <div><label>Teléfono</label><input name="telefono" type="tel"></div>
      <div><label>Instagram</label><input name="instagram"></div>
      <div><label>Prioridad</label><select name="prioridad"><option>A</option><option selected>B</option><option>C</option></select></div>
    </div>
    <label>Fuente</label><input name="fuente" list="fuentes" placeholder="Meta, FAATRA, GPS Taller, repuestera, visita…">
    <datalist id="fuentes">${['Meta', 'FAATRA', 'GPS Taller', 'Repuestera', 'Recomendación', 'Visita'].map((f) => `<option value="${f}">`).join('')}</datalist>
    <label>Gancho / contexto</label><textarea name="gancho" style="min-height:4rem"></textarea>
    <label>Notas</label><textarea name="notas" style="min-height:4rem"></textarea>
    <div class="botones"><button class="primario grande" type="submit">Crear</button></div>
  </form>`;
  $('#form-alta').onsubmit = async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    const nombre = f.nombre.trim(), ciudad = f.ciudad.trim();
    const clave = claveNombreCiudad(nombre, ciudad);
    const repetido = S.negocios.find((n) => claveNombreCiudad(n.nombre, n.ciudad) === clave);
    if (repetido) { toast('Ya existe: te llevo a la ficha'); location.hash = `#/n/${encodeURIComponent(repetido.id)}`; return; }
    const tel = normalizarTelefono(f.telefono);
    const cuenta = { A: 0, B: 0 };
    S.negocios.forEach((n) => n.variante && cuenta[n.variante]++);
    const n = {
      id: 'manual_' + slugify(`${nombre} ${ciudad}`), rubro: S.rubro.id, slug: slugify(nombre),
      nombre, ciudad, provincia: f.provincia.trim(), telefono: f.telefono.trim() || null, ...tel,
      instagram: f.instagram.trim(), prioridad: f.prioridad, gancho: f.gancho.trim(), ganchoCorto: '', notas: f.notas.trim(),
      fuente: f.fuente.trim(), estado: 'sin_contactar', paso: 0, proximoToque: null, primerContacto: null,
      variante: cuenta.A <= cuenta.B ? 'A' : 'B', canal: tel.esCelularProbable ? 'whatsapp' : 'llamada',
      noContactar: false, origen: 'manual',
    };
    await S.store.crearNegocios([n]);
    S.negocios.push({ ...n, creado: new Date(), actualizado: new Date() });
    toast('Creado');
    location.hash = `#/n/${encodeURIComponent(n.id)}`;
  };
}

// ───────────────────────── Métricas ─────────────────────────
const pct = (x) => `${Math.round(x * 100)}%`;
const DIA_LETRA = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

async function renderMetricas() {
  const hoy = hoyAR();
  const e = embudo(S.negocios);
  const tabla = (titulo, grupos, etiqueta = (k) => k) => (grupos.length ? `<div class="seccion"><h3>${titulo}</h3>
    <div class="tabla-scroll"><table class="tabla"><thead><tr><th></th><th>Cont.</th><th>Resp.</th><th>%</th><th>Reun.</th><th>Prop.</th><th>Cerr.</th></tr></thead><tbody>
    ${grupos.map((g) => `<tr><th>${esc(etiqueta(g.clave))}</th><td>${g.contactados}</td><td>${g.respondieron}</td>
      <td class="${g.contactados >= 10 && g.tasaRespuesta < REFERENCIA_RESPUESTA ? 'bajo' : ''}">${pct(g.tasaRespuesta)}</td>
      <td>${g.etapas[2].n}</td><td>${g.etapas[3].n}</td><td>${g.etapas[4].n}</td></tr>`).join('')}
    </tbody></table></div></div>` : '');
  const objs = objecionesTop(S.negocios);
  const maxEtapa = Math.max(1, e.contactados);

  vista.innerHTML = `
    <h1>Métricas</h1>
    <div class="seccion">
      <h3>Embudo</h3>
      ${e.contactados ? `<div class="embudo">${e.etapas.map((et, i) => `<div class="et">
        <div class="lbl">${et.label}</div>
        <div class="barra"><div style="width:${Math.max(et.n ? 2 : 0, (et.n / maxEtapa) * 100)}%"></div></div>
        <div class="num mono">${et.n}${i ? ` <span class="tenue">${pct(et.pct)}</span>` : ''}</div></div>`).join('')}</div>
        <p class="chico lectura">${esc(lecturaReferencia(e))}</p>`
      : '<p class="tenue">Todavía no hay contactos registrados. Empezá desde la pantalla Hoy.</p>'}
      <p class="tenue chico">Cada etapa incluye a los que avanzaron más. Los descartados cuentan hasta donde habían llegado. Porcentajes sobre contactados.</p>
    </div>
    <div class="seccion"><h3>Contactos por día · últimas 4 semanas</h3><div id="constancia" class="tenue chico">Cargando…</div></div>
    ${tabla('Variante A / B', embudoPor(S.negocios, (n) => n.variante), (k) => `${k} · ${S.rubro.variantes?.[k]?.split(':')[0] || ''}`)}
    ${tabla('Por canal', embudoPor(S.negocios, (n) => n.canal), (k) => CANAL_LABEL[k] || k)}
    ${tabla('Por origen (frío contra cálidos)', embudoPor(S.negocios, canalOrigen))}
    ${tabla('Por ciudad', embudoPor(S.negocios, (n) => n.ciudad))}
    <div class="seccion"><h3>Objeciones más repetidas</h3>
      ${objs.length ? `<ol class="objeciones">${objs.map((o) => `<li>${esc(o.texto)} <span class="tenue mono">×${o.n}</span></li>`).join('')}</ol>` : '<p class="tenue chico">Todavía no se anotaron objeciones.</p>'}
    </div>`;

  let eventos;
  try {
    eventos = await S.store.listarEventosDesde(inicioVentana(hoy));
  } catch (err) {
    console.error(err);
    const c = $('#constancia');
    if (c) c.textContent = 'No se pudieron leer los eventos: ' + err.message;
    return;
  }
  const ids = new Set(S.negocios.map((n) => n.id));
  const k = contactosPorDia(eventos.filter((ev) => ids.has(ev.negocioId)), hoy);
  const cont = $('#constancia');
  if (!cont) return;
  const max = Math.max(1, ...k.serie.map((s) => s.n));
  cont.className = '';
  cont.innerHTML = `
    <div class="chico"><b>${k.total}</b> contactos · constancia: <b>${k.diasConContacto} de ${k.diasHabiles}</b> días hábiles con al menos uno</div>
    <div class="dias" role="img" aria-label="Contactos por día de las últimas 4 semanas">
      ${k.serie.map((s) => `<div class="dia ${s.habil ? '' : 'finde'} ${s.dia === hoy ? 'hoy' : ''}" data-tip="${DIA_LETRA[new Date(s.dia + 'T12:00:00Z').getUTCDay()]} ${fechaCorta(s.dia)}: ${s.n} contacto${s.n === 1 ? '' : 's'}">
        <div class="col"><div class="b" style="height:${s.n ? Math.max(4, (s.n / max) * 100) : 0}%"></div></div>
        <div class="l">${DIA_LETRA[new Date(s.dia + 'T12:00:00Z').getUTCDay()]}</div></div>`).join('')}
    </div>
    <div class="tenue chico" id="tip-dia">Tocá una barra para ver el día · máximo ${max}</div>
    <details class="chico"><summary class="tenue">Ver como tabla</summary>
      <table class="tabla"><tbody>${k.serie.filter((s) => s.n).map((s) => `<tr><th>${fechaCorta(s.dia)}</th><td>${s.n}</td></tr>`).join('') || '<tr><td>Sin contactos</td></tr>'}</tbody></table>
    </details>`;
  const tip = $('#tip-dia');
  const mostrar = (ev) => { const d = ev.target.closest?.('[data-tip]'); if (d) tip.textContent = d.dataset.tip; };
  cont.querySelector('.dias').addEventListener('mouseover', mostrar);
  cont.querySelector('.dias').addEventListener('click', mostrar);
}

// ───────────────────────── Plantillas ─────────────────────────
const CAMPOS_PLANTILLA = [
  ['A', '1', 'Variante A · Contacto 1 (WhatsApp)'], ['A', '2', 'Variante A · Contacto 2 (WhatsApp)'], ['A', '4', 'Variante A · Contacto 4 (WhatsApp)'],
  ['B', '1', 'Variante B · Contacto 1 (WhatsApp)'], ['B', '2', 'Variante B · Contacto 2 (WhatsApp)'], ['B', '4', 'Variante B · Contacto 4 (WhatsApp)'],
];

/** Negocio de ejemplo para la vista previa: uno con gancho corto si hay. */
function negocioEjemplo(variante) {
  return S.negocios.find((n) => n.ganchoCorto && n.variante === variante) || S.negocios.find((n) => n.ganchoCorto) ||
    { nombre: 'Taller Ejemplo', ganchoCorto: '391 reseñas, impresionante', variante, paso: 1 };
}

function varsEjemplo(variante, rubro) {
  const n = negocioEjemplo(variante);
  return { taller: n.nombre, ganchoCorto: n.ganchoCorto, video: rubro.videoUrl?.[variante], firma: rubro.firma, previo: rubro.textoPrevioLlamada };
}

function avisosPlantilla(texto) {
  const avisos = [];
  if (/\$|\bprecio|\bpesos\b|\busd\b|\bu\$s/i.test(texto)) avisos.push('Parece mencionar un precio: los mensajes no llevan precios.');
  const desconocidas = [...texto.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).filter((v) => !['taller', 'ganchoCorto', 'video', 'firma', 'previo'].includes(v));
  if (desconocidas.length) avisos.push(`Variable desconocida: ${[...new Set(desconocidas)].map((v) => `{${v}}`).join(', ')}`);
  return avisos;
}

function renderPlantillas() {
  const r = S.rubro;
  const p = r.plantillas || {};
  const llamada = p.llamada || [];
  vista.innerHTML = `<form id="form-plantillas" onsubmit="return false">
    <p class="chico"><a href="#/mas">← Más</a></p>
    <h1>Plantillas de mensajes</h1>
    <div class="seccion chico tenue">
      Variables: <span class="mono">{taller}</span> <span class="mono">{ganchoCorto}</span> <span class="mono">{video}</span> <span class="mono">{firma}</span>.
      Un bloque <span class="mono">[[ , {ganchoCorto} 👏|.]]</span> se usa solo si sus variables tienen valor; si no, va lo que está después de <span class="mono">|</span> (o nada).
      Sin precios: sí se puede decir "pago único, sin abono mensual".
    </div>
    <div class="seccion">
      <h3>General</h3>
      <div class="grid2">
        <div><label>Video variante A</label><input name="videoA" type="url" value="${esc(r.videoUrl?.A)}" placeholder="https://…"></div>
        <div><label>Video variante B</label><input name="videoB" type="url" value="${esc(r.videoUrl?.B)}" placeholder="https://…"></div>
      </div>
      <label>Firma</label><input name="firma" value="${esc(r.firma)}">
    </div>
    ${CAMPOS_PLANTILLA.map(([v, c, label]) => `<div class="seccion">
      <h3>${label}</h3>
      <textarea name="tpl_${v}_${c}" data-preview="${v}">${esc(p[v]?.[c])}</textarea>
      <div class="chico tenue">Vista previa con ${esc(negocioEjemplo(v).nombre)}:</div>
      <div class="guion" data-salida="tpl_${v}_${c}"></div>
      <div class="chico aviso" data-avisos="tpl_${v}_${c}"></div>
    </div>`).join('')}
    <div class="seccion">
      <h3>Contacto 3 · guion de llamada (ambas variantes)</h3>
      ${[0, 1, 2].map((i) => `<label>Línea ${i + 1}</label><textarea name="llamada_${i}" data-preview="A" style="min-height:3.5rem">${esc(llamada[i])}</textarea>
        <div class="guion" data-salida="llamada_${i}"></div>`).join('')}
      <label>Texto cuando ya hubo un WhatsApp antes (<span class="mono">{previo}</span>)</label>
      <input name="textoPrevioLlamada" data-preview="A" value="${esc(r.textoPrevioLlamada)}">
    </div>
    <div class="botones">
      <button class="primario grande" data-act-pl="guardar">Guardar plantillas</button>
      <button data-act-pl="restaurar">Restaurar las originales</button>
    </div>
  </form>`;
  const form = $('#form-plantillas');
  const rubroDelForm = () => {
    const f = Object.fromEntries(new FormData(form));
    return {
      ...r,
      firma: f.firma.trim(),
      videoUrl: { A: f.videoA.trim(), B: f.videoB.trim() },
      textoPrevioLlamada: f.textoPrevioLlamada.trim(),
      plantillas: {
        ...p,
        A: { ...p.A, 1: f.tpl_A_1, 2: f.tpl_A_2, 4: f.tpl_A_4 },
        B: { ...p.B, 1: f.tpl_B_1, 2: f.tpl_B_2, 4: f.tpl_B_4 },
        llamada: [f.llamada_0, f.llamada_1, f.llamada_2].map((l) => l.trim()).filter(Boolean),
      },
    };
  };
  const previsualizar = () => {
    const nuevo = rubroDelForm();
    form.querySelectorAll('[data-salida]').forEach((out) => {
      const campo = form.elements.namedItem(out.dataset.salida);
      const variante = campo.dataset.preview;
      const texto = renderPlantilla(campo.value, varsEjemplo(variante, nuevo));
      out.textContent = texto;
      const av = form.querySelector(`[data-avisos="${out.dataset.salida}"]`);
      if (av) av.textContent = [...avisosPlantilla(campo.value), texto.length > 450 ? `Tiene ${texto.length} caracteres: conviene menos de 450.` : ''].filter(Boolean).join(' ');
    });
  };
  form.addEventListener('input', previsualizar);
  previsualizar();
  form.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act-pl]');
    if (!b) return;
    e.preventDefault();
    try {
      if (b.dataset.actPl === 'guardar') {
        const nuevo = rubroDelForm();
        await S.store.guardarRubro(nuevo);
        S.rubro = nuevo;
        toast('Plantillas guardadas');
      } else {
        if (!confirm('¿Volver a las plantillas, video y firma originales? Se pierden los cambios guardados.')) return;
        const orig = await (await fetch(`rubros/${r.id}.json`)).json();
        const nuevo = { ...r, plantillas: orig.plantillas, videoUrl: orig.videoUrl, firma: orig.firma, textoPrevioLlamada: orig.textoPrevioLlamada };
        await S.store.guardarRubro(nuevo);
        S.rubro = nuevo;
        toast('Plantillas restauradas');
        renderPlantillas();
      }
    } catch (err) { console.error(err); toast('Error: ' + err.message); }
  });
}

// ───────────────────────── Más: importar, exportar, config ─────────────────────────
function renderMas() {
  const p = S.importPlan;
  vista.innerHTML = `
    <div class="seccion"><h2>Importar planilla (CSV)</h2>
      <p class="tenue chico">Columnas: Taller, Ciudad, Prioridad, Reseñas, Teléfono, Estado, Gancho para el mensaje, Provincia, Rating, 1er contacto, Próximo toque, Notas, Variante, Canal, Objeción. Los negocios que ya existen (mismo nombre y ciudad) no se tocan.</p>
      <input type="file" id="archivo-csv" accept=".csv,text/csv">
      ${p ? `<div style="margin-top:.8rem">
        <p><b>${p.nuevos.length}</b> nuevos · ${p.repetidos.length} ya existían</p>
        ${p.avisos.length ? `<details><summary class="aviso">${p.avisos.length} aviso${p.avisos.length === 1 ? '' : 's'}</summary><ul class="chico">${p.avisos.map((a) => `<li>${esc(a)}</li>`).join('')}</ul></details>` : ''}
        ${p.nuevos.length ? `<p class="tenue chico">Variantes: A ${p.nuevos.filter((n) => n.variante === 'A').length} · B ${p.nuevos.filter((n) => n.variante === 'B').length} — Canal: WhatsApp ${p.nuevos.filter((n) => n.canal === 'whatsapp').length} · Llamada ${p.nuevos.filter((n) => n.canal === 'llamada').length}</p>
          <div class="botones"><button class="primario grande" data-act="importar-ok">Importar ${p.nuevos.length}</button></div>` : ''}
      </div>` : ''}
    </div>
    <div class="seccion"><h2>Exportar</h2>
      <p class="tenue chico">CSV con todas las columnas de la planilla + id, para respaldo.</p>
      <button data-act="exportar">Descargar CSV (${S.negocios.length})</button>
    </div>
    <div class="seccion"><h2>Mensajes</h2>
      <p class="tenue chico">Plantillas de los 4 contactos por variante, guion de llamada, links de video y firma.</p>
      <a class="btn" href="#/plantillas">Editar plantillas</a>
    </div>
    <div class="seccion"><h2>Configuración</h2>
      <label>Máximo de primeros contactos por día</label>
      <input type="number" id="cfg-max" min="1" max="100" value="${S.config.maxContactosDia}">
      <div class="botones"><button data-act="guardar-config">Guardar</button></div>
    </div>
    <div class="seccion"><h2>Sesión</h2>
      <p class="chico">${esc(S.user?.email || '')}<br><span class="tenue mono">UID ${esc(S.user?.uid || '')}</span></p>
      <button data-act="salir">${S.store.modo === 'demo' ? 'Borrar datos de demo' : 'Cerrar sesión'}</button>
    </div>
    <div class="firma">ReportCar · Un desarrollo de <img src="icons/appsart.png" alt="AppsArt"> AppsArt</div>`;

  $('#archivo-csv').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const filas = csvAObjetos(await file.text());
    S.importPlan = planificarImportacion(filas, S.negocios, S.rubro);
    renderMas();
  };
}

Object.assign(acciones, {
  async 'importar-ok'() {
    const lista = S.importPlan.nuevos;
    toast(`Importando ${lista.length}…`);
    await S.store.crearNegocios(lista, (k) => toast(`Importados ${k}/${lista.length}`));
    S.negocios = await S.store.listarNegocios(S.rubro.id);
    S.importPlan = null;
    toast(`Listo: ${lista.length} negocios importados`);
    renderMas();
  },
  exportar() {
    const csv = aCSV(COLUMNAS_EXPORT, negociosAFilasPlanilla([...S.negocios].sort((a, b) => a.nombre.localeCompare(b.nombre))));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `negocios-${S.rubro.id}-${hoyAR()}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  },
  async 'guardar-config'() {
    const max = parseInt($('#cfg-max').value, 10);
    if (!(max > 0)) return toast('Número inválido');
    await S.store.guardarConfig({ maxContactosDia: max });
    S.config.maxContactosDia = max;
    toast('Guardado');
  },
  salir() { S.store.logout(); },
});

if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js');
iniciar();
