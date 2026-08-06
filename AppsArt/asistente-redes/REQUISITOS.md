# Asistente de Publicaciones para Redes (IG) — Requisitos y decisiones

Estado: **scoping completo, plan técnico pendiente**. Este documento resume lo acordado para poder retomar la implementación desde otra PC.

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

- **Generación de imágenes**: OpenAI (gpt-image-1) — buena calidad, API simple, precio razonable.
- **Generación de video (solo Tecno Art)**: Runway ML API (Gen-3), facturación por segundo, reels 10-20s.
- **Locución (solo Tecno Art)**: TTS en español (ej. ElevenLabs) para narrar el guion del reel.
- **Combinar video + audio narrado**: ffmpeg.wasm en el navegador (sin instalar nada localmente, corre client-side).
- **Motor de "automatización"**: GitHub Action programado (cron en la nube de GitHub) — corre la generación periódica (llamadas a las APIs) sin depender de instalar Node/Python en la PC corporativa (bloqueado). Ver [[appsart-tech-constraints]].
- **Notificación de "listo para revisar"**: push al celular vía ntfy.sh (app gratuita, se suscribe a un topic privado, cualquier trigger le manda un HTTP POST) — no requiere backend propio ni app nativa custom.
- **Revisión antes de publicar**: dashboard donde el usuario ve el contenido generado pendiente por cuenta y lo aprueba/descarta; la publicación en IG siempre es manual (Meta no permite publicar Stories vía API a terceros).
- **Frecuencia de generación**: distinta por cuenta (a definir el número exacto por cuenta al construir cada perfil).
- **Arquitectura de reusabilidad**: el perfil de marca por cuenta (rubro, tono, paleta, cadencia, tipo de medio) debe ser un esquema configurable genérico, no hardcodeado a estas 4 cuentas — para poder ofrecer la app después a otros clientes de AppsArt sin reescribirla.

## Próximo paso

Armar el plan técnico completo: estructura de la app, esquema de datos por cuenta, flujo de generación → revisión → notificación, y qué se necesita configurar (API keys, secretos de GitHub Actions, topic de ntfy) antes de empezar a construir.
