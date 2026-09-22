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

  const ordenes = [
    {id:genLocalId(), clienteId:c5, vehiculoId:v5, estado:'recibido', fechaIngreso: isoOffset(0), nota:'Se apaga en marcha lenta, revisar ralentí.', createdAt: Date.now()-100},
    {id:genLocalId(), clienteId:c6, vehiculoId:v6, estado:'esperando_repuesto', fechaIngreso: isoOffset(-2), nota:'Esperando cubre-cadena de distribución.', createdAt: Date.now()-200},
    {id:genLocalId(), clienteId:c4, vehiculoId:v4, estado:'diagnostico', fechaIngreso: isoOffset(-1), nota:'Ruido en la suspensión delantera.', createdAt: Date.now()-150}
  ];

  const gastos = [
    {id:genLocalId(), fecha: isoOffset(0), descripcion:'Alquiler del local', monto:250000, createdAt: Date.now()-10},
    {id:genLocalId(), fecha: isoOffset(-5), descripcion:'Luz', monto:45000, createdAt: Date.now()-11},
    {id:genLocalId(), fecha: isoOffset(-10), descripcion:'Insumos de taller (trapos, limpiador de frenos, etc.)', monto:38000, createdAt: Date.now()-12},
    // Gastos fijos de meses anteriores (un total por mes, sin desglosar) — solo para que el
    // gráfico de "Economía del taller" en Inicio tenga con qué comparar los últimos 6 meses.
    {id:genLocalId(), fecha: isoOffset(-37), descripcion:'Alquiler y servicios', monto:292000, createdAt: Date.now()-37},
    {id:genLocalId(), fecha: isoOffset(-68), descripcion:'Alquiler y servicios', monto:285000, createdAt: Date.now()-68},
    {id:genLocalId(), fecha: isoOffset(-98), descripcion:'Alquiler y servicios', monto:278000, createdAt: Date.now()-98},
    {id:genLocalId(), fecha: isoOffset(-129), descripcion:'Alquiler y servicios', monto:270000, createdAt: Date.now()-129},
    {id:genLocalId(), fecha: isoOffset(-155), descripcion:'Alquiler y servicios', monto:265000, createdAt: Date.now()-155}
  ];

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
