// Guion de clics de cada escena del video (lo usa grabar.mjs). Para regrabar: node grabar.mjs e1 e3 ...
// Cada paso: do(c) deja la app en un estado -> captura. tap = lo que se toca DESPUÉS de esa captura
// (el montaje dibuja ahí el círculo terracota). waDe = botón de WhatsApp cuyo mensaje se muestra.
// Prohibido en las tomas: Eliminar, Quitar, Rechazado, Reiniciar.
import { AUTO_NUEVO, fotosDe } from './lib/preparar.mjs';

export const VW = 390, VH = 844;   // celular (iPhone 12/13/14), deviceScaleFactor 3
export const ESCENAS = {};

// garabato de firma dibujado por el script (no es la firma de nadie)
function firmaFake(){
  const cv = document.createElement('canvas'); cv.width = 520; cv.height = 160;
  const g = cv.getContext('2d'); g.strokeStyle = '#1b2a6b'; g.lineWidth = 4; g.lineCap = g.lineJoin = 'round';
  g.beginPath(); g.moveTo(30, 110);
  g.bezierCurveTo(60, 20, 90, 20, 95, 100); g.bezierCurveTo(100, 140, 130, 40, 160, 90);
  g.bezierCurveTo(180, 120, 200, 60, 230, 85); g.bezierCurveTo(260, 110, 280, 50, 320, 80);
  g.bezierCurveTo(350, 100, 380, 70, 410, 75); g.bezierCurveTo(440, 80, 470, 95, 495, 60); g.stroke();
  g.beginPath(); g.moveTo(60, 125); g.bezierCurveTo(200, 115, 330, 120, 470, 112); g.stroke();
  return cv.toDataURL('image/png');
}

// Completa el ingreso del auto nuevo de una (los datos, las fotos de los 4 lados, daños y firma)
async function completarIngreso(c, { firma = true } = {}){
  const fotos = fotosDe(AUTO_NUEVO.prefijo);
  await c.run(({ a, fotos, firma, firmaSrc }) => {
    const firmaFn = new Function('return (' + firmaSrc + ')()');
    Object.assign(state._ingreso, { nombre: a.nombre, telefono: a.telefono, patente: a.patente, marca: a.marca, modelo: a.modelo,
      anio: a.anio, motivo: a.motivo, km: a.km, combustible: a.combustible, fotos,
      danios: { puerta_del_izq: 'rayon', parag_tras: 'abolladura' },
      firma: firma ? firmaFn() : null, aclaracion: a.nombre });
    renderIngreso(); window.scrollTo(0, 0);
  }, { a: AUTO_NUEVO, fotos, firma, firmaSrc: firmaFake.toString() });
}

/* 1. El auto entra: fotos, daños, kilómetros, combustible y firma. */
ESCENAS.e1 = { steps: [
  { do: c => c.go('ingreso'), tap: '[data-action=nuevoIngreso]' },
  { do: async c => { await c.click('[data-action=nuevoIngreso]'); await completarIngreso(c); } },
  { do: c => c.top('#fuelSel', 260) },
  { do: c => c.top('#fotoGrid', 140) },
  { do: c => c.top('#danioPlano', 150) },
  { do: c => c.top('.firma-pad', 200), tap: '#guardarIngresoBtn' },
]};

/* 2. El acta de ingreso le llega al cliente por WhatsApp. */
ESCENAS.e2 = { steps: [
  { do: async c => { await c.go('ingreso'); await c.click('[data-action=nuevoIngreso]'); await completarIngreso(c); await c.click('#guardarIngresoBtn'); await c.wait(1500); } },
]};

// e2 sigue a e1: el ingreso guardado y su acta (se espera a que se vaya el aviso "Ingreso guardado")
ESCENAS.e2.steps = [
  { do: async c => { await c.go('ingreso'); await c.click('[data-action=nuevoIngreso]'); await completarIngreso(c); await c.click('#guardarIngresoBtn'); await c.wait(3600); },
    tap: '.modal a[data-action=avisoIngresoEnviado]', waDe: '.modal a[data-action=avisoIngresoEnviado]' },
];

/* 3. Seguí cada auto: recibido, diagnóstico, esperando repuesto, listo.  (el Ford Ka de Nico Ibáñez) */
ESCENAS.e3 = { steps: [
  { do: c => c.go('seguimiento'), tap: '[data-action=avanzarOrden] >> nth=0' },
  { do: async c => { await c.click('[data-action=avanzarOrden] >> nth=0'); await c.wait(3500); await c.scroll(0); } },
]};

/* 4. Tu cliente ve cómo va, sin tener que llamar. */
ESCENAS.e4 = { prep: async c => { await c.go('seguimiento'); await c.click('[data-action=avanzarOrden] >> nth=0'); await c.wait(3500); }, steps: [
  { do: c => c.scroll(0), tap: '[data-action=vistaClienteOrden] >> nth=0' },
  { do: c => c.click('[data-action=vistaClienteOrden] >> nth=0'), wait: 700 },
  { do: async c => { await c.run(() => closeModal()); await c.scroll(0); },
    tap: 'a[data-action=avisarEstadoOrden] >> nth=0', waDe: 'a[data-action=avisarEstadoOrden] >> nth=0' },
]};

/* 5. Armá el presupuesto con precios del stock y mandalo por WhatsApp. */
ESCENAS.e5 = { steps: [
  { do: c => c.go('presupuestos'), tap: '[data-action=verPresupuesto] >> nth=0' },
  { do: c => c.click('[data-action=verPresupuesto] >> nth=0'), wait: 900, tap: '.modal a[data-action=presupuestoEnviado]', waDe: '.modal a[data-action=presupuestoEnviado]' },
]};

/* 6. Cuando lo aprueba, pasa directo al informe. */
ESCENAS.e6 = { steps: [
  { do: async c => { await c.go('presupuestos'); await c.top('[data-action=aprobarPresupuesto] >> nth=0', 420); }, tap: '[data-action=aprobarPresupuesto] >> nth=0' },
  { do: c => c.click('[data-action=aprobarPresupuesto] >> nth=0'), tap: '.modal [data-action=presupuestoAInforme]' },
  { do: async c => { await c.click('.modal [data-action=presupuestoAInforme]'); await c.wait(3600); await c.scroll(0); } },
]};

/* 7. El informe sale en PDF, con fotos y tu logo. */
async function informeDelKa(c){
  await c.go('informe');
  const v = await c.page.locator('select[data-change=informe_ingreso_select] option', { hasText: 'Ford Ka' }).first().getAttribute('value');
  await c.page.selectOption('select[data-change=informe_ingreso_select]', v);
  await c.wait(3600);
  await c.run(() => {
    const inf = state.informe;
    inf.trabajos = ['Diagnóstico con escáner', 'Limpieza de cuerpo de aceleración', 'Cambio de bujías'];
    const r = state.repuestos.find(x => /buj/i.test(x.descripcion)) || state.repuestos[0];
    inf.repuestos = [{ nombre: r.descripcion, marca: r.marca || '', costo: r.precioVenta || 0, repuestoId: r.id, cantidad: 1, precioUnit: r.precioVenta || 0 }];
    inf.fields.manoobra = '48000';
    inf.obs = ['Próximo service a los 48.000 km.'];
    renderInforme(); window.scrollTo(0, 0);
  });
}
// La hoja del PDF tal cual la arma la app: el mismo html2canvas de buildReportPdfBlob() (820 px de ancho),
// pero a escala 3 y en PNG para que se lea bien en el video.
async function hojaPdf(c, id){
  const { url, w, h } = await c.run(async () => {
    const report = document.getElementById('report');
    await waitImagesReady(report);
    const prev = report.style.transform; report.style.transform = 'none'; void report.offsetHeight;
    const h = report.scrollHeight;
    try{
      const cv = await html2canvas(report, { scale: 3, backgroundColor: '#f5f5f4', width: 820, height: h, windowWidth: 820 });
      return { url: cv.toDataURL('image/png'), w: 820, h };
    } finally { report.style.transform = prev; }
  });
  (await import('node:fs')).writeFileSync(`out/shots/${id}-pdf.png`, Buffer.from(url.split(',')[1], 'base64'));
  return { pdf: { w, h } };
}
ESCENAS.e7 = { steps: [
  { do: c => c.go('informe'), tap: 'select[data-change=informe_ingreso_select]' },
  { do: async c => { await informeDelKa(c); } },
  { do: c => c.top('.panel:has-text("Trabajos realizados")', 120) },
  { do: c => c.scroll(0), tap: 'button:has-text("PDF")',
    meta: async c => hojaPdf(c, 'e7') },
]};

/* 8. Los repuestos usados se descuentan solos del stock. */
const stockBujias = c => c.type('#main input[placeholder*="Código"]', 'Bujías');
ESCENAS.e8 = { steps: [
  { do: async c => { await c.go('stock'); await stockBujias(c); await c.wait(400); } },
  { do: async c => { await informeDelKa(c); await c.top('.panel:has-text("Repuestos utilizados")', 90); }, tap: '#guardarTrabajoBtn' },
  { do: async c => { await c.click('#guardarTrabajoBtn'); await c.wait(1500); await c.go('stock'); await stockBujias(c); await c.wait(400); } },
]};

/* 9. Stock mínimo, ubicación en estante y pedido de reposición. */
ESCENAS.e9 = { steps: [
  { do: c => c.go('stock'), tap: '[data-action=stockTab][data-tab=bajo]' },
  { do: c => c.click('[data-action=stockTab][data-tab=bajo]'), tap: '[data-action=pedidoReposicion]' },
  { do: c => c.click('[data-action=pedidoReposicion]'), wait: 800 },
]};

/* 10. Cada cliente, con sus autos y todo su historial. */
ESCENAS.e10 = { steps: [
  { do: c => c.go('clientes'), tap: '[data-action=verCliente] >> nth=0' },
  { do: c => c.click('[data-action=verCliente] >> nth=0'), wait: 800 },
  { do: async c => { await c.run(() => closeModal()); await c.go('trabajos'); }, tap: '#main input >> nth=0' },
  { do: async c => { await c.type('#main input >> nth=0', 'AD361', 60); await c.wait(500); } },
]};

/* 11. Sticker QR en el parabrisas: el cliente ve la ficha de su auto. */
ESCENAS.e11 = { steps: [
  { do: c => c.go('qr'), tap: '[data-action=fichaQrVehiculo] >> nth=0' },
  { do: c => c.click('[data-action=fichaQrVehiculo] >> nth=0'), wait: 900 },
  { do: async c => {   // lo que ve el cliente al escanear el sticker
      const url = await c.run(() => { const s = state.stickers.find(x => x.vehiculoId); return stickerUrlDemo(s); });
      await c.page.goto(url); await c.wait(1200);
    } },
]};

/* 12. El sistema te dice a quién le toca el próximo service. */
ESCENAS.e12 = { steps: [
  { do: c => c.go('fidelizacion'), tap: '[data-action=fidelizacionTab] >> nth=1' },
  { do: c => c.click('[data-action=fidelizacionTab] >> nth=1') },
  { do: c => c.top('[data-action=fidelizacionTab] >> nth=0', 100) },
]};

/* 13. Recordatorio y promo mensual por WhatsApp, con un clic. */
ESCENAS.e13 = { steps: [
  { do: async c => { await c.go('fidelizacion'); await c.top('[data-action=fidelizacionTab] >> nth=0', 330); },
    tap: 'a[data-action=marcarContactado] >> nth=0', waDe: 'a[data-action=marcarContactado] >> nth=0' },
  { do: c => c.scroll(0), tap: '[data-action=abrirPromoMasiva]' },
  { do: c => c.click('[data-action=abrirPromoMasiva]'), wait: 800 },
]};

/* 14. Ingresos, gastos y ganancia del mes, de un vistazo. */
ESCENAS.e14 = { steps: [
  { do: c => c.go('inicio') },
  { do: c => c.top('#main :text("últimos 6 meses")', 140) },
  { do: c => c.go('gastos') },
]};

/* 15. Y todo se adapta a la forma de trabajar de tu taller. */
ESCENAS.e15 = { steps: [
  { do: c => c.go('config') },
  { do: c => c.top('textarea >> nth=0', 160) },
  { do: c => c.top('textarea >> nth=2', 160) },
]};

/* 16. Funciona en el celular, la tablet o la compu.  (pedido de Martín: mencionar que anda en cualquier equipo)
   La misma pantalla de Estado autos en tres tamaños; el montaje los muestra juntos. */
const estadoAutos = { steps: [{ do: c => c.go('seguimiento') }] };
ESCENAS.e16pc  = { ...estadoAutos, vw: 1280, vh: 800, dsf: 2 };
ESCENAS.e16tab = { ...estadoAutos, vw: 820, vh: 1180, dsf: 2 };
ESCENAS.e16cel = { ...estadoAutos };
