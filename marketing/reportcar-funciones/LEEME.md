# Video "Todas las funciones de ReportCar" (vertical 1080×1920)

**Estado:** el montaje está completo, con las 17 escenas del guion más una escena nueva sobre los equipos. El borrador sin voz está en `out/borrador-sin-voz.mp4`: dura 83 s y pesa 8,7 MB. Faltan tres cosas:
- la voz;
- la música;
- las fotos de los autos dentro de la demo.

## Cómo está armado

En esta PC ahora sí están Node y ffmpeg, así que la grabación se hace con **Playwright**, usando el Edge que ya está instalado. El montaje **no** usa Remotion, y el motivo es este: el video promo de talleres no se hizo con Remotion. Se hizo con un canvas en `faatra-videos/studio.html`. Si se hubieran pasado sus placas a Remotion, ya no serían "las mismas". Por eso se reusó ese montaje: las funciones `sceneAppsArt` y `sceneContact` están copiadas tal cual. Lo único que cambió es el link del QR, y se sumó la línea "reportscar.com".

| Archivo | Para qué |
|---|---|
| `lib/preparar.mjs` | Prepara cada toma: hace lo mismo que "↺ Reiniciar datos de ejemplo" y después carga las fotos de los 4 lados en las actas de los 3 autos que están en el taller. Las fotos salen de `fotos/demo/<auto>-<lado>.jpg`. |
| `escenas.mjs` | Guion de clics de cada escena (e1 … e16). Se usa para regrabar. |
| `grabar.mjs` | `node grabar.mjs [e1 e5 …]` deja las capturas en `out/shots/`. Los botones de WhatsApp no abren nada: se intercepta wa.me y solo se guarda el mensaje armado. |
| `studio.html` | El montaje. Ahí están los titulares (texto = locución), los tiempos, el círculo terracota de cada toque, el globo con el mensaje de WhatsApp, la hoja del PDF y las placas. |
| `voz.mjs` | ElevenLabs. Tiene tres modos: `buscar`, `candidatas <ids>` y `todo <voice_id>`. Escribe `audio/<escena>.mp3` y `audio/duraciones.json`. |
| `render.mjs` | `node render.mjs` genera el MP4 con H.264 CRF 23 `veryfast` + AAC. También acepta `still <t…>` para sacar cuadros sueltos y `qr` para decodificar el QR de la placa final. |

Cuando existe `audio/duraciones.json`, cada escena dura lo que su locución más 0,5 s. Sin ese archivo, la duración se estima por cantidad de palabras.

## Lo que se adaptó

1. **Viewport:** se grabó en el celular, con 390×844 y deviceScaleFactor 3. En el celular la demo muestra la barra de navegación de abajo y se ve bien, así que no hizo falta usar 1280×800.
2. **Escenas unidas:** ninguna. La duración estimada es de 83 s y con la voz real debería quedar entre 85 y 100 s. Si se pasa, se unen la 3 con la 4 y la 5 con la 6, como dice el brief.
3. **Escena nueva (pedido de Martín):** antes de la placa de AppsArt va **"Funciona en el celular, la tablet o la compu."**, con la pantalla de Estado autos en los tres equipos a la vez.
4. **Cortes con foto de taller:** van 2, de 1 s cada uno, con zoom lento. Uno está entre ingreso y reparación y el otro entre reparación y la parte de clientes y recompra. No llevan texto ni voz.
5. **El auto que sigue el recorrido:** en la escena 1 entra un Toyota Corolla nuevo (Martina Ruiz). Desde la escena 3 hasta la 8 se sigue el **Ford Ka de Nico Ibáñez**, que ya está en el taller: pasa a Diagnóstico, se le aprueba el presupuesto, sale el informe y se descuentan las bujías del stock (de 4 a 3).
6. **WhatsApp:** en las escenas 2, 4, 5 y 13 se muestra un globo con el **mensaje real que arma la demo**. Es una vista previa genérica, sin la interfaz de WhatsApp.
7. **PDF (escena 7):** la hoja que se muestra es la misma imagen que la app convierte en PDF, generada con su propio html2canvas.
8. **Sticker QR (escena 11):** la ficha QR de la demo **no tiene foto**, así que ahí no se cargó ninguna. Se muestra el sticker y después la ficha que ve el cliente cuando lo escanea.
9. **Círculo de toque:** se dibuja en el montaje, en las coordenadas reales del botón que registra Playwright. Queda animado y es igual al del promo.
10. **"Facturado":** aparece en las pantallas de Inicio y Gastos (escena 14), como quedó decidido. Ni los textos del video ni la locución usan esa palabra.

## Fotos

- `fotos/`: hay 4 fotos de taller de Unsplash para el montaje (título, fondos y cortes). Los créditos están en `fotos/creditos.txt`. En una de ellas se pixelaron dos patentes.
- **Pendiente:** las fotos de los autos dentro de la demo. Se buscó en Unsplash y no hay fotos libres de Ford Ka, Sandero, Onix ni Cronos. Menos todavía de los 4 lados de un mismo auto. El brief deja como alternativa generarlas con la API de imágenes, pero la clave de OpenAI está solo en GitHub Actions, no en esta PC. Hacen falta 16 fotos, sin patente legible:
  - `toyota-corolla`, `ford-ka`, `renault-sandero` y `chevrolet-onix`;
  - de cada auto: `-frente`, `-trasera`, `-izq` y `-der`.

  Las fotos van en `fotos/demo/`. Después se corre `node grabar.mjs` y `node render.mjs`.

## Voz y música (pendiente)

- **Voz:** hace falta `ELEVENLABS_API_KEY` en esta PC. Después:
  1. `node voz.mjs buscar`
  2. `node voz.mjs candidatas <id1> <id2> <id3>`: genera las escenas 0 y 1 para que Martín elija la voz.
  3. `node voz.mjs todo <id>`
  4. `node render.mjs`

  El promo de talleres no tiene voz, así que no hay una voz anterior con la que emparejar.
- **Música:** todavía no se agregó. `render.mjs` ya mezcla `audio/musica.mp3` a −22 dB por debajo de la voz.

## Controles hechos

- El QR de la placa final se decodificó con jsQR y coincide exacto con el link de wa.me que tiene el mensaje precargado.
- Se revisaron los textos: ningún titular dice "factur…".
- El MP4 es H.264 1080×1920 a 30 fps, con pista AAC.
- **Falta:**
  - probar el QR con un celular;
  - mirar el video completo con sonido cuando tenga la voz.
