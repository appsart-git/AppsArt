'use strict';
/* ===================== DATOS DE EJEMPLO (solo demo de campaña) ===================== */
// Esta es la demo que se muestra en la llamada de venta. Arranca con una base de ejemplo ya
// cargada (productos con stock bajo/agotado, clientes y proveedores con saldos pendientes,
// historial de ventas/compras) para que se vea "viva" desde el primer segundo. Se siembra una
// sola vez (marcador en localStorage); "Reiniciar datos de ejemplo" en Configuración la vuelve a
// poner como el día uno.

function seedDemoDataIfEmpty(){
  if(localStorage.getItem(lsKey('seeded'))) return;

  function isoOffset(days){
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }

  const p1 = genLocalId(), p2 = genLocalId(), p3 = genLocalId(), p4 = genLocalId(), p5 = genLocalId(), p6 = genLocalId();
  const proveedores = [
    {id:p1, nombre:'Suspensión y Transmisión SRL', telefono:'2914112200', direccion:'Parque industrial, Lote 12', condicionesPago:'Cuenta corriente a 30 días', saldo:45000, createdAt:Date.now()-1},
    {id:p2, nombre:'Distribuidora Frenos Total', telefono:'2914223311', direccion:'Ruta 3 Km 8', condicionesPago:'Contado con factura', saldo:0, createdAt:Date.now()-2},
    {id:p3, nombre:'Filtros Mann - Distribuidor Oficial', telefono:'2914334422', direccion:'Av. Colón 1450', condicionesPago:'Cuenta corriente a 15 días', saldo:12800, createdAt:Date.now()-3},
    {id:p4, nombre:'Baterías Moura Bahía', telefono:'2914445533', direccion:'Brown 780', condicionesPago:'Contado', saldo:0, createdAt:Date.now()-4},
    {id:p5, nombre:'Dayco Correas y Distribución', telefono:'2914556644', direccion:'Sarmiento 220', condicionesPago:'Contado', saldo:0, createdAt:Date.now()-5},
    {id:p6, nombre:'Escape y Refrigeración Sur', telefono:'2914667755', direccion:'Alsina 990', condicionesPago:'Contado', saldo:0, createdAt:Date.now()-6}
  ];

  const c1 = genLocalId(), c2 = genLocalId(), c3 = genLocalId(), c4 = genLocalId(), c5 = genLocalId(), c6 = genLocalId(), c7 = genLocalId(), c8 = genLocalId();
  const clientes = [
    {id:c1, nombre:'Taller Don Ramón', telefono:'2914123456', direccion:'Av. San Martín 450', saldo:35000, createdAt:Date.now()-1},
    {id:c2, nombre:'Taller El Motorista', telefono:'2914234567', direccion:'Belgrano 120', saldo:0, createdAt:Date.now()-2},
    {id:c3, nombre:'Lucas Ferreyra', telefono:'2914345678', direccion:'Rivadavia 980', saldo:0, createdAt:Date.now()-3},
    {id:c4, nombre:'Camila Suárez', telefono:'2914456789', direccion:'Mitre 210', saldo:28000, createdAt:Date.now()-4},
    {id:c5, nombre:'Taller Rápido Sur', telefono:'2914567890', direccion:'Zelarrayán 512', saldo:15000, createdAt:Date.now()-5},
    {id:c6, nombre:'Martín Alonso', telefono:'2914678901', direccion:'Casanova 77', saldo:0, createdAt:Date.now()-6},
    {id:c7, nombre:'Gomería y Repuestos Centro', telefono:'2914789012', direccion:'Chiclana 88', saldo:0, createdAt:Date.now()-7},
    {id:c8, nombre:'Valeria Duarte', telefono:'2914890123', direccion:'', saldo:0, createdAt:Date.now()-8}
  ];

  const pr1=genLocalId(), pr2=genLocalId(), pr3=genLocalId(), pr4=genLocalId(), pr5=genLocalId(),
        pr6=genLocalId(), pr7=genLocalId(), pr8=genLocalId(), pr9=genLocalId(), pr10=genLocalId();
  const productos = [
    {id:pr1, codigoInterno:'REP-0001', codigoProveedor:'W712', descripcion:'Filtro de aceite Mann', rubro:'Filtros', compatibilidad:'Fiat/VW/Chevrolet varios', stock:24, stockMinimo:5, ubicacion:'Estante A1', costoUltimo:2200, precioVenta:4500, proveedorHabitualId:p3, activo:true, createdAt:Date.now()-1},
    {id:pr2, codigoInterno:'REP-0002', codigoProveedor:'KN-33', descripcion:'Filtro de aire', rubro:'Filtros', compatibilidad:'Ford Ka/Fiesta', stock:3, stockMinimo:5, ubicacion:'Estante A2', costoUltimo:3100, precioVenta:6200, proveedorHabitualId:p3, activo:true, createdAt:Date.now()-2},
    {id:pr3, codigoInterno:'REP-0003', codigoProveedor:'PD-880', descripcion:'Pastillas de freno delanteras Frasle', rubro:'Frenos', compatibilidad:'VW Gol/Voyage', stock:12, stockMinimo:4, ubicacion:'Estante B1', costoUltimo:18500, precioVenta:34000, proveedorHabitualId:p2, activo:true, createdAt:Date.now()-3},
    {id:pr4, codigoInterno:'REP-0004', codigoProveedor:'LK-620', descripcion:'Kit de embrague Luk', rubro:'Motor', compatibilidad:'Renault Sandero/Logan', stock:2, stockMinimo:3, ubicacion:'Depósito', costoUltimo:95000, precioVenta:165000, proveedorHabitualId:p1, activo:true, createdAt:Date.now()-4},
    {id:pr5, codigoInterno:'REP-0005', codigoProveedor:'M12X75', descripcion:'Batería 12x75 Moura', rubro:'Eléctrico', compatibilidad:'Universal', stock:8, stockMinimo:3, ubicacion:'Estante C1', costoUltimo:62000, precioVenta:98000, proveedorHabitualId:p4, activo:true, createdAt:Date.now()-5},
    {id:pr6, codigoInterno:'REP-0006', codigoProveedor:'DY-104', descripcion:'Correa de distribución Dayco', rubro:'Correas y transmisión', compatibilidad:'Chevrolet Onix/Prisma', stock:15, stockMinimo:5, ubicacion:'Estante B3', costoUltimo:14500, precioVenta:27000, proveedorHabitualId:p5, activo:true, createdAt:Date.now()-6},
    {id:pr7, codigoInterno:'REP-0007', codigoProveedor:'SD-771', descripcion:'Amortiguador trasero Sadar', rubro:'Suspensión', compatibilidad:'Toyota Hilux', stock:6, stockMinimo:2, ubicacion:'Depósito', costoUltimo:42000, precioVenta:78000, proveedorHabitualId:p1, activo:true, createdAt:Date.now()-7},
    {id:pr8, codigoInterno:'REP-0008', codigoProveedor:'NGK-IR', descripcion:'Bujía NGK Iridium', rubro:'Motor', compatibilidad:'Universal nafta', stock:40, stockMinimo:10, ubicacion:'Estante A3', costoUltimo:3200, precioVenta:6500, proveedorHabitualId:p5, activo:true, createdAt:Date.now()-8},
    {id:pr9, codigoInterno:'REP-0009', codigoProveedor:'BSL-220', descripcion:'Silenciador trasero', rubro:'Escape', compatibilidad:'Peugeot 208', stock:0, stockMinimo:2, ubicacion:'Depósito', costoUltimo:38000, precioVenta:68000, proveedorHabitualId:p6, activo:true, createdAt:Date.now()-9},
    {id:pr10, codigoInterno:'REP-0010', codigoProveedor:'VL-450', descripcion:'Radiador Valeo', rubro:'Refrigeración', compatibilidad:'Fiat Cronos/Argo', stock:5, stockMinimo:2, ubicacion:'Depósito', costoUltimo:58000, precioVenta:99000, proveedorHabitualId:p6, activo:true, createdAt:Date.now()-10}
  ];

  function ventaItem(prod, cantidad, descuentoPct, vehiculo){
    return {productoId:prod.id, descripcion:prod.descripcion, cantidad, precioUnitario:prod.precioVenta, costoUnitario:prod.costoUltimo, descuentoPct:descuentoPct||0, vehiculo:vehiculo||'', sinStock:false};
  }
  function ventaTotales(items){
    const subtotal = items.reduce((s,it)=>s+it.cantidad*it.precioUnitario,0);
    const total = items.reduce((s,it)=>s+it.cantidad*it.precioUnitario*(1-(it.descuentoPct||0)/100),0);
    return {subtotal, total, descuentoTotal: subtotal-total};
  }

  const ventasDef = [
    {numero:1, diasAtras:25, cliente:clientes[6], items:[ventaItem(productos[5],3,0,'')], formaPago:'cuenta corriente'},
    {numero:2, diasAtras:20, cliente:clientes[0], items:[ventaItem(productos[3],1,0,'Fiat Cronos')], formaPago:'cuenta corriente'},
    {numero:3, diasAtras:15, cliente:clientes[4], items:[ventaItem(productos[2],2,0,'VW Gol'),ventaItem(productos[7],4,0,'')], formaPago:'cuenta corriente'},
    {numero:4, diasAtras:12, cliente:clientes[3], items:[ventaItem(productos[4],1,0,'')], formaPago:'parcial', montoAbonado:50000},
    {numero:5, diasAtras:8, cliente:clientes[1], items:[ventaItem(productos[5],1,0,'Chevrolet Onix')], formaPago:'contado'},
    {numero:6, diasAtras:5, cliente:clientes[2], items:[ventaItem(productos[0],1,0,''),ventaItem(productos[7],2,0,'')], formaPago:'contado'},
    {numero:7, diasAtras:3, cliente:clientes[5], items:[ventaItem(productos[6],1,0,'Toyota Hilux')], formaPago:'contado'},
    {numero:8, diasAtras:2, cliente:clientes[7], items:[ventaItem(productos[7],1,0,'')], formaPago:'contado', anulada:true}
  ];
  const ventas = ventasDef.map(v => {
    const {subtotal, total, descuentoTotal} = ventaTotales(v.items);
    let montoAbonado = total, saldoPendiente = 0;
    if(v.formaPago==='cuenta corriente'){ montoAbonado = 0; saldoPendiente = total; }
    else if(v.formaPago==='parcial'){ montoAbonado = v.montoAbonado; saldoPendiente = Math.max(0,total-montoAbonado); }
    return {
      id:genLocalId(), numero:v.numero, fecha:isoOffset(-v.diasAtras),
      clienteId:v.cliente.id, clienteNombre:v.cliente.nombre,
      items:v.items, subtotal, descuentoTotal, total, formaPago:v.formaPago, montoAbonado, saldoPendiente,
      anulada:!!v.anulada, createdAt:Date.now()-v.diasAtras
    };
  });

  function compraItem(prod, cantidad){
    return {productoId:prod.id, descripcion:prod.descripcion, cantidad, costoUnitario:prod.costoUltimo, vehiculo:''};
  }
  const comprasDef = [
    {diasAtras:30, proveedor:proveedores[3], items:[compraItem(productos[4],8)], formaPago:'contado', nroFacturaProveedor:'0001-00019823'},
    {diasAtras:28, proveedor:proveedores[4], items:[compraItem(productos[5],15),compraItem(productos[7],40)], formaPago:'contado', nroFacturaProveedor:'0003-00045210'},
    {diasAtras:26, proveedor:proveedores[1], items:[compraItem(productos[2],12)], formaPago:'contado', nroFacturaProveedor:'0002-00088341'},
    {diasAtras:24, proveedor:proveedores[5], items:[compraItem(productos[9],5)], formaPago:'contado', nroFacturaProveedor:'0004-00012987'},
    {diasAtras:22, proveedor:proveedores[0], items:[compraItem(productos[3],3),compraItem(productos[6],6)], formaPago:'cuenta corriente', nroFacturaProveedor:'A-4521', montoAbonado:492000},
    {diasAtras:18, proveedor:proveedores[2], items:[compraItem(productos[0],30),compraItem(productos[1],10)], formaPago:'cuenta corriente', nroFacturaProveedor:'0001-00023456', montoAbonado:84200, origenOCR:true}
  ];
  const compras = comprasDef.map(c => {
    const total = c.items.reduce((s,it)=>s+it.cantidad*it.costoUnitario,0);
    let montoAbonado = total, saldoPendiente = 0;
    if(c.formaPago==='cuenta corriente'){ montoAbonado = c.montoAbonado||0; saldoPendiente = Math.max(0,total-montoAbonado); }
    return {
      id:genLocalId(), fecha:isoOffset(-c.diasAtras), proveedorId:c.proveedor.id, proveedorNombre:c.proveedor.nombre,
      items:c.items, total, formaPago:c.formaPago, montoAbonado, saldoPendiente,
      origenOCR:!!c.origenOCR, sinStock:false, ventaVinculadaId:null, nroFacturaProveedor:c.nroFacturaProveedor,
      anulada:false, createdAt:Date.now()-c.diasAtras
    };
  });

  const pagos = [
    {id:genLocalId(), tipo:'cliente', entidadId:c1, monto:130000, nota:'Transferencia', anulada:false, createdAt:Date.now()-10},
    {id:genLocalId(), tipo:'cliente', entidadId:c5, monto:79000, nota:'Efectivo', anulada:false, createdAt:Date.now()-6},
    {id:genLocalId(), tipo:'cliente', entidadId:c4, monto:20000, nota:'Transferencia', anulada:false, createdAt:Date.now()-4},
    {id:genLocalId(), tipo:'cliente', entidadId:c7, monto:81000, nota:'Cheque', anulada:false, createdAt:Date.now()-18},
    {id:genLocalId(), tipo:'proveedor', entidadId:p3, monto:84200, nota:'Transferencia', anulada:false, createdAt:Date.now()-14},
    {id:genLocalId(), tipo:'proveedor', entidadId:p1, monto:492000, nota:'Transferencia', anulada:false, createdAt:Date.now()-16}
  ];

  lsWriteAll('productos', productos);
  lsWriteAll('clientes', clientes);
  lsWriteAll('proveedores', proveedores);
  lsWriteAll('ventas', ventas);
  lsWriteAll('compras', compras);
  lsWriteAll('pagos', pagos);
  localStorage.setItem(lsKey('config_contadores'), JSON.stringify({producto:10, venta:8}));
  localStorage.setItem(lsKey('seeded'), '1');
}
