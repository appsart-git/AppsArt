// Guiones de clics de cada escena (los usa capture.html para grabar y studio.html para montar).
// Cada paso: do(c) deja la app en un estado -> se saca una captura; tap = elemento que se toca
// después (se dibuja el círculo terracota sobre esa captura antes de pasar a la siguiente).
// Para regrabar:  capture.ps1 v1s2 v1s3 ...   (con serve.ps1 corriendo)
const SCENES = {};

// prep común: sin la franja "DEMO" de arriba
const hideBanner = async c => { c.d.querySelectorAll('.demo-banner').forEach(e => e.style.display = 'none'); };
const TT = { app: 'tt', vw: 390, vh: 760, prep: hideBanner };   // demo talleres (ReportCar), celular
const RP = { app: 'rp', vw: 600, vh: 780, prep: hideBanner };   // demo repuestos, compu/tablet
const RPM = { app: 'rp', vw: 390, vh: 760, prep: hideBanner };  // demo repuestos, celular

/* ===================== VIDEO 1 — TALLERES ===================== */

// 2. Cargá la orden de trabajo desde el celular: cliente, patente y vehículo.
SCENES.v1s2 = { ...TT, steps: [
  { do: async c => { c.w.goSection('seguimiento'); }, tap: '[data-action=nuevaOrden]' },
  { do: async c => { c.click('[data-action=nuevaOrden]'); }, tap: '#of_nombre' },
  { do: async c => { c.type('#of_nombre', 'Julián Ortega'); c.type('#of_telefono', '1155550123'); }, tap: '#of_patente' },
  { do: async c => { c.type('#of_patente', 'AF274KD'); c.type('#of_marca', 'Volkswagen'); c.type('#of_modelo', 'Amarok');
                     c.type('#of_nota', 'Service de los 60.000 km'); }, tap: '[data-action=guardarOrden]' },
  { do: async c => { c.click('[data-action=guardarOrden]'); await c.wait(900); c.w.scrollTo(0, 0); } },
]};

// 3. Buscá la patente y tenés todo el historial del auto.
SCENES.v1s3 = { ...TT, steps: [
  { do: async c => { c.w.goSection('clientes'); }, tap: 'input[data-input=filtro_clientes]' },
  { do: async c => { c.type('input[data-input=filtro_clientes]', 'AD361'); await c.wait(300); }, tap: 'tr[data-action=verCliente]' },
  { do: async c => { c.click('tr[data-action=verCliente]'); await c.wait(500); }, tap: 'tr[data-action=verTrabajo]' },
  { do: async c => { c.click('tr[data-action=verTrabajo]'); await c.wait(500); } },
]};

// 4. Armá el informe del trabajo y mandalo en PDF por WhatsApp.  (la demo no tiene "presupuesto")
const informeDemo = async c => {
  const w = c.w, st = w.eval('state');
  w.cargarClienteVehiculoComoInforme(st.clientes.find(x => x.nombre === 'Roberto Sánchez').id,
    st.vehiculos.find(v => v.patente === 'AD361KQ').id);
  Object.assign(st.informe.fields, { km: '68.400 km', motor: '1.3 nafta', transmision: 'Manual', manoobra: '45000' });
  st.informe.trabajos = ['Cambio de pastillas de freno delanteras', 'Cambio de aceite y filtros', 'Escaneo computarizado'];
  st.informe.repuestos = [{nombre: 'Pastillas de freno', marca: 'Frasle', costo: 38000}, {nombre: 'Aceite 5W30 4L', marca: 'Total', costo: 48000}, {nombre: 'Filtro de aceite', marca: 'Mann', costo: 7000}];
  st.informe.obs = ['Próximo service a los 78.000 km'];
  w.goSection('informe');
};
SCENES.v1s4 = { ...TT, steps: [
  { do: async c => { await informeDemo(c); c.q('text=Trabajos realizados').scrollIntoView({block: 'start'}); c.w.scrollBy(0, -70); } },
  { do: async c => { c.q('#shareBtn').scrollIntoView({block: 'center'}); }, tap: '#shareBtn' },
  { do: async c => { c.q('#report').scrollIntoView({block: 'start'}); c.w.scrollBy(0, -60); } },
]};
// el informe en PDF a tamaño completo (lo que genera "Compartir"), para mostrarlo grande
SCENES.v1s4pdf = { app: 'tt', vw: 760, vh: 1290, prep: hideBanner, steps: [
  { do: async c => { await informeDemo(c); const r = c.q('#report');
      c.d.body.innerHTML = ''; c.d.body.appendChild(r); c.d.body.style.cssText = 'margin:0;background:#fff;padding:0';
      r.style.cssText += ';width:760px;margin:0;transform:none'; } },
]};

// 5. Seguí cada auto: recibido, diagnóstico, esperando repuesto y listo.  (estados reales de la demo)
SCENES.v1s5 = { ...TT, steps: [
  { do: async c => { c.w.goSection('seguimiento'); c.q('text=Laura Paz').scrollIntoView({block: 'start'}); c.w.scrollBy(0, -90); },
    tap: 'text=Pasar a "Esperando repuesto"' },
  { do: async c => { c.click('text=Pasar a "Esperando repuesto"'); await c.wait(700); c.q('text=Laura Paz').scrollIntoView({block: 'start'}); c.w.scrollBy(0, -90); }, tap: 'text=Pasar a "Listo"' },
  { do: async c => { c.click('text=Pasar a "Listo"'); await c.wait(700); c.q('text=Laura Paz').scrollIntoView({block: 'start'}); c.w.scrollBy(0, -90); } },
]};

/* ===================== VIDEO 2 — REPUESTOS ===================== */

// 2. Buscá por vehículo y encontrá el repuesto compatible.  (la demo busca por texto: marca/modelo en "Compatibilidad")
SCENES.v2s2 = { ...RP, steps: [
  { do: async c => { c.w.goSection('productos'); }, tap: '#main input' },
  { do: async c => { c.type('#main input', 'Fiat'); await c.wait(300); } },
  { do: async c => { c.type('#main input', 'Fiat Cronos'); await c.wait(300); } },
]};

// 3. Controlá el stock desde la compu o el celular.
SCENES.v2s3 = { ...RP, steps: [
  { do: async c => { c.w.goSection('productos'); c.w.scrollTo(0, 330); } },
  { do: async c => { c.w.goSection('panel'); const e = c.q('text=Stock bajo mínimo'); c.w.scrollTo(0, e.getBoundingClientRect().top + c.w.scrollY - 200); } },
]};
// (en celular el Panel de la demo mide 614px de ancho y se corta: por eso esta escena va solo en vista compu)

// 4. Registrá las compras y sabé cuánto le debés a cada proveedor.  (la demo no tiene listas de precios)
SCENES.v2s4 = { ...RP, steps: [
  { do: async c => { c.w.goSection('proveedores'); } },
  { do: async c => { c.w.goSection('cuentas'); }, tap: '[data-action=cuentaTab][data-tab=pagar]' },
  { do: async c => { c.click('[data-action=cuentaTab][data-tab=pagar]'); await c.wait(300); }, tap: '[data-action=verEntidad]' },
  { do: async c => { c.click('[data-action=verEntidad]'); await c.wait(500); } },
]};

// 5. Emití comprobantes de venta y llevá la cuenta corriente de cada cliente.
SCENES.v2s5 = { ...RP, steps: [
  { do: async c => { c.w.goSection('ventas'); }, tap: '#vt_search' },
  { do: async c => { c.type('#vt_search', 'pastillas'); await c.wait(300); }, tap: '#vt_results .opt[data-pid]' },
  { do: async c => { c.click('#vt_results .opt[data-pid]'); await c.wait(300); c.type('#vt_clienteSearch', 'Taller Don'); await c.wait(300); },
    tap: '#vt_clienteResults .opt[data-cid]' },
  { do: async c => { c.click('#vt_clienteResults .opt[data-cid]'); await c.wait(300);
                     const s = c.q('#vt_formaPago'); s.value = 'cuenta corriente'; s.dispatchEvent(new c.w.Event('change', {bubbles: true})); await c.wait(300); },
    tap: '[data-action=confirmarVenta]' },
  { do: async c => { c.click('[data-action=confirmarVenta]'); await c.wait(900); }, tap: '[data-action=comprobanteCompartir]' },
  { do: async c => { c.w.closeModal && c.w.closeModal(); c.w.goSection('cuentas'); await c.wait(300); } },
]};

/* ---------- sondeo (para mirar pantallas) ---------- */
const probe = (app, vw, vh, sections) => ({
  app, vw, vh, prep: hideBanner,
  steps: sections.map(s => ({ do: async c => { c.w.goSection(s); c.w.scrollTo(0, 0); } }))
});
SCENES.probeRP = probe('rp', 600, 1000, ['panel', 'productos', 'proveedores', 'cuentas', 'ventas', 'clientes']);
SCENES.probeTT = probe('tt', 390, 780, ['seguimiento', 'clientes', 'informe']);
