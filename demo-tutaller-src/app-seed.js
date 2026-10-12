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

  const ordenes = [
    {id:genLocalId(), clienteId:c5, vehiculoId:v5, estado:'recibido', fechaIngreso: isoOffset(0), nota:'Se apaga en marcha lenta, revisar ralentí.', createdAt: Date.now()-100},
    {id:genLocalId(), clienteId:c6, vehiculoId:v6, estado:'esperando_repuesto', fechaIngreso: isoOffset(-2), nota:'Esperando cubre-cadena de distribución.', createdAt: Date.now()-200},
    {id:genLocalId(), clienteId:c4, vehiculoId:v4, estado:'diagnostico', fechaIngreso: isoOffset(-1), nota:'Ruido en la suspensión delantera.', createdAt: Date.now()-150}
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
  lsWriteAll('gastos', gastos);
  lsWriteAll('contactos', contactos);
  localStorage.setItem(lsKey('seeded'), '1');
}
