# App de prospección (ReportCar y futuros rubros) — Especificación v4 para Claude Code

> Guardalo en la raíz del repo como `SPEC.md` y decile a Code: *"Leé SPEC.md, revisá las decisiones abiertas de la sección 2 y proponé cómo resolverlas antes de arrancar la Fase 1"*.
> Junto con este archivo va `talleres-planilla.csv`: los 50 talleres ya relevados, para la importación inicial.
> **v4 (19/11/2026):** reemplaza las anteriores. Se construye el sistema completo (búsqueda de negocios, análisis de reseñas, mensajes con Claude, panel, recordatorios y métricas), sin esperar resultados de una prueba previa. **Fuera de alcance:** demos personalizadas por contacto y armado de propuestas; eso lo hace Martín a mano para la segunda llamada.

---

## 0. Contexto

**ReportCar** (reportscar.com, un producto de AppsArt) vende a talleres mecánicos un sistema a medida con **pago único, sin abono mensual**:

- **Etapa 1 (base):** ingreso del auto con fotos, daños y firma; informe del trabajo en PDF con el logo del taller; avisos de service y correa por WhatsApp; clientes e historial por patente; stock con aviso de reposición; números del mes.
- **Opcionales (pago único cada uno):** ficha QR del auto, compras y cuentas con proveedores, estado del auto para el cliente, presupuestos en PDF con seguimiento, ganancia real, campañas a clientes.
- **Condiciones:** seña para arrancar, entrega en unos 12 días, 30 días de ajustes sin cargo, después soporte por consulta. Carga de datos bonificada si confirman en la segunda reunión. Base de datos en el plan gratuito de Firebase, en una cuenta a nombre del taller.

**Proceso de venta (no cambia):** 1) primera videollamada para entender el taller y mostrar un preliminar; 2) segunda reunión con propuesta y demo armadas para ese taller.

**Para qué es esta app:** que Martín salga a buscar talleres todos los días, sin quedarse esperando leads de Meta. Cada mañana la app le dice a quién escribir o llamar, con el mensaje listo, y lleva el seguimiento sola. Tiene que servir también para otros rubros más adelante.

---

## 1. Reglas que no se negocian

1. **Nada de envíos automáticos en frío por WhatsApp ni DMs automáticos en Instagram.** La política de WhatsApp Business exige consentimiento previo para que la empresa inicie la conversación, y su incumplimiento puede suspender la cuenta. La app **prepara** el mensaje y abre WhatsApp; Martín **envía**.
2. **Volumen humano:** máximo 20 primeros contactos por día (configurable).
3. **Datos de Google Maps:** guardar el `place_id` y refrescar el resto si tiene más de 30 días. Revisar los términos vigentes de Google Maps Platform.
4. **Reseñas:** no guardar nombres ni fotos de autores; solo texto y rating.
5. **Sin precios en los mensajes.** Sí se puede decir "pago único, sin abono mensual".
6. **Opt-out:** si un negocio pide que no le escriban → `descartado` + `noContactar: true`, y nunca vuelve a aparecer.
7. **Nada fijo del rubro en el código:** todo lo de talleres va en configuración (§4).
8. **Un solo usuario por ahora (Martín)**, pero el modelo de datos tiene que permitir sumar otro usuario más adelante (por ejemplo, alguien que haga llamadas).

---

## 2. Decisiones abiertas para Code

Antes de escribir código, Code revisa estas decisiones, propone y justifica. Hay una recomendación para cada una, pero no es obligatoria.

| Decisión | Recomendación | Por qué | Alternativas a evaluar |
|---|---|---|---|
| **Base de datos** | **Firestore** | Martín ya usa Firebase; el panel, los scripts y el recordatorio leen y escriben en el mismo lugar; tiene Auth y reglas de seguridad; entra en el plan gratuito con este volumen | Supabase (Postgres, SQL más cómodo para métricas); Google Sheets como base (simple de ver, pero frágil para una app) |
| **Dónde queda la planilla** | Importar el CSV a la base y que **la app sea la fuente de verdad**. Botón de exportar a CSV como respaldo | Dos lugares editables se desincronizan | Sincronizar con una Google Sheet de solo lectura para mirar los datos fuera de la app |
| **Panel** | PWA instalable en el celular, en Firebase Hosting | Martín la usa sobre todo desde el teléfono, donde está WhatsApp | Framework a elección de Code (React/Vite, SvelteKit, etc.) |
| **Recordatorio diario** | **GitHub Actions (cron) + ntfy.sh** | Martín ya usa los dos; gratis; fácil de depurar | Cloud Scheduler + Cloud Functions (plan Blaze); notificaciones push nativas de la PWA |
| **Runtime de scripts** | **Bun + TypeScript** | Es el entorno de Martín | — |

---

## 3. Fases

| Fase | Qué es | Resultado usable |
|---|---|---|
| **1. Base e importación** | Proyecto, base de datos, importar los 50 talleres del CSV | Los talleres están en la base |
| **2. Panel** | Lista del día, ficha, estados, botón de WhatsApp con plantillas, alta manual, métricas | Martín ya puede prospectar desde la app |
| **3. Recordatorios** | Aviso diario al celular + resumen semanal | La app lo empuja a escribir todos los días |
| **4. Generador de listas** | Google Maps + análisis de reseñas con Claude → nuevos negocios directo en la base | La lista se agranda sola por ciudad |
| **5. Mensajes con Claude** | Claude personaliza los 4 contactos de cada negocio | Mensajes mejores que la plantilla |

Las 5 fases se construyen en orden, sin esperar resultados entre una y otra. El orden permite que Martín empiece a usar la app con los 50 talleres importados apenas termina la Fase 3, mientras se programan las Fases 4 y 5. Las métricas (§10) sirven para ir ajustando mensajes y ciudades sobre la marcha.

**Fuera de alcance:** demos personalizadas por contacto, videos personalizados por contacto y armado o envío de propuestas. La demo y la propuesta las prepara Martín a mano para la segunda llamada.

---

## 4. Configuración por rubro (`rubros/<rubro>.json`)

Todo lo específico de un mercado vive acá. Para un rubro nuevo se copia el archivo y se adapta; el código no cambia. El panel tiene un selector de rubro.

```jsonc
// rubros/talleres.json
{
  "id": "talleres",
  "marca": "ReportCar",
  "firma": "Martín – ReportCar",
  "videoUrl": { "A": "", "B": "" },
  "busquedas": ["taller mecánico {ciudad}", "mecánica integral {ciudad}", "taller multimarca {ciudad}", "inyección electrónica {ciudad}"],
  "tiposIncluidos": ["car_repair"],
  "tiposExcluidos": ["car_dealer"],
  "palabrasExcluidas": ["oficial", "concesionario", "gomería", "lubricentro", "lavadero"],
  "minResenas": 30,
  "producto": {
    "base": ["ingreso del auto con fotos, daños y firma", "informe del trabajo en PDF con el logo del taller", "avisos de service y correa por WhatsApp", "historial por patente", "stock con aviso de reposición", "números del mes"],
    "opcionales": ["ficha QR del auto", "compras y cuentas con proveedores", "estado del auto para el cliente", "presupuestos en PDF con seguimiento", "ganancia real", "campañas a clientes"],
    "diferencial": "pago único, sin abono mensual; la app y los datos son del taller"
  },
  "senales": {
    "recompra": ["clientes de años", "vuelvo siempre", "mi mecánico de confianza", "me avisó"],
    "entregaProfesional": ["mandó fotos", "explicó todo", "transparente", "informe", "alta gama"],
    "dolor": ["no me avisaron", "cobró más", "sin comprobante", "demoró", "no devolvió las piezas", "nunca más"],
    "tamano": ["los chicos", "el equipo", "recepción", "grúa", "varios mecánicos", "turnos"]
  },
  "cadenciaDias": [0, 2, 5, 9],
  "variantes": {
    "A": "recompra: avisarle al cliente cuándo le toca el service",
    "B": "económico: sistema propio con pago único, sin abono mensual"
  },
  "plantillas": { /* ver §7.2 */ }
}
```

---

## 5. Fase 1 — Base e importación

### 5.1 Modelo de datos (si se usa Firestore; adaptar si Code elige otra base)

**`negocios/{id}`** (`id` = `placeId` si existe, si no `manual_<slug>`)
```ts
type Negocio = {
  id: string; rubro: string; slug: string;
  nombre: string; ciudad: string; provincia: string; direccion?: string;
  telefono?: string;            // como vino
  telefonoWa?: string | null;   // normalizado para wa.me (§5.3)
  esCelularProbable?: boolean | null;
  instagram?: string; web?: string; mapsUrl?: string;
  rating?: number; cantResenas?: number; tipos?: string[];
  prioridad: "A" | "B" | "C";
  gancho?: string;              // texto largo, para Martín
  ganchoCorto?: string;         // máx. 10 palabras, va dentro del mensaje
  analisis?: Analisis;          // Fase 4 (§8.3)
  estado: "sin_contactar" | "contactado" | "respondio" | "reunion" | "propuesta" | "cerrado" | "descartado";
  paso: 0 | 1 | 2 | 3 | 4;      // último contacto hecho
  proximoToque?: Timestamp | null;
  variante?: "A" | "B";
  canal?: "whatsapp" | "llamada" | "instagram" | "visita";
  objecion?: string; notas?: string;
  noContactar?: boolean;
  ola?: 1 | 2 | 3;
  origen: "import_planilla" | "places" | "manual";
  primerContacto?: Timestamp; creado: Timestamp; actualizado: Timestamp;
  datosPlacesFecha?: Timestamp;
};
```
- **`negocios/{id}/eventos/{auto}`:** `{ tipo: "enviado" | "respondio" | "llamada" | "reunion" | "propuesta" | "cerrado" | "descartado" | "nota" | "cambio_estado", paso?, canal?, texto?, fecha, usuario }`.
- **`negocios/{id}/mensajes/{paso}`** (Fase 5): `{ paso, variante, texto, generado, editado }`.
- **`config/general`:** `{ maxContactosDia: 20, horaRecordatorio: "08:30", diasHabiles: [1,2,3,4,5], rubroActivo: "talleres" }`.

### 5.2 Importación de `talleres-planilla.csv`
Columnas: Taller, Ciudad, Prioridad, Reseñas, Teléfono, Estado, Gancho para el mensaje, Provincia, Rating, 1er contacto, Próximo toque, Notas, Variante, Canal, Objeción.
- Mapear Estado: "Sin contactar" → `sin_contactar`, "Contactado" → `contactado`, "Respondió" → `respondio`, "Reunión agendada" → `reunion`, "Propuesta enviada" → `propuesta`, "Cerrado" → `cerrado`, "Descartado" → `descartado`.
- Variante: "A · Recompra" → `A`, "B · Sin abono" → `B`. Si está vacía, **alternar A/B** para que la comparación quede pareja.
- Canal vacío → `whatsapp` si el teléfono es celular probable, si no `llamada`.
- `ganchoCorto`: generarlo con una sola llamada a Claude por fila a partir de "Gancho para el mensaje" (máx. 10 palabras, sin inventar), o dejarlo vacío para que Martín lo complete en el panel. Code elige.
- Buscar el `placeId` con Places Text Search (`"<nombre> <ciudad>"`) solo si hay un match claro por nombre y ciudad; si no, `manual_<slug>`.
- Reejecutar la importación no duplica nada.

### 5.3 Teléfonos (`lib/phone.ts`)
`libphonenumber-js`. `telefonoWa` en formato `549` + código de área sin 0 + número sin 15. `esCelularProbable` true/false/null. En Argentina, muchos números de Maps son fijos: si no es celular probable, el canal sugerido es **llamada** y el botón de WhatsApp muestra una advertencia.

### 5.4 Exportar
Botón en el panel (y script) que genera un CSV con todas las columnas de la planilla + id, para respaldo.

**Listo cuando:** los 50 talleres están en la base con estado, variante y canal, y el export da un CSV equivalente al original.

---

## 6. Fase 2 — Panel

PWA instalable, pensada primero para celular. Login con Firebase Auth (o el equivalente que elija Code), con acceso solo para el usuario de Martín.

### 6.1 Pantalla "Hoy" (la principal)
- Negocios con `proximoToque <= hoy` (incluye atrasados, marcados en rojo) + negocios `sin_contactar` hasta completar `maxContactosDia`, ordenados por: atrasados → seguimientos → nuevos de prioridad A → B → C.
- Arriba, un contador: *"Hoy: 3 seguimientos, 2 llamadas, 5 nuevos"*.
- Cada tarjeta muestra: nombre, ciudad, reseñas, prioridad, gancho, qué contacto toca (1 a 4) y por qué canal, y **el mensaje armado, editable antes de enviar**.
- Botones:
  - **Abrir WhatsApp:** `https://wa.me/{telefonoWa}?text={mensaje}`. Si no hay `telefonoWa`, deshabilitado con sugerencia de llamar o buscar el Instagram.
  - **Llamar:** `tel:` + guion de 3 líneas desplegable (contacto 3, o cuando el canal es llamada).
  - **Enviado / Llamé:** registra el evento, `paso++`, `estado = contactado` y calcula `proximoToque` (§6.4).
  - **Respondió:** `estado = respondio`, corta la secuencia (`proximoToque = null`) y abre un campo para anotar qué dijo y la objeción.
  - **Sin WhatsApp:** cambia el canal a llamada.
  - **Posponer:** a mañana o al próximo lunes.
  - **Descartar:** pide motivo; opción "pidió no ser contactado" → `noContactar`.

### 6.2 Lista / Pipeline
Todos los negocios, con filtros por estado, ciudad, provincia, prioridad, variante y ola, y buscador por nombre. Vista de columnas por estado (cambio de estado con un toque o arrastrando).

### 6.3 Ficha del negocio
Todos los datos editables (incluidos gancho y ganchoCorto), historial de eventos en orden, notas, links a Maps, web e Instagram, y botones para marcar **Reunión agendada** (con fecha), **Propuesta enviada** y **Cerrado**. Alta manual de negocios (por ejemplo, un taller que llegó por Meta o por una cámara) con origen `manual`.

### 6.4 Lógica de la secuencia
- `cadenciaDias` del rubro: `[0, 2, 5, 9]`. Al marcar el contacto N, el próximo se agenda a `cadenciaDias[N] - cadenciaDias[N-1]` días.
- Si la fecha cae sábado o domingo, pasa al lunes.
- Después del contacto 4 sin respuesta: `proximoToque = null` y queda en `contactado` con la marca "secuencia terminada". Desde la ficha se puede reactivar a los 60 días.
- Respondió, reunión, propuesta, cerrado o descartado cortan la secuencia.

### 6.5 Métricas
Embudo (contactados → respondieron → reunión → propuesta → cerrados), **total y por variante A/B**, por ciudad y por canal. Cada etapa incluye a los que avanzaron más. Objeciones más repetidas. Contactos por día de las últimas 4 semanas (para ver la constancia). Una línea que compare la tasa de respuesta contra la referencia de §10 (≥10%).

**Listo cuando:** Martín puede hacer toda la rutina del día desde el celular: abrir "Hoy", enviar por WhatsApp, marcar, llamar y anotar respuestas, sin tocar la planilla.

---

## 7. Fase 3 — Recordatorios

### 7.1 Aviso diario
- Días hábiles a las 08:30 hora Argentina (11:30 UTC), con el mecanismo elegido en §2.
- Texto: *"Hoy tenés 3 seguimientos, 2 llamadas y 5 talleres nuevos → {link a Hoy}"*. Si hay atrasados: *"…y 2 atrasados"*.
- **Anti-espera:** si no hay seguimientos ni nuevos cargados, el aviso no se saltea. Dice: *"Hoy no tenés seguimientos. Sumá 5 talleres nuevos (te quedan N sin contactar)"*. Si no quedan sin contactar: *"Se terminó la lista: corré el generador para una ciudad nueva"*.
- Si una reunión agendada es hoy: aviso aparte una hora antes.

### 7.2 Plantillas de mensajes (hasta que exista la Fase 5)
Se rellenan con `{taller}`, `{ganchoCorto}`, `{video}` y `{firma}`. Si `ganchoCorto` está vacío, se saca esa frase y el mensaje sigue funcionando.

**Variante A · Recompra**
- **Contacto 1 (WhatsApp):** *"Hola, ¿cómo va? Soy Martín de ReportCar. Vi {taller} en Maps, {ganchoCorto} 👏 Una consulta rápida: ¿cómo hacés hoy para avisarle a un cliente que le toca el service? 1️⃣ Le escribo o lo llamo a mano 2️⃣ Espero que vuelva solo 3️⃣ Tengo un sistema"*
- **Contacto 2 (WhatsApp):** *"Te pregunto porque muchas veces el cliente no se va por precio: se va porque nadie le escribió. Armamos para talleres un sistema que te muestra cada mañana a quién le toca el service, y el WhatsApp sale escrito con tu nombre. Te dejo un video de 1 minuto: {video}. Es pago único, sin abono mensual. ¿Te muestro en 15 minutos cómo quedaría con {taller}?"*

**Variante B · Sin abono**
- **Contacto 1 (WhatsApp):** *"Hola, ¿cómo va? Soy Martín de ReportCar. Vi {taller} en Maps, {ganchoCorto} 👏 Una consulta: ¿hoy usan algún sistema para el taller? 1️⃣ No, todo en papel o Excel 2️⃣ Sí, uno que pago por mes 3️⃣ Sí, uno propio"*
- **Contacto 2 (WhatsApp):** *"Te pregunto porque hacemos sistemas para talleres que se pagan una sola vez: sin abono mensual, y la app y los datos quedan a tu nombre. El auto entra con fotos y firma, sale con un informe con tu logo, y el sistema te avisa a quién le toca el service. Video de 1 minuto: {video}. ¿Te lo muestro en 15 minutos?"*

**Contacto 3 (llamada, ambas variantes):**
1. *"Hola, ¿hablo con el encargado de {taller}? Soy Martín de ReportCar, te escribí por WhatsApp hace unos días."*
2. *"Te llamo porque ayudamos a talleres como el tuyo a que los clientes vuelvan solos a hacer el service. ¿Cómo lo manejan hoy?"*
3. Si hay interés → agendar videollamada de 15 minutos. Si no → *"¿Te puedo escribir en unos meses?"*

**Contacto 4 (WhatsApp):** *"Hola, te escribí hace unos días por el sistema para {taller}. Entiendo que estás a full; si no es el momento, no hay problema. ¿Lo dejamos para más adelante o te interesa verlo?"*

Las plantillas se editan desde el panel (pantalla de configuración) y se guardan en la base, no en el código.

### 7.3 Resumen semanal
Viernes 17:00 hora Argentina: *"Semana: 40 contactados, 5 respondieron (A: 3, B: 2), 2 reuniones. Constancia: 4 de 5 días."*

**Listo cuando:** el aviso llega todos los días hábiles con los números correctos, y el link abre directo la pantalla "Hoy".

---

## 8. Fase 4 — Generador de listas

### 8.1 Entrada
`data/ciudades.json`: `[{ "nombre": "Neuquén", "provincia": "Neuquén", "ola": 1, "lat": -38.95, "lng": -68.06, "radioKm": 15 }]`. Se corre por script (`bun run listas --rubro talleres --ciudad "Neuquén"` o `--ola 1`, con `--dry-run`, `--limit`, `--force`) y, si Code lo ve simple, también desde el panel o con un workflow manual de GitHub Actions.

### 8.2 Búsqueda
- `POST https://places.googleapis.com/v1/places:searchText`, con `languageCode: "es"`, `regionCode: "AR"`, `locationBias` y `X-Goog-FieldMask` mínimo: `places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.rating,places.userRatingCount,places.websiteUri,places.googleMapsUri,places.types,places.reviews,nextPageToken`.
- Una consulta por cada texto de `busquedas`, paginando. Deduplicar por `place.id`. Aplicar los filtros del rubro.
- Guardar directo en la base como `sin_contactar`, con variante alternada y canal según el teléfono. **Nunca pisar** estado, eventos ni notas de negocios existentes. Cruzar con los importados por nombre + ciudad para no duplicar.

### 8.3 Análisis con Claude
Para cada negocio nuevo (o con `--force`): nombre, ciudad, rating, cantidad de reseñas, tipos y hasta 5 reseñas sin autor, más `producto` y `senales` del rubro. Salida JSON estricta, validada con zod (un reintento si falla):

```ts
type Analisis = {
  prioridad: "A" | "B" | "C"; score: number;
  tamanoEstimado: "chico" | "mediano" | "grande";
  senalesRecompra: string[]; senalesEntrega: string[]; dolores: string[]; yaHaceManual: string[];
  varianteSugerida: "A" | "B";
  gancho: string;       // 1-2 frases, para Martín
  ganchoCorto: string;  // máx. 10 palabras, para el mensaje
  alertas: string[];
};
```

Consigna base:
```
Sos analista comercial de {marca}. Vendemos a {rubro} un sistema propio con pago único, sin abono mensual.
La versión base incluye: {producto.base}.

Con los datos y reseñas de este negocio devolvé SOLO el JSON pedido:
- tamanoEstimado: por volumen de reseñas y menciones de equipo, recepción, turnos, grúa.
- senalesRecompra / senalesEntrega / dolores / yaHaceManual: solo con evidencia en las reseñas (frase corta parafraseada). Nunca inventes.
- varianteSugerida: "A" si hay señales de clientes que vuelven o de avisos; "B" si es un negocio grande que probablemente ya paga o evalúa un sistema.
- gancho: 1 o 2 frases concretas para que el vendedor entienda a quién le habla.
- ganchoCorto: máximo 10 palabras, elogio o dato verificable para incluir en el primer mensaje (ej. "391 reseñas, impresionante").
- prioridad A = mediano/grande con señales claras; B = mediano sin señales fuertes; C = chico o con alertas.
No incluyas nombres de clientes.
```

**Listo cuando:** correr Neuquén agrega a la base los talleres filtrados con análisis, sin duplicar los importados, y aparecen en "Hoy" según la prioridad.

---

## 9. Fase 5 — Mensajes con Claude

Para cada negocio con análisis, Claude escribe los contactos 1, 2 y 4 partiendo de la plantilla de su variante, adaptados con el gancho. Se guardan en `mensajes/{paso}`; el panel los muestra en lugar de la plantilla, y Martín puede editarlos.

Reglas para la consigna: español rioplatense con voseo; máximo 450 caracteres; el contacto 1 siempre con opciones numeradas (1️⃣ 2️⃣ 3️⃣); sin precios; no prometer nada fuera de `producto.base` (los opcionales no se mencionan en frío); mantener la estructura y la pregunta de la plantilla; firma `{firma}`.

Las métricas comparan las tasas de respuesta de "plantilla" contra "Claude" además de A contra B.

---

## 10. Uso y lectura de las métricas

- Ritmo de referencia: unos 25 negocios nuevos por semana, mitad variante A y mitad B.
- Los contactos que llegan por canales cálidos (cámaras como FAATRA, red GPS Taller, repuesteras, leads de Meta) se cargan como alta manual con su origen, para comparar canales.
- El contacto 2 lleva un video genérico de 60 segundos sobre la demo "Tu Taller" con el flujo de la Etapa 1 (ingreso con fotos → informe con logo → aviso de service por WhatsApp). El link va en `videoUrl`.

Cómo leer los números al mes de uso:

| Lo que muestran las métricas | Qué ajustar |
|---|---|
| ≥10% responden y hay reuniones | Seguir con la variante que mejor funciona y sumar ciudades con la Fase 4 |
| Responden pero no agendan | Ajustar el contacto 2 y cómo se presenta la oferta |
| <5% responden | Cambiar el gancho o el tipo de negocio |
| Los canales cálidos traen más que el frío | Darles más tiempo; el frío queda como complemento |

---

## 11. Variables de entorno (`.env.example`)

```
FIREBASE_PROJECT_ID=
FIREBASE_SERVICE_ACCOUNT_JSON=     # scripts y Actions
MARTIN_UID=
NTFY_TOPIC=                        # nombre largo y aleatorio
PANEL_URL=
GOOGLE_PLACES_API_KEY=             # Fase 4 (y opcional en la importación)
ANTHROPIC_API_KEY=                 # Fases 4-5 (y opcional en la importación)
ANTHROPIC_MODEL_ANALISIS=claude-haiku-5-5
ANTHROPIC_MODEL_MENSAJES=claude-sonnet-5-5
```
Las API keys de Places y Anthropic se usan solo en scripts o funciones de servidor, nunca en el panel.

## 12. Costos y control
Cada script imprime llamadas a Places y tokens usados. `--dry-run` para estimar antes de gastar. Alertas de presupuesto en Google Cloud y límite de gasto en la consola de Anthropic. Verificar que el uso de Firebase quede dentro del plan gratuito.

## 13. Orden de trabajo con Claude Code

1. *"Leé SPEC.md. Proponé cómo resolver las decisiones de la sección 2 y la estructura del repo."*
2. *"Fase 1: base de datos, `rubros/talleres.json` e importación de `talleres-planilla.csv`."*
3. *"Fase 2: pantalla Hoy con WhatsApp, llamada y la lógica de la secuencia. Después ficha, lista y métricas."*
4. *"Fase 3: aviso diario y resumen semanal."* → **desde acá Martín ya usa la app todos los días.**
5. *"Fase 4: generador de listas. Probá Neuquén con `--dry-run`."*
6. *"Fase 5: mensajes con Claude."*
