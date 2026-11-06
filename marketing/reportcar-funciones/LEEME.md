# Video "Todas las funciones de ReportCar" (vertical 1080×1920)

**Estado:** terminado. El archivo es `reportcar-funciones-vertical.mp4`: dura 94 s, pesa 10,4 MB y tiene voz y música.

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
2. **Escenas unidas:** ninguna. Con la voz quedó en 94 s, dentro del objetivo. Si se pasa, se unen la 3 con la 4 y la 5 con la 6, como dice el brief.
3. **Escena nueva (pedido de Martín):** antes de la placa de AppsArt va **"Funciona en el celular, la tablet o la compu."**, con la pantalla de Estado autos en los tres equipos a la vez.
4. **Cortes con foto de taller:** van 2, de 1 s cada uno, con zoom lento. Uno está entre ingreso y reparación y el otro entre reparación y la parte de clientes y recompra. No llevan texto ni voz.
5. **El auto que sigue el recorrido:** en la escena 1 entra un Toyota Corolla nuevo (Martina Ruiz). Desde la escena 3 hasta la 8 se sigue el **Ford Ka de Nico Ibáñez**, que ya está en el taller: pasa a Diagnóstico, se le aprueba el presupuesto, sale el informe y se descuentan las bujías del stock (de 4 a 3).
6. **WhatsApp:** en las escenas 2, 4, 5 y 13 se muestra un globo con el **mensaje real que arma la demo**. Es una vista previa genérica, sin la interfaz de WhatsApp.
7. **PDF (escena 7):** la hoja que se muestra es la misma imagen que la app convierte en PDF, generada con su propio html2canvas.
8. **Sticker QR (escena 11):** la ficha QR de la demo **no tiene foto**, así que ahí no se cargó ninguna. Se muestra el sticker y después la ficha que ve el cliente cuando lo escanea.
9. **Círculo de toque:** se dibuja en el montaje, en las coordenadas reales del botón que registra Playwright. Queda animado y es igual al del promo.
10. **"Facturado":** aparece en las pantallas de Inicio y Gastos (escena 14), como quedó decidido. Ni los textos del video ni la locución usan esa palabra.

## Fotos

- `fotos/`: 4 fotos de taller de Unsplash para el montaje (título, fondos y cortes). En una se pixelaron dos patentes.
- `fotos/demo/`: 16 fotos de los autos que se cargan dentro de la demo. Son 4 lados de cada uno: Toyota Corolla, Ford Ka, Renault Sandero y Chevrolet Onix.
  - Se generaron con OpenAI `gpt-image-2`, porque en los bancos libres no hay fotos de estos modelos.
  - Las patentes están en blanco y no hay personas.
  - Los prompts están en `fotos/demo/prompts.txt` y los créditos en `fotos/creditos.txt`.
  - `gpt-image-1`, el modelo que usaba el pipeline de redes, **ya no existe** en la API.

## Voz y música

- **Claves:** son los secrets del repo (las mismas del sistema de posts para redes). Se usan desde el workflow `.github/workflows/reportcar-video-assets.yml`, que se dispara a mano:
  ```
  gh workflow run reportcar-video-assets.yml -f tarea="voz todo 2Xw19kTq4zKqMDuVjdqD s4"
  ```
  Los archivos quedan como artifact y se bajan con `gh run download`. **El repo es público:** los logs y los artifacts los puede ver cualquiera. Las claves no se ven, GitHub las tapa.
- **Voz elegida:** **Marcos – Ads** (`2Xw19kTq4zKqMDuVjdqD`), de la Voice Library. Es masculina, joven y argentina, y su ficha dice "auténtica, acento local, ritmo natural", pensada para publicidad.
  - Se compararon tres candidatas: Marcos, Chelo y Dante. Las pruebas están en `audio/candidatas/`.
  - Martín dejó la elección en mis manos. Marcos es la más ágil: dice la escena 1 en 3,4 s, contra 4,5 y 4,9 de las otras.
- **Ajustes:** modelo `eleven_multilingual_v2`, velocidad 1.08.
- **Pronunciación:** en el texto de la voz se escribe "guatsáp", "cu erre", "pe de efe", "Ríport Car" y "Aps Art". En pantalla queda el texto normal.
- **El promo de talleres no tiene voz**, así que no hay una voz anterior con la que emparejar. Si se le agrega voz al promo, conviene usar esta misma.
- **Música:** `musica.sh` genera con ffmpeg una base propia (pad suave, sin licencias de terceros) y la deja en `audio/musica.mp3`. Va unos 22 dB por debajo de la voz.
- **Duración de las escenas:** cada escena dura lo que su locución más 0,5 s, con un mínimo para poder leer la pantalla: 1,3 s por paso, o 2,8 s si muestra el mensaje de WhatsApp. Sin ese mínimo el video quedaba en 72 s y las pantallas pasaban en menos de 1 s. Con el mínimo dura 94 s y cada frase sigue arrancando al principio de su escena.

## Controles hechos

- El QR de la placa final se decodificó con jsQR desde el último cuadro y coincide exacto con el link de wa.me con el mensaje precargado.
- El MP4 es H.264 1080×1920 a 30 fps, CRF 23 `veryfast`, con AAC 48 kHz. Pesa 10,4 MB, menos que el límite de 16 MB.
- Los textos de la locución salen de los mismos titulares del montaje (`guion.json`), así que coinciden palabra por palabra. Ninguno dice "factur…".
- Se revisaron todas las fotos: ninguna tiene patentes legibles ni personas.
- **Falta, y lo tiene que hacer alguien con el celular:**
  - escanear el QR;
  - **escuchar** el video con sonido, para confirmar la pronunciación de "WhatsApp", "QR", "PDF" y "ReportCar". Si alguna suena mal, se corrige en `FONETICA` (en `voz.mjs`) y se regenera solo esa escena.
