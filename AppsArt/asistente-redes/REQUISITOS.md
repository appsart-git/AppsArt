# Asistente de Publicaciones para Redes (IG) — Requisitos y decisiones

Estado: **en construcción**. Plan técnico completo en `.claude/plans` (ver también la estructura real del código en este mismo folder: `app/`, `generador/`, `.github-workflow/`). Este documento resume lo acordado para poder retomar el trabajo desde otra PC.

## Objetivo

App que genera automáticamente contenido para Instagram (imágenes y, en un caso, video con locución) para 4 cuentas de emprendimientos totalmente distintos entre sí, sin publicar vía API (Meta no permite publicar Stories vía API para terceros de todos modos). El usuario solo revisa y publica manualmente.

Uso inicial: personal, para las 4 cuentas propias. **Intención explícita: productizarla después como oferta de AppsArt** para clientes de redes sociales — por eso el motor debe construirse genérico/configurable desde el día uno (perfil de marca por cuenta como esquema, no hardcodeado), mismo patrón que las otras líneas de producto de AppsArt (Lote, LYM Inyección, Mundo Repuestos).

## Cuentas / perfiles de marca

### 1. Tecno Art
- Producto: remeras de diseño intervenidas, organizadas por colecciones temáticas.
- Voz de marca: "Pulso Digital, Alma Artesanal" — precisión digital + espíritu artesanal, con carga emocional ("Vestí lo que sentís", "Diseños que vibran con vos").
- Temáticas de colecciones: referencias musicales (Nirvana, Rolling Stones, Sumo), identidad/cultura local (Villa Fiorito), espiritual-psicodélico (Galaxia Terapéutica, Doctor Pachamama), inclusivo (ENBY).
- Objetivo de negocio: posicionar marca, crecer en ventas, rentabilizar (lidera Martin).
- Tienda: https://tecnoart.shop
- **Único de las 4 cuentas que requiere VIDEO**: reels cortos (10-20s) **con locución** (guion narrado + voz TTS).
- Pendiente: revisar Drive con videos/imágenes reales de las colecciones para afinar estilo visual exacto.

### 2. AppsArt
- Rubro: software/apps de gestión a medida.
- Público / posicionamiento: "Apps y sistemas de gestión a medida para Comercios, PyMEs e Industrias" — explícitamente NO encasillado solo en rubro automotor (aunque los casos reales hasta ahora son concesionarias, talleres, repuesterías).
- Funcionalidades que ofrece (para mensajes/contenido): control de stock, comprobantes de pago, gestión de producción, informes profesionales, fichas técnicas, gestión de clientes.
- Identidad visual ya usada en IG (carrusel real visto): fondo negro/blanco, acento naranja quemado, logo con rastro de puntos en la "A", tipografía bold geométrica, tono corporativo-moderno, CTA tipo "Diagnóstico gratuito — escribinos".
- Solo imágenes (no video).

### 3. Entre PyMES
- Qué es: marketplace B2B que conecta industrias/PyMEs del conurbano bonaerense para reutilizar maquinaria industrial, inmuebles productivos y remanentes de stock (economía circular industrial).
- Misión: optimizar recursos productivos, generar valor económico/social/ambiental para la comunidad PyME.
- Visión: ser la plataforma líder en Argentina/región para reutilización inteligente de activos industriales.
- Web: https://entrepymes.com.ar
- Identidad visual ya usada en IG (posts reales vistos): fondo azul marino/oscuro con acento cian, tipografía bold blanca, formato "ficha de producto" (nombre de máquina, specs clave, botón CTA "Consultá disponibilidad", swipe-up/link en bio), hashtags de nicho (#Maquinaria #PyMEsArgentinas #IndustriaArgentina #Metalurgia). Ya usan historias animadas de estilo similar.
- Solo imágenes (no video).

### 4. Casa Quinta "Tres Estaciones" (Parada Robles)
- Qué es: casa quinta de 3000 m² con mucha vegetación, pileta 4x9, parrilla/galería tipo quincho, horno de barro, equipada para 24 personas (ampliable).
- Objetivo: propuesta de valor para alquiler temporario del espacio, eventos personales y corporativos, dictado de cursos, encuentros de capacitación/reflexión.
- **Sin desarrollo en IG todavía.** Tienen logo pero pendiente de revisión/definición de identidad visual.
- Solo imágenes (no video), salvo que se decida lo contrario más adelante.

## Decisiones técnicas

- **Generación de texto** (captions y guiones): Claude (Anthropic API) — mismo ecosistema que el resto del estudio.
- **Generación de imágenes**: OpenAI (gpt-image-1) — buena calidad, API simple, precio razonable.
- **Generación de video (solo Tecno Art)**: Runway ML API (Gen-3), facturación por segundo, reels 10-20s.
- **Locución (solo Tecno Art)**: TTS en español (ej. ElevenLabs) para narrar el guion del reel.
- **Combinar video + audio narrado**: CLI de `ffmpeg` corriendo dentro del runner de GitHub Actions (no ffmpeg.wasm en el navegador — toda la generación ya ocurre en la Action, así que mezclar ahí mismo es más simple y no requiere cargar WASM pesado en el dashboard).
- **Motor de "automatización"**: GitHub Action programado (cron en la nube de GitHub) — corre la generación periódica (llamadas a las APIs) sin depender de instalar Node/Python en la PC corporativa (bloqueado). Ver [[appsart-tech-constraints]].
- **Hosting del dashboard**: Firebase Hosting, publicado automáticamente al final de cada corrida del mismo GitHub Action (reusa el proyecto Firebase que ya se crea para los datos, sin infraestructura extra).
- **Notificación de "listo para revisar"**: push al celular vía ntfy.sh (app gratuita, se suscribe a un topic privado, cualquier trigger le manda un HTTP POST) — no requiere backend propio ni app nativa custom.
- **Revisión antes de publicar**: dashboard donde el usuario ve el contenido generado pendiente por cuenta y lo aprueba/descarta; la publicación en IG siempre es manual (Meta no permite publicar Stories vía API a terceros).
- **Frecuencia de generación**: distinta por cuenta, vive como campo (`cadenciaDias`) en el perfil de cada cuenta — no en el cron del workflow — para que agregar una cuenta nueva (propia o de un futuro cliente) no requiera tocar el workflow.
- **Arquitectura de reusabilidad**: el perfil de marca por cuenta (rubro, tono, paleta, cadencia, tipo de medio) debe ser un esquema configurable genérico, no hardcodeado a estas 4 cuentas — para poder ofrecer la app después a otros clientes de AppsArt sin reescribirla.

## Estado de la construcción

Código base ya escrito y el dashboard probado en modo local (sin Firebase):
- `app/` — dashboard estático (Revisión, Cuentas, Historial, Configuración), probado end-to-end en modo local con datos de prueba. Incluye `seed-cuentas.json` con los 4 perfiles de arriba, importable desde la pantalla Cuentas.
- `generador/` — pipeline Node (Claude → gpt-image-1 → Runway+ElevenLabs+ffmpeg solo para Tecno Art → sube a Firebase Storage/Firestore → ntfy). No se pudo probar en ejecución real porque no hay Node instalable en esta PC — se prueba recién dentro de GitHub Actions (ver checklist abajo).
- `.github-workflow/asistente-redes-generar.yml` — fuente versionada del workflow. **Ya copiado** a `.github/workflows/asistente-redes-generar.yml` en la raíz real del repo de GitHub (2026-08-14).
- `firebase.json` — config de Hosting (sirve `app/` como sitio estático), sin `.firebaserc` a propósito: el project id se pasa por secret (`FIREBASE_PROJECT_ID`) para que la misma config sirva para un futuro cliente sin editar archivos.

## Checklist para dejarlo andando de punta a punta

1. Crear un proyecto en console.firebase.google.com con Firestore + Storage + Hosting habilitados. **(en progreso — parcial)**
2. Pegar su `firebaseConfig` en la pantalla de Configuración del dashboard (`app/index.html`, primera vez que se abre).
3. Cargar las 4 cuentas iniciales desde la pantalla Cuentas → "Importar las 4 iniciales" (lee `seed-cuentas.json`).
4. ~~Copiar `.github-workflow/asistente-redes-generar.yml` a `.github/workflows/` en la raíz real del repo de GitHub.~~ **Hecho (2026-08-14).**
5. Cargar estos secrets en el repo (Settings → Secrets and variables → Actions):
   `FIREBASE_SERVICE_ACCOUNT`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_PROJECT_ID`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `RUNWAY_API_KEY`, `ELEVENLABS_API_KEY`, `NTFY_TOPIC`.
6. Instalar la app **ntfy** en el celular y suscribirse al topic elegido (el mismo valor que `NTFY_TOPIC`).
7. Probar primero con `workflow_dispatch` → `dryRun: true` (no gasta nada, valida toda la plomería).
8. Después probar `soloCuenta` en una cuenta sin video (ej. `apps-art`) antes de dejar correr todas.

**Ojo con el primer disparo del cron real**: como `ultimaGeneracion` arranca vacío en las 4 cuentas, la primera corrida sin `dryRun` las va a considerar "vencidas" a todas a la vez — incluida Tecno Art (que gasta en Runway + ElevenLabs). Conviene primero correr manualmente con `soloCuenta` cuenta por cuenta antes de dejar el cron diario andando solo.
