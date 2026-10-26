# Videos FAATRA (jornada 28/10)

Hay dos videos verticales, de 1080×1920 a 30 fps, en H.264 con pista AAC en silencio. Por ahora no tienen voz.

| Archivo | Duración | Peso |
|---|---|---|
| `appsart-talleres-vertical.mp4` | 64 s | 8,3 MB |
| `appsart-repuestos-vertical.mp4` | 63 s | 8,1 MB |

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
  - `verify <v>`: abre el MP4 y saca cuadros reales.

**Para cambiar un texto**, editás `VIDEOS` en `studio.html` y después corrés `render.ps1 enc 1` (o `enc 2`). Tarda alrededor de 30 s.

**Si después se suma voz**, cada locución tiene que decir exactamente el titular de su escena, y la duración de la escena pasa a ser la del audio más 0,5 s. Para eso hay que ajustar `dur` y `shots` en `VIDEOS`.

## Escenas adaptadas porque la demo es distinta al guion

1. **Talleres, escena 2 (orden de trabajo).** En la demo, la pantalla se llama "Registrar auto en el taller", pero pide cliente, teléfono, patente, marca y modelo. Mantuve el texto del guion.
2. **Talleres, escena 4.** La demo **no tiene presupuesto**: arma un *informe del trabajo realizado* en PDF, que se comparte con "Compartir". Por eso el texto quedó así: "Armá el informe del trabajo y mandalo en PDF por WhatsApp." La hoja PDF que se ve es la misma vista de la app que se convierte en PDF. No se muestra el WhatsApp porque es el selector del sistema y no se puede capturar.
3. **Talleres, escena 5 (estados).** Los estados reales de la demo son Recibido, Diagnóstico, Esperando repuesto y Listo. Texto: "Seguí cada auto: recibido, diagnóstico, esperando repuesto y listo."
4. **Repuestos, escena 2.** La demo **no busca por marca, modelo y versión**. El buscador de Productos filtra por texto y también busca en el campo "Compatibilidad". En el video se escribe "Fiat" y después "Fiat Cronos". Texto: "Buscá por vehículo y encontrá el repuesto compatible."
5. **Repuestos, escena 3 (stock).** Se muestra solo la vista de compu. En el celular (390 px), el **Panel de la demo se desborda**: mide 614 px de ancho y corta la columna de stock. Conviene corregirlo en la demo. El texto quedó igual.
6. **Repuestos, escena 4.** La demo **no tiene listas de precios de proveedores**. Lo que sí tiene son los proveedores con su saldo y la ficha con sus compras y pagos. Texto: "Registrá las compras y sabé cuánto le debés a cada proveedor."
7. **Repuestos, escena 6.** El texto pedido tiene 16 palabras, así que se muestra en dos golpes: "Esto es un ejemplo." y después "En AppsArt desarrollamos…".

## Controles hechos

- Se revisó el texto de cada captura: no aparece "factur…", Multiescapes ni Mundo Repuestos. En el video de talleres se evitó la pantalla de Inicio, que dice "Facturado en mano de obra". En el de repuestos se evitó la pantalla de Compras, que dice "Escanear factura".
- Todos los datos son ficticios y vienen del seed de cada demo. Algunos proveedores ficticios usan marcas reales en el nombre, por ejemplo "Filtros Mann - Distribuidor Oficial".
- El QR se decodificó desde el cuadro final de cada video con jsQR y coincide exacto con el link de wa.me que tiene el mensaje precargado.
- Los dos MP4 abren en el navegador con la duración y la resolución correctas, y el audio se decodifica.
- **Falta:** escanear el QR con un celular real y mirar los videos completos en el teléfono.
