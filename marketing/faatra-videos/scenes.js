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
//    (módulo Ingreso: la orden de recepción con km, daños, firma y acta)
const firmaFake = () => {   // garabato de firma dibujado acá (no es la firma de nadie)
  const cv = document.createElement('canvas'); cv.width = 520; cv.height = 160;
  const g = cv.getContext('2d'); g.strokeStyle = '#1b2a6b'; g.lineWidth = 4; g.lineCap = g.lineJoin = 'round';
  g.beginPath(); g.moveTo(30, 110);
  g.bezierCurveTo(60, 20, 90, 20, 95, 100); g.bezierCurveTo(100, 140, 130, 40, 160, 90);
  g.bezierCurveTo(180, 120, 200, 60, 230, 85); g.bezierCurveTo(260, 110, 280, 50, 320, 80);
  g.bezierCurveTo(350, 100, 380, 70, 410, 75); g.bezierCurveTo(440, 80, 470, 95, 495, 60); g.stroke();
  g.beginPath(); g.moveTo(60, 125); g.bezierCurveTo(200, 115, 330, 120, 470, 112); g.stroke();
  return cv.toDataURL('image/png');
};
const ingresoDemo = async c => {
  const w = c.w, st = w.eval('state');
  c.click('[data-action=nuevoIngreso]'); await c.wait(300);
  Object.assign(st._ingreso, { nombre: 'Julián Ortega', telefono: '1155550123', patente: 'AF274KD', marca: 'Volkswagen', modelo: 'Amarok',
    anio: '2021', motivo: 'Service de los 60.000 km y ruido al frenar', km: '59.870', combustible: 2,
    danios: { puerta_del_izq: 'rayon', parag_tras: 'abolladura' }, firma: firmaFake(), aclaracion: 'Julián Ortega' });
  w.renderIngreso(); w.scrollTo(0, 0); await c.wait(300);
};
const scrollToH2 = (c, txt, off = 70) => { const e = c.q('text=' + txt); c.w.scrollTo(0, e.getBoundingClientRect().top + c.w.scrollY - off); };
SCENES.v1s2 = { ...TT, steps: [
  { do: async c => { c.w.goSection('ingreso'); }, tap: '[data-action=nuevoIngreso]' },
  { do: async c => { await ingresoDemo(c); } },
  { do: async c => { scrollToH2(c, 'Estado exterior', 80); } },
  { do: async c => { scrollToH2(c, 'Firma del cliente', 80); }, tap: '[data-action=guardarIngreso]' },
  { do: async c => { c.click('[data-action=guardarIngreso]'); await c.wait(1200); } },
]};

// 3. Buscá la patente y tenés todo el historial del auto.
SCENES.v1s3 = { ...TT, steps: [
  { do: async c => { c.w.goSection('clientes'); }, tap: 'input[data-input=filtro_clientes]' },
  { do: async c => { c.type('input[data-input=filtro_clientes]', 'AD361'); await c.wait(300); }, tap: 'tr[data-action=verCliente]' },
  { do: async c => { c.click('tr[data-action=verCliente]'); await c.wait(500); }, tap: 'tr[data-action=verTrabajo]' },
  { do: async c => { c.click('tr[data-action=verTrabajo]'); await c.wait(500); } },
]};

// 4. Armá el presupuesto y mandalo en PDF por WhatsApp.  (módulo Presupuestos)
const presuDemo = async c => {
  const w = c.w, st = w.eval('state');
  c.click('[data-action=nuevoPresupuesto]'); await c.wait(300);
  const cli = st.clientes.find(x => x.nombre === 'Roberto Sánchez');
  Object.assign(st._presupuesto, { clienteId: cli.id, vehiculoId: st.vehiculos.find(v => v.patente === 'AD361KQ').id,
    notas: 'Garantía de 6 meses en mano de obra.',
    items: [
      { tipo: 'mo', descripcion: 'Cambio de pastillas de freno delanteras', precio: 25000 },
      { tipo: 'mo', descripcion: 'Rectificado de discos', precio: 30000 },
      { tipo: 'rep', descripcion: 'Pastillas de freno Frasle', cantidad: 1, precio: 38000 },
      { tipo: 'rep', descripcion: 'Líquido de frenos DOT4', cantidad: 1, precio: 9500 },
    ] });
  w.renderPresupuestoForm(); w.scrollTo(0, 0); await c.wait(300);
};
SCENES.v1s4 = { ...TT, steps: [
  { do: async c => { c.w.goSection('presupuestos'); }, tap: '[data-action=nuevoPresupuesto]' },
  { do: async c => { await presuDemo(c); } },
  { do: async c => { scrollToH2(c, 'Condiciones y total', 80); },
    tap: '[data-action=guardarPresupuesto]' },
  { do: async c => { c.click('[data-action=guardarPresupuesto]'); await c.wait(1200); },
    tap: '[data-action=presuCompartir]' },
]};
// el presupuesto en PDF a tamaño completo (el mismo documento que exporta "Compartir PDF")
SCENES.v1s4pdf = { app: 'tt', vw: 820, vh: 1290, prep: hideBanner, steps: [
  { do: async c => { c.w.goSection('presupuestos'); await presuDemo(c); c.click('[data-action=guardarPresupuesto]'); await c.wait(1200);
      const r = c.q('#presuDoc'); c.d.body.innerHTML = ''; c.d.body.appendChild(r);
      c.d.body.style.cssText = 'margin:0;background:#fff;padding:0'; r.style.transform = 'none'; r.style.boxShadow = 'none'; r.style.margin = '0';
      const m = { h: r.scrollHeight }; c.d.title = 'H' + m.h; } },
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

/* ---------- versión PC (videos horizontales "pc"): mismos guiones con la pantalla de una compu ---------- */
for(const k of ['v1s2', 'v1s3', 'v1s4', 'v1s5', 'v2s2', 'v2s3', 'v2s4', 'v2s5']) SCENES[k + 'pc'] = { ...SCENES[k], vw: 1440, vh: 810 };
// en el Panel de la demo la grilla es "1fr 1fr" y las tablas empujan la segunda tarjeta fuera de pantalla: para la captura se acota
SCENES.v2s3pc.steps = [SCENES.v2s3.steps[0], { do: async c => { c.w.goSection('panel'); await c.wait(200);
  c.d.querySelectorAll('.panel-grid').forEach(g => g.style.gridTemplateColumns = 'minmax(0,1.2fr) minmax(0,1fr)'); c.w.scrollTo(0, 0); } }];
