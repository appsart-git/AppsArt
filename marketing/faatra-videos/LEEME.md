# Videos FAATRA (jornada 28/10)

Hay dos videos, cada uno en tres formatos:
- **vertical** para el celular (1080×1920);
- **tablet**, horizontal (1920×1080), con la demo dentro de un celular;
- **pc**, horizontal (1920×1080), con la demo en vista de compu dentro de una ventana de navegador y un puntero de mouse en vez de los toques.

Todos van a 30 fps, en H.264 con pista AAC en silencio. Por ahora no tienen voz.

| Archivo | Duración | Peso |
|---|---|---|
| `appsart-talleres-vertical.mp4` | 69 s | 8,9 MB |
| `appsart-talleres-tablet.mp4` | 69 s | 8,6 MB |
| `appsart-talleres-pc.mp4` | 69 s | 8,8 MB |
| `appsart-repuestos-vertical.mp4` | 63 s | 8,1 MB |
| `appsart-repuestos-tablet.mp4` | 63 s | 7,7 MB |
| `appsart-repuestos-pc.mp4` | 63 s | 7,6 MB |

El 28/10 se regrabó el de talleres con los módulos nuevos de la demo Tu Taller: **Ingreso** (escena 2) y **Presupuestos** (escena 4).

## Cómo está armado

En esta PC no hay Node, Python ni ffmpeg, así que no se pudo usar Playwright ni Remotion. Se usó Edge headless y un canvas, con el mismo método del reel de ReportCar:

- `serve.ps1` sirve esta carpeta y las dos demos: `/tt/` es la demo de talleres y `/rp/` la de repuestos. Se levanta con la configuración `faatra-videos` de `.claude/launch.json`, en el puerto 8796.
- `scenes.js` tiene el **guion de clics** de cada escena, que cumple el papel de los scripts de Playwright. Cada paso deja la app en un estado y genera una captura. `tap` indica qué se toca después, y ahí el montaje dibuja el círculo terracota.
- `capture.ps1 v1s2 v1s3 ...` regraba las escenas que se le pasen y guarda los resultados en `out/shots/`. Cada corrida usa un perfil limpio, así que la demo arranca siempre con sus datos de ejemplo.
- `studio.html` es el montaje. Ahí están los titulares (`VIDEOS`), las duraciones y las placas. Las palabras clave en terracota van `*entre asteriscos*`.
- `render.ps1` tiene estos modos:
  - `still <v> <t...>`: saca cuadros sueltos.
  - `qr <v>`: decodifica el QR de la placa final.
  - `enc <v>`: exporta el MP4 a `out/`.
  - `<v>` es `1` (talleres) o `2` (repuestos). Con una `t` al final (`1t`, `2t`) sale en formato tablet; con una `p` (`1p`, `2p`), en formato pc. Las capturas de la versiÃ³n pc son las escenas `<id>pc` de `scenes.js` (1440Ã810): `capture.ps1 v1s2pc v1s3pc ...`.
  - `verify <v>`: abre el MP4 y saca cuadros reales.

**Para cambiar un texto**, editás `VIDEOS` en `studio.html` y después corrés `render.ps1 enc 1` (o `enc 2`, `enc 1t`, `enc 2t`, `enc 1p`, `enc 2p`). Tarda alrededor de 30 s.

**Si después se suma voz**, cada locución tiene que decir exactamente el titular de su escena, y la duración de la escena pasa a ser la del audio más 0,5 s. Para eso hay que ajustar `dur` y `shots` en `VIDEOS`.

## Escenas adaptadas porque la demo es distinta al guion

1. **Talleres, escena 2 (orden de trabajo).** Se muestra el módulo **Ingreso**: se cargan cliente, WhatsApp, patente y vehículo, se marcan los daños en el plano, firma el cliente y sale el acta. Las fotos del auto quedan vacías porque en la demo no hay fotos cargadas. La firma es un garabato dibujado por el script.
2. **Talleres, escena 4.** Ya usa el módulo **Presupuestos**, así que el texto volvió al del brief: "Armá el presupuesto y mandalo en PDF por WhatsApp." La hoja que aparece es el documento real que exporta "Compartir PDF". No se muestra WhatsApp porque es el selector del sistema y no se puede capturar.
3. **Talleres, escena 5 (estados).** Los estados reales de la demo son Recibido, Diagnóstico, Esperando repuesto y Listo. Texto: "Seguí cada auto: recibido, diagnóstico, esperando repuesto y listo."
4. **Repuestos, escena 2.** La demo **no busca por marca, modelo y versión**. El buscador de Productos filtra por texto y también busca en el campo "Compatibilidad". En el video se escribe "Fiat" y después "Fiat Cronos". Texto: "Buscá por vehículo y encontrá el repuesto compatible."
5. **Repuestos, escena 3 (stock).** Se muestra solo la vista de compu. En el celular (390 px), el **Panel de la demo se desborda**: mide 614 px de ancho y corta la columna de stock. Conviene corregirlo en la demo. El texto quedó igual.
6. **Repuestos, escena 4.** La demo **no tiene listas de precios de proveedores**. Lo que sí tiene son los proveedores con su saldo y la ficha con sus compras y pagos. Texto: "Registrá las compras y sabé cuánto le debés a cada proveedor."
7. **Repuestos, escena 6.** El texto pedido tiene 16 palabras, así que se muestra en dos golpes: "Esto es un ejemplo." y después "En AppsArt desarrollamos…".
8. **Versión pc, talleres escena 2.** Como se ve la compu, el texto dice: "Cargá la orden de trabajo desde la compu o el celular: cliente, patente y vehículo."
9. **Versión pc, repuestos escena 3.** En la demo, la grilla del Panel es `1fr 1fr` y a 1440 px las tablas empujan la tarjeta "Stock bajo mínimo" fuera de pantalla. Para la captura se acota la grilla con `minmax(0,…)`; conviene corregirlo también en la demo.

## Controles hechos

- Se revisó el texto de cada captura: no aparece "factur…", Multiescapes ni Mundo Repuestos. En el video de talleres se evitó la pantalla de Inicio, que dice "Facturado en mano de obra". En el de repuestos se evitó la pantalla de Compras, que dice "Escanear factura".
- Todos los datos son ficticios y vienen del seed de cada demo. Algunos proveedores ficticios usan marcas reales en el nombre, por ejemplo "Filtros Mann - Distribuidor Oficial".
- El QR se decodificó desde el cuadro final de cada video con jsQR y coincide exacto con el link de wa.me que tiene el mensaje precargado.
- Los dos MP4 abren en el navegador con la duración y la resolución correctas, y el audio se decodifica.
- **Falta:** escanear el QR con un celular real y mirar los videos completos en el teléfono.

## Locución (pendiente)

Los videos todavía van con la pista de audio en silencio. La voz tiene que decir **exactamente** el texto en pantalla, en rioplatense, con voseo y un tono cercano y tranquilo. Pronunciación: "ReportCar" se dice *ríport car*, "AppsArt" se dice *aps art* y "PDF" se dice *pe de efe*. Cada frase arranca apenas empieza su escena.

**Talleres (69 s)**

| Tiempo | Locución |
|---|---|
| 0:00 – 0:04 | ¿Tu taller todavía anota todo en papel? |
| 0:04 – 0:17 | Cargá la orden de trabajo desde el celular: cliente, patente y vehículo. (En la versión pc: "desde la compu o el celular".) |
| 0:17 – 0:29 | Buscá la patente y tenés todo el historial del auto. |
| 0:29 – 0:43 | Armá el presupuesto y mandalo en PDF por WhatsApp. |
| 0:43 – 0:52 | Seguí cada auto: recibido, diagnóstico, esperando repuesto y listo. |
| 0:52 – 0:57 | Esto es ReportCar, nuestro sistema para talleres. |
| 0:57 – 1:03 | En AppsArt desarrollamos sistemas a medida para industria, comercio, pymes y profesionales. |
| 1:03 – 1:09 | Escribinos por WhatsApp. |

**Repuestos (63 s)**

| Tiempo | Locución |
|---|---|
| 0:00 – 0:04 | ¿Cuánto tardás en encontrar el repuesto justo? |
| 0:04 – 0:14 | Buscá por vehículo y encontrá el repuesto compatible. |
| 0:14 – 0:21 | Controlá el stock desde la compu o el celular. |
| 0:21 – 0:33 | Registrá las compras y sabé cuánto le debés a cada proveedor. |
| 0:33 – 0:48 | Emití comprobantes de venta y llevá la cuenta corriente de cada cliente. |
| 0:48 – 0:51 | Esto es un ejemplo. |
| 0:51 – 0:57 | En AppsArt desarrollamos sistemas a medida para industria, comercio, pymes y profesionales. |
| 0:57 – 1:03 | Escribinos por WhatsApp. |

**Pasos con ElevenLabs:**

1. Generar cada frase por separado con la API (la clave va en la variable de entorno `ELEVENLABS_API_KEY`, nunca en el repo). Probar primero un par de frases para aprobar la voz.
2. En `studio.html`, cargar los audios y ubicar cada uno en el `start` de su escena.
3. Reemplazar la pista muda en `encode()`. Edge headless no trae encoder AAC: o se usa Opus con `AudioEncoder` (anda en Android, Chrome, Windows y VLC, pero puede fallar en iPhone o iPad viejos), o se codifica en AAC por fuera.
4. Volver a exportar los seis videos (`enc 1`, `1t`, `1p`, `2`, `2t`, `2p`) y verificarlos con `verify`.
