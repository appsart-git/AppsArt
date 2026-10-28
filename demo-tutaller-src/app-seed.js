'use strict';
/* ===================== DATOS DE EJEMPLO (solo demo de campaña) ===================== */
// Esta es la demo que se muestra en la llamada de venta (anuncio → quiz → llamada). Arranca con
// una base de ejemplo ya cargada para que se vea "viva" desde el primer segundo: clientes con
// service vencido/por vencer/al día, autos en distintas etapas de Seguimiento y unos gastos del
// mes. Se siembra una sola vez (marcador en localStorage); "Reiniciar datos de ejemplo" en
// Configuración la vuelve a poner como el día uno.

function seedDemoDataIfEmpty(){
  if(localStorage.getItem(lsKey('seeded'))) return;

  function isoOffset(days){
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0,10);
  }

  const c1 = genLocalId(), c2 = genLocalId(), c3 = genLocalId(), c4 = genLocalId(), c5 = genLocalId(), c6 = genLocalId();
  const c7 = genLocalId(), c8 = genLocalId(), c9 = genLocalId(), c10 = genLocalId(), c11 = genLocalId();
  const v1 = genLocalId(), v2 = genLocalId(), v3 = genLocalId(), v4 = genLocalId(), v5 = genLocalId(), v6 = genLocalId();
  const v7 = genLocalId(), v8 = genLocalId(), v9 = genLocalId(), v10 = genLocalId(), v11 = genLocalId();

  const clientes = [
    {id:c1, nombre:'Roberto Sánchez', telefono:'2914123456', direccion:'Av. San Martín 450', createdAt: Date.now()-1},
    {id:c2, nombre:'Marisa Gómez', telefono:'2914567890', direccion:'Belgrano 120', createdAt: Date.now()-2},
    {id:c3, nombre:'Diego Fernández', telefono:'2914789012', direccion:'Rivadavia 980', createdAt: Date.now()-3},
    {id:c4, nombre:'Laura Paz', telefono:'2914321098', direccion:'Mitre 210', createdAt: Date.now()-4},
    {id:c5, nombre:'Nico Ibáñez', telefono:'2914998877', direccion:'', createdAt: Date.now()-5},
    {id:c6, nombre:'Marcela Ríos', telefono:'2914112233', direccion:'', createdAt: Date.now()-6},
    {id:c7, nombre:'Fernando Castro', telefono:'2914556677', direccion:'Alsina 340', createdAt: Date.now()-7},
    {id:c8, nombre:'Julieta Herrera', telefono:'2914223344', direccion:'Chiclana 88', createdAt: Date.now()-8},
    {id:c9, nombre:'Pablo Núñez', telefono:'2914667788', direccion:'Zelarrayán 512', createdAt: Date.now()-9},
    {id:c10, nombre:'Ariel Giménez', telefono:'2914998811', direccion:'Casanova 77', createdAt: Date.now()-10},
    {id:c11, nombre:'Sonia Blanco', telefono:'2914776655', direccion:'O\'Higgins 240', createdAt: Date.now()-11}
  ];
  const vehiculos = [
    {id:v1, clienteId:c1, patente:'AD361KQ', marca:'Fiat', modelo:'Cronos', anio:'2021', createdAt: Date.now()-1},
    {id:v2, clienteId:c2, patente:'AC120FG', marca:'Volkswagen', modelo:'Gol', anio:'2019', createdAt: Date.now()-2},
    {id:v3, clienteId:c3, patente:'AB998ZZ', marca:'Toyota', modelo:'Hilux', anio:'2020', createdAt: Date.now()-3},
    {id:v4, clienteId:c4, patente:'AE045LM', marca:'Renault', modelo:'Sandero', anio:'2018', createdAt: Date.now()-4},
    {id:v5, clienteId:c5, patente:'AF221QW', marca:'Ford', modelo:'Ka', anio:'2022', createdAt: Date.now()-5},
    {id:v6, clienteId:c6, patente:'AG556RT', marca:'Chevrolet', modelo:'Onix', anio:'2021', createdAt: Date.now()-6},
    {id:v7, clienteId:c7, patente:'AH778JU', marca:'Peugeot', modelo:'208', anio:'2020', createdAt: Date.now()-7},
    {id:v8, clienteId:c8, patente:'AI334BC', marca:'Volkswagen', modelo:'Suran', anio:'2015', createdAt: Date.now()-8},
    {id:v9, clienteId:c9, patente:'AJ556DE', marca:'Ford', modelo:'Fiesta', anio:'2016', createdAt: Date.now()-9},
    {id:v10, clienteId:c10, patente:'AK112FG', marca:'Chevrolet', modelo:'Prisma', anio:'2018', createdAt: Date.now()-10},
    {id:v11, clienteId:c11, patente:'AL887HI', marca:'Fiat', modelo:'Argo', anio:'2019', createdAt: Date.now()-11}
  ];

  function trabajo(clienteId, vehiculoId, diasAtras, trabajosRealizados, repuestos, manoObra){
    const totalRepuestos = repuestos.reduce((s,r)=>s+r.costo,0);
    return {
      id: genLocalId(), clienteId, vehiculoId, fecha: isoOffset(-diasAtras),
      trabajosRealizados, repuestos, manoObra, observaciones: [],
      total: totalRepuestos + manoObra, createdAt: Date.now() - diasAtras
    };
  }
  const trabajos = [
    trabajo(c1, v1, 400, ['Cambio de correa de distribución','Cambio de aceite y filtro'],
      [{nombre:'Kit distribución', marca:'Contitech', costo:65000},{nombre:'Filtro de aceite', marca:'Mann', costo:7000}], 30000),
    trabajo(c1, v1, 240, ['Cambio de pastillas de freno delanteras','Alineación y balanceo'],
      [{nombre:'Pastillas de freno', marca:'Frasle', costo:38000}], 22000),
    trabajo(c2, v2, 270, ['Service completo','Cambio de aceite y filtros'],
      [{nombre:'Filtro de aceite', marca:'Mann', costo:6500},{nombre:'Filtro de aire', marca:'Mann', costo:9000}], 28000),
    trabajo(c2, v2, 90, ['Cambio de amortiguadores traseros'],
      [{nombre:'Amortiguadores traseros (par)', marca:'Sadar', costo:72000}], 26000),
    trabajo(c3, v3, 165, ['Diagnóstico y reparación de sistema eléctrico','Cambio de batería'],
      [{nombre:'Batería 12x75', marca:'Moura', costo:95000}], 18000),
    trabajo(c4, v4, 210, ['Cambio de embrague completo'],
      [{nombre:'Kit de embrague', marca:'Luk', costo:145000}], 55000),
    // Trabajos de los últimos 6 meses (uno o dos por mes) para que "Inicio" tenga una tendencia real
    // de facturación en mano de obra que mostrar, no solo el mes actual.
    trabajo(c7, v7, 155, ['Cambio de aceite y filtros','Alineación y balanceo'],
      [{nombre:'Filtro de aceite', marca:'Mann', costo:6500},{nombre:'Filtro de aire', marca:'Mann', costo:8500}], 65000),
    trabajo(c8, v8, 129, ['Cambio de correa de distribución y bomba de agua'],
      [{nombre:'Kit distribución + bomba', marca:'Dayco', costo:98000}], 90000),
    trabajo(c9, v9, 98, ['Reparación de motor - junta de tapa de cilindros'],
      [{nombre:'Junta tapa de cilindros', marca:'Ajusa', costo:22000}], 130000),
    trabajo(c10, v10, 68, ['Cambio de embrague completo'],
      [{nombre:'Kit de embrague', marca:'Luk', costo:125000}], 180000),
    trabajo(c11, v11, 37, ['Reparación de caja de cambios'],
      [{nombre:'Kit de sincronizados', marca:'Sadar', costo:140000}], 230000),
    trabajo(c7, v7, 9, ['Reparación integral de motor - cambio de juntas y retenes'],
      [{nombre:'Kit de juntas de motor', marca:'Ajusa', costo:95000},{nombre:'Aceite 10w40 x5L', marca:'Elaion', costo:45000}], 300000),
    trabajo(c9, v9, 3, ['Cambio de aceite y filtro'],
      [{nombre:'Filtro de aceite', marca:'Mann', costo:7000},{nombre:'Aceite 10w40 x4L', marca:'Elaion', costo:32000}], 45000)
  ];

  // Volumen de un taller real (15 a 25 trabajos por mes, en crecimiento) para que Inicio muestre un
  // taller que gana plata y crece. Se genera con una semilla fija, así la demo se ve igual siempre.
  // Los clientes generados tienen su último trabajo en los últimos 140 días (quedan "al día" y no
  // tapan los vencidos de arriba); los trabajos más viejos son de clientes que volvieron, así que
  // también suben la tasa de recompra.
  let semilla = 20261010;
  function rnd(){ semilla = (semilla + 0x6D2B79F5) | 0; let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  function elegir(arr){ return arr[Math.floor(rnd() * arr.length)]; }
  function entre(min, max, paso){ return Math.round((min + rnd() * (max - min)) / paso) * paso; }

  const hoy = new Date(todayISO() + 'T00:00:00Z');
  function diasAtrasDe(anio, mes, dia){ return Math.round((hoy - Date.UTC(anio, mes, dia)) / 86400000); }
  function mesDesplazado(delta){ const d = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() + delta, 1)); return {anio: d.getUTCFullYear(), mes: d.getUTCMonth()}; }
  function diasDelMes(m){ return new Date(Date.UTC(m.anio, m.mes + 1, 0)).getUTCDate(); }
  function mesStrDe(m){ return m.anio + '-' + String(m.mes + 1).padStart(2,'0'); }

  const TIPOS_TRABAJO = [
    {t:['Service completo','Cambio de aceite y filtros'], r:[{nombre:'Filtro de aceite', marca:'Mann', costo:7500},{nombre:'Aceite 10w40 x4L', marca:'Elaion', costo:34000}], mo:[45000, 70000]},
    {t:['Cambio de pastillas de freno delanteras'], r:[{nombre:'Pastillas de freno', marca:'Frasle', costo:42000}], mo:[35000, 55000]},
    {t:['Cambio de correa de distribución y bomba de agua'], r:[{nombre:'Kit distribución + bomba', marca:'Dayco', costo:110000}], mo:[110000, 160000]},
    {t:['Cambio de embrague completo'], r:[{nombre:'Kit de embrague', marca:'Luk', costo:150000}], mo:[150000, 200000]},
    {t:['Cambio de amortiguadores delanteros'], r:[{nombre:'Amortiguadores (par)', marca:'Sadar', costo:85000}], mo:[60000, 90000]},
    {t:['Diagnóstico con escáner','Cambio de bujías'], r:[{nombre:'Bujías (juego)', marca:'NGK', costo:28000}], mo:[40000, 60000]},
    {t:['Cambio de batería','Revisión de alternador'], r:[{nombre:'Batería 12x65', marca:'Moura', costo:98000}], mo:[25000, 40000]},
    {t:['Tren delantero: bujes y rótulas','Alineación y balanceo'], r:[{nombre:'Kit bujes y rótulas', marca:'Vauper', costo:65000}], mo:[80000, 120000]},
    {t:['Reparación de pérdida de aceite - junta de tapa de válvulas'], r:[{nombre:'Junta tapa de válvulas', marca:'Ajusa', costo:18000}], mo:[55000, 80000]},
    {t:['Service de caja automática'], r:[{nombre:'Aceite ATF x6L', marca:'Elaion', costo:72000}], mo:[70000, 95000]}
  ];
  const NOMBRES = ['Martín','Lucía','Gustavo','Carolina','Sergio','Valeria','Hernán','Natalia','Claudio','Romina','Federico','Silvina','Matías','Gabriela','Daniel','Andrea','Javier','Paula','Ricardo','Verónica','Esteban','Mariela','Gonzalo','Lorena'];
  const APELLIDOS = ['López','Martínez','García','Rodríguez','Pérez','Romero','Sosa','Torres','Álvarez','Ruiz','Ramírez','Flores','Acosta','Benítez','Medina','Suárez','Molina','Ortiz','Silva','Rojas','Luna','Cabrera','Ríos','Vega'];
  const AUTOS = [['Volkswagen','Gol'],['Volkswagen','Amarok'],['Fiat','Cronos'],['Fiat','Palio'],['Chevrolet','Onix'],['Chevrolet','Corsa'],['Ford','Ranger'],['Ford','EcoSport'],['Toyota','Etios'],['Toyota','Corolla'],['Renault','Kangoo'],['Renault','Logan'],['Peugeot','208'],['Peugeot','Partner'],['Citroën','C3']];
  const LETRAS = 'ABCDEFGHJKLMNPRSTUVWXYZ';
  const nombresUsados = new Set(clientes.map(c => c.nombre));

  function nuevoClienteGenerado(){
    let nombre;
    do { nombre = elegir(NOMBRES) + ' ' + elegir(APELLIDOS); } while(nombresUsados.has(nombre));
    nombresUsados.add(nombre);
    const c = {id: genLocalId(), nombre, telefono: '2914' + entre(100000, 999999, 1), direccion: '', createdAt: Date.now() - clientes.length};
    const [marca, modelo] = elegir(AUTOS);
    const patente = 'A' + elegir('ABCDEFG') + entre(100, 999, 1) + elegir(LETRAS) + elegir(LETRAS);
    const v = {id: genLocalId(), clienteId: c.id, patente, marca, modelo, anio: String(entre(2012, 2023, 1)), createdAt: c.createdAt};
    clientes.push(c); vehiculos.push(v);
    return {c, v, masViejo: Infinity};
  }

  // Clientes que vinieron una vez y no volvieron: son los que llenan "Recompra" (vencidos y por
  // vencer), que es lo que se vende en la llamada. Van antes del volumen mensual para que sus
  // trabajos cuenten dentro del objetivo de cada mes.
  [195, 205, 214, 226, 238, 247, 259, 268, 156, 163, 171, 178].forEach(diasAtras => {
    const g = nuevoClienteGenerado();
    const tipo = elegir(TIPOS_TRABAJO);
    trabajos.push(trabajo(g.c.id, g.v.id, diasAtras, tipo.t, tipo.r, entre(tipo.mo[0], tipo.mo[1], 5000)));
  });

  // Mano de obra objetivo por mes, del más viejo (hace 5 meses) al anterior al actual: crece mes a mes.
  const OBJETIVO_MO = [1150000, 1280000, 1390000, 1520000, 1680000];
  const nuevos = [];
  for(let k = 0; k <= 5; k++){
    const m = mesDesplazado(-k);
    const esActual = k === 0;
    const ultimoDia = esActual ? hoy.getUTCDate() : diasDelMes(m);
    // El mes en curso va prorrateado a los días que pasaron, pero siempre bien por encima del alquiler.
    const objetivo = esActual ? Math.max(1800000 * ultimoDia / diasDelMes(m), 900000) : OBJETIVO_MO[5 - k];
    let acumulado = trabajos.filter(t => t.fecha.slice(0,7) === mesStrDe(m)).reduce((s,t)=>s+t.manoObra, 0);
    while(acumulado < objetivo){
      let tipo = elegir(TIPOS_TRABAJO);
      let manoObra = entre(tipo.mo[0], tipo.mo[1], 5000);
      // Último trabajo del mes: uno chico que cierre cerca del objetivo, así la curva no salta.
      const resto = objetivo - acumulado;
      if(manoObra > resto + 20000){ tipo = TIPOS_TRABAJO[6]; manoObra = Math.max(25000, Math.ceil(resto / 5000) * 5000); }
      nuevos.push({diasAtras: diasAtrasDe(m.anio, m.mes, 1 + Math.floor(rnd() * ultimoDia)), tipo, manoObra});
      acumulado += manoObra;
    }
  }
  // Del más nuevo al más viejo: los recientes pueden ser clientes nuevos; los de hace más de 140 días
  // siempre son de alguien que después volvió (al menos 45 días más tarde).
  const generados = [];
  nuevos.sort((a,b) => a.diasAtras - b.diasAtras).forEach(f => {
    const candidatos = generados.filter(g => g.masViejo - f.diasAtras <= -45);
    let g = null;
    if(candidatos.length && (f.diasAtras > 140 || rnd() < 0.5)) g = elegir(candidatos);
    if(!g){
      if(f.diasAtras > 140) g = generados[0];
      else { g = nuevoClienteGenerado(); generados.push(g); }
    }
    g.masViejo = Math.max(g.masViejo === Infinity ? 0 : g.masViejo, f.diasAtras);
    trabajos.push(trabajo(g.c.id, g.v.id, f.diasAtras, f.tipo.t, f.tipo.r, f.manoObra));
  });

  // Actas de ingreso: los tres autos que están en Estado autos entraron con su acta, y dos
  // trabajos recientes ya entregados también la tienen (así se ve el historial).
  function firmaDemo(nombre){
    const ini = (nombre||'').split(' ').map(p=>p[0]).join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="100" viewBox="0 0 300 100"><path d="M18 70 C40 20, 62 20, 58 62 S 90 90, 104 48 C112 26, 126 30, 120 58 C116 76, 140 74, 150 52 C158 36, 170 40, 172 58 C174 72, 196 70, 206 50 S 240 40, 282 56" fill="none" stroke="#111" stroke-width="3.2" stroke-linecap="round"/><text x="226" y="88" font-family="Brush Script MT, cursive" font-size="22" fill="#111">${ini}</text></svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
  const ingresos = [];
  function ingreso(clienteId, vehiculoId, horasAtras, extra){
    const c = clientes.find(x => x.id === clienteId);
    const reg = Object.assign({
      id: genLocalId(), numero: 0, clienteId, vehiculoId, estado: 'en_taller', demo: true,
      fotos: {}, extras: [], llaves: '1', testigos: {}, observaciones: '', danios: {},
      elementos: {auxilio:true, gato:true, documentacion:true, tapa:true, alfombras:true},
      firma: firmaDemo(c.nombre), aclaracion: c.nombre, createdAt: Date.now() - horasAtras*3600000
    }, extra);
    ingresos.push(reg);
    return reg.id;
  }
  ingreso(c7, v7, 9*24+5, {estado:'entregado', km:'98.450', combustible:2, motivo:'Pierde aceite y tira humo azul', danios:{parag_del:'rayon'}});
  ingreso(c9, v9, 3*24+4, {estado:'entregado', km:'121.300', combustible:1, motivo:'Cambio de aceite y filtro', danios:{puerta_tras_der:'abolladura'}});
  const ingC5 = ingreso(c5, v5, 3, {km:'38.120', combustible:0, motivo:'Se apaga en marcha lenta', danios:{baul:'rayon'}, testigos:{motor:true}, observaciones:'Entra con reserva de combustible.'});
  const ingC6 = ingreso(c6, v6, 2*24+2, {km:'64.870', combustible:2, motivo:'Ruido en la distribución', danios:{parag_tras:'roto', luneta:'rayon'}, llaves:'2'});
  const ingC4 = ingreso(c4, v4, 24+3, {km:'142.015', combustible:3, motivo:'Ruido en la suspensión delantera', danios:{parag_del:'rayon', guarda_del_izq:'abolladura', puerta_del_izq:'rayon'}, observaciones:'Cubiertas delanteras gastadas. Deja anteojos en la guantera.'});
  ingresos.sort((a,b)=>a.createdAt-b.createdAt).forEach((x, j) => { x.numero = 231 + j; });

  const ordenes = [
    {id:genLocalId(), clienteId:c5, vehiculoId:v5, ingresoId:ingC5, estado:'recibido', fechaIngreso: isoOffset(0), nota:'Se apaga en marcha lenta, revisar ralentí.', createdAt: Date.now()-100},
    {id:genLocalId(), clienteId:c6, vehiculoId:v6, ingresoId:ingC6, estado:'esperando_repuesto', fechaIngreso: isoOffset(-2), nota:'Esperando cubre-cadena de distribución.', createdAt: Date.now()-200},
    {id:genLocalId(), clienteId:c4, vehiculoId:v4, ingresoId:ingC4, estado:'diagnostico', fechaIngreso: isoOffset(-1), nota:'Ruido en la suspensión delantera.', createdAt: Date.now()-150}
  ];

  // Gastos fijos de cada mes (alquiler, servicios, insumos), fechados dentro de su mes. En el mes en
  // curso solo aparecen los que ya vencieron a la fecha de hoy.
  const gastos = [];
  const GASTOS_MES = [
    {dia:1, descripcion:'Alquiler del local', monto:420000},
    {dia:5, descripcion:'Insumos de taller (trapos, limpiador de frenos, etc.)', monto:55000},
    {dia:8, descripcion:'Luz', monto:68000},
    {dia:10, descripcion:'Internet y teléfono', monto:28000},
    {dia:12, descripcion:'Gas', monto:29000}
  ];
  for(let k = 0; k <= 5; k++){
    const m = mesDesplazado(-k);
    GASTOS_MES.forEach(g => {
      if(k === 0 && g.dia > hoy.getUTCDate()) return;
      const diasAtras = diasAtrasDe(m.anio, m.mes, g.dia);
      gastos.push({id: genLocalId(), fecha: isoOffset(-diasAtras), descripcion: g.descripcion, monto: g.monto, createdAt: Date.now() - diasAtras});
    });
  }

  const contactos = [
    {id:genLocalId(), clienteId:c2, vehiculoId:v2, tipo:'recordatorio', fecha: isoOffset(-20), createdAt: Date.now()-20},
    {id:genLocalId(), clienteId:c1, vehiculoId:null, tipo:'promo', fecha: isoOffset(-15), createdAt: Date.now()-15}
  ];

  lsWriteAll('clientes', clientes);
  lsWriteAll('vehiculos', vehiculos);
  lsWriteAll('trabajos', trabajos);
  lsWriteAll('ordenes', ordenes);
  lsWriteAll('ingresos', ingresos);
  lsWriteAll('gastos', gastos);
  lsWriteAll('contactos', contactos);
  localStorage.setItem(lsKey('seeded'), '1');
}

/* Stock y presupuestos tienen su propia marca de sembrado: así también aparecen en un navegador
   que ya había abierto la demo antes de que existieran estas secciones (sin pisar sus datos). */
function seedStockYPresupuestosIfEmpty(){
  if(localStorage.getItem(lsKey('seeded_stock'))) return;
  const hoy = new Date();
  function isoOffset(days){ const d = new Date(hoy); d.setDate(d.getDate() + days); return d.toISOString().slice(0,10); }

  // [descripción, marca, rubro, compatibilidad, stock, mínimo, costo, ubicación, proveedor]
  const BASE = [
    ['Filtro de aceite', 'Mann', 'Filtros', 'Fiat Cronos / Argo 1.3', 8, 4, 5400, 'A1', 'Distribuidora Sur'],
    ['Filtro de aceite', 'Mann', 'Filtros', 'VW Gol / Suran 1.6', 6, 4, 5000, 'A1', 'Distribuidora Sur'],
    ['Filtro de aire', 'Mann', 'Filtros', 'Chevrolet Onix / Prisma', 2, 3, 6400, 'A2', 'Distribuidora Sur'],
    ['Filtro de combustible', 'Fram', 'Filtros', 'Toyota Hilux 2.8', 3, 2, 9800, 'A2', 'Distribuidora Sur'],
    ['Aceite 10w40 semisintético x4L', 'Elaion', 'Lubricantes', 'Universal', 9, 6, 24000, 'B1', 'Lubricentro Mayorista'],
    ['Aceite 5w30 sintético x4L', 'Shell Helix', 'Lubricantes', 'Universal', 4, 4, 38000, 'B1', 'Lubricentro Mayorista'],
    ['Aceite ATF x1L', 'Elaion', 'Lubricantes', 'Cajas automáticas', 10, 6, 9500, 'B2', 'Lubricentro Mayorista'],
    ['Pastillas de freno delanteras', 'Frasle', 'Frenos', 'Fiat Cronos / Argo', 3, 2, 29000, 'C1', 'Frenos del Sur'],
    ['Pastillas de freno delanteras', 'Frasle', 'Frenos', 'VW Gol Trend', 1, 2, 27500, 'C1', 'Frenos del Sur'],
    ['Discos de freno (par)', 'Fremax', 'Frenos', 'Renault Sandero / Logan', 2, 1, 62000, 'C2', 'Frenos del Sur'],
    ['Líquido de frenos DOT4 x500ml', 'Bosch', 'Frenos', 'Universal', 7, 4, 6200, 'C2', 'Frenos del Sur'],
    ['Bujías (juego x4)', 'NGK', 'Encendido', 'Chevrolet Onix 1.4', 4, 2, 19000, 'D1', 'Distribuidora Sur'],
    ['Kit distribución + bomba de agua', 'Dayco', 'Distribución', 'Chevrolet Onix 1.4', 0, 1, 82000, 'D2', 'Distribuidora Sur'],
    ['Kit distribución', 'Contitech', 'Distribución', 'Fiat Cronos 1.3', 2, 1, 51000, 'D2', 'Distribuidora Sur'],
    ['Amortiguador delantero', 'Sadar', 'Suspensión', 'Renault Sandero', 2, 2, 38000, 'E1', 'Repuestos Bahía'],
    ['Kit bujes y rótulas', 'Vauper', 'Suspensión', 'VW Gol / Suran', 1, 1, 46000, 'E1', 'Repuestos Bahía'],
    ['Kit de embrague', 'Luk', 'Embrague', 'VW Gol 1.6', 1, 1, 112000, 'E2', 'Repuestos Bahía'],
    ['Batería 12x65', 'Moura', 'Eléctrico', 'Universal', 2, 2, 74000, 'F1', 'Baterías Centro'],
    ['Lámpara H4 60/55W', 'Philips', 'Eléctrico', 'Universal', 12, 6, 3800, 'F2', 'Baterías Centro'],
    ['Refrigerante x1L', 'Paraflu', 'Refrigeración', 'Universal', 3, 6, 4800, 'B2', 'Lubricentro Mayorista'],
    ['Junta tapa de válvulas', 'Ajusa', 'Juntas y retenes', 'Peugeot 208 1.6', 1, 1, 14500, 'G1', 'Repuestos Bahía']
  ];
  const repuestos = BASE.map((b, k) => ({
    id: genLocalId(), codigo: 'R-' + String(k + 1).padStart(4,'0'), descripcion: b[0], marca: b[1], rubro: b[2],
    compatibilidad: b[3], stock: b[4], stockMinimo: b[5], costo: b[6], precioVenta: Math.round(b[6] * 1.4 / 100) * 100,
    ubicacion: 'Estante ' + b[7], proveedor: b[8], activo: true, createdAt: Date.now() - k
  }));
  const R = (desc, compat) => repuestos.find(r => r.descripcion === desc && (!compat || r.compatibilidad.includes(compat)));

  // Movimientos: el alta de cada repuesto y algunas entradas/salidas recientes, para que la ficha
  // de un repuesto muestre un historial creíble.
  const movimientosStock = [];
  repuestos.forEach(r => movimientosStock.push({id: genLocalId(), repuestoId: r.id, tipo:'inicial', cantidad: r.stock + 2, detalle:'Carga inicial del depósito', fecha: isoOffset(-40), createdAt: Date.now() - 40*86400000}));
  repuestos.forEach(r => movimientosStock.push({id: genLocalId(), repuestoId: r.id, tipo:'salida', cantidad: -2, detalle:'Usado en trabajos del mes', fecha: isoOffset(-12), createdAt: Date.now() - 12*86400000}));
  movimientosStock.push({id: genLocalId(), repuestoId: R('Aceite 10w40 semisintético x4L').id, tipo:'entrada', cantidad: 6, detalle:'Lubricentro Mayorista · remito 0003-1182', fecha: isoOffset(-5), createdAt: Date.now() - 5*86400000});
  // La entrada de arriba ya está incluida en el stock actual: se compensa la carga inicial.
  movimientosStock.find(m => m.repuestoId === R('Aceite 10w40 semisintético x4L').id && m.tipo === 'inicial').cantidad -= 6;

  // Presupuestos: usan clientes y vehículos que ya existen en la demo.
  const clientes = lsReadAll('clientes'), vehiculos = lsReadAll('vehiculos');
  const cli = (nombre) => clientes.find(c => c.nombre === nombre);
  const veh = (c) => c && vehiculos.find(v => v.clienteId === c.id);
  const presupuestos = [];
  let numero = 38;
  function presu(nombre, diasAtras, estado, items, extra){
    const c = cli(nombre);
    if(!c) return;
    const v = veh(c);
    const p = Object.assign({id: genLocalId(), numero: numero++, clienteId: c.id, vehiculoId: v ? v.id : null, fecha: isoOffset(-diasAtras),
      validezDias: 15, descuento: 0, notas: '', estado, items, createdAt: Date.now() - diasAtras*86400000}, extra || {});
    if(estado === 'aprobado') p.aprobadoFecha = isoOffset(-Math.max(0, diasAtras - 1));
    presupuestos.push(p);
  }
  const rep = (r, cant) => ({tipo:'rep', repuestoId: r.id, descripcion: r.descripcion + ' ' + r.marca, cantidad: cant, precio: r.precioVenta});
  const mo = (descripcion, precio) => ({tipo:'mo', descripcion, precio});

  presu('Fernando Castro', 34, 'aprobado', [mo('Cambio de aceite y filtro', 25000), rep(R('Aceite 10w40 semisintético x4L'), 1)]);
  presu('Ariel Giménez', 22, 'rechazado', [mo('Cambio de amortiguadores delanteros', 70000), {tipo:'rep', descripcion:'Amortiguadores delanteros Monroe (par)', cantidad:1, precio:118000}]);
  presu('Sonia Blanco', 15, 'aprobado', [mo('Service completo', 55000), rep(R('Aceite 5w30 sintético x4L'), 1), rep(R('Filtro de aceite','Cronos'), 1)]);
  // Abiertos: lo que se ve primero en la llamada.
  presu('Laura Paz', 1, 'enviado', [mo('Cambio de amortiguadores delanteros', 65000), mo('Alineación y balanceo', 22000), rep(R('Amortiguador delantero'), 2), rep(R('Discos de freno (par)'), 1)],
    {notas: 'Las cubiertas delanteras están gastadas: te pasamos precio aparte si querés cambiarlas.'});
  presu('Marcela Ríos', 2, 'enviado', [mo('Cambio de kit de distribución y bomba de agua', 120000), rep(R('Kit distribución + bomba de agua'), 1), rep(R('Refrigerante x1L'), 4)],
    {notas: 'El kit se pide al proveedor: llega en 24 hs.'});
  presu('Nico Ibáñez', 0, 'pendiente', [mo('Diagnóstico con escáner', 25000), mo('Limpieza de cuerpo de aceleración', 30000), rep(R('Bujías (juego x4)'), 1)], {descuento: 10});

  presupuestos.forEach(p => { const t = p.items.reduce((s,it)=>s + (it.precio||0) * (it.tipo==='rep' ? (it.cantidad||1) : 1), 0); p.total = Math.round(t * (1 - (p.descuento||0)/100)); });

  lsWriteAll('repuestos', repuestos);
  lsWriteAll('movimientosStock', movimientosStock);
  lsWriteAll('presupuestos', presupuestos);
  localStorage.setItem(lsKey('seeded_stock'), '1');
}
