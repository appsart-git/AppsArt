# Decisiones de la §2 (propuesta del 19/11/2026)

> Para Claude Code (en cualquier PC): leé `SPEC.md` y este archivo antes de seguir.
> El 25/11/2026 Martín pidió avanzar con estas decisiones y se arrancó en la PC corporativa (sin Bun/Node).

## Estado (25/11/2026)

**Hecho y probado en modo demo** (`panel/?demo`, datos en localStorage):
- Fase 1: `rubros/talleres.json`, importación del CSV desde el panel (idempotente, alterna A/B, canal según teléfono), export a CSV, reglas de Firestore.
- Fase 2 (parte): pantalla **Hoy** (atrasados → seguimientos → nuevos A/B/C, contador, mensaje editable, WhatsApp, llamar + guion, Enviado/Llamé, Respondió, Sin WhatsApp, Posponer, Descartar con "no contactar"), **Lista** con filtros, **Ficha** editable con historial y botones de estado/reunión, **alta manual** con fuente.
- Workflow `.github/workflows/prospector-deploy.yml` (Hosting + reglas). No hace nada hasta que existan los secrets.

**Falta:**
- Fase 2: métricas, vista de columnas del pipeline, editor de plantillas en el panel.
- Fase 1 con datos reales: crear el proyecto Firebase y la importación de los 50 (CSV fuera del repo).
- `ganchoCorto` y `placeId` de los importados (workflow con Bun + Claude/Places).
- Fases 3, 4 y 5.

**Cambios respecto de la spec (a propósito):**
- `proximoToque`, `primerContacto` y `ultimoContacto` se guardan como texto `YYYY-MM-DD` en hora de Argentina, no como Timestamp: se comparan sin problemas de zona horaria y el script del aviso usa la misma cuenta. `reunionFecha` es `YYYY-MM-DDTHH:mm` (hora AR). Eventos y `creado`/`actualizado` sí son Timestamp.
- El `id` de los importados queda `manual_<slug de nombre+ciudad>` para siempre; si después se encuentra el lugar en Maps se guarda en el campo `placeId` (no se cambia el id, para no mover eventos).
- La lógica compartida está en `panel/lib/` (no en `lib/`), para que Hosting la sirva sin build; los scripts de Bun la importan desde ahí.
- Campos nuevos: `secuenciaTerminada`, `ultimoContacto`, `ciclo`, `fuente` (canal cálido: Meta, FAATRA…), `reunionFecha`, `reunionAvisada`.
- Nuevos primeros contactos por día = `maxContactosDia` − primeros contactos ya hechos hoy. Los seguimientos no tienen tope.

## Puesta en marcha de Firebase (una sola vez)

1. console.firebase.google.com → Agregar proyecto (ej. `reportcar-prospector`), sin Analytics. Plan Spark.
2. Build → Firestore Database → Crear (modo producción, región `southamerica-east1`).
3. Build → Authentication → Comenzar → proveedor **Google** activado.
4. Configuración del proyecto → Tus apps → App web → copiar la config a `panel/app/firebase-config.js`.
5. Configuración del proyecto → Cuentas de servicio → Generar clave privada. En GitHub → Settings → Secrets → Actions: `PROSPECTOR_FIREBASE_SERVICE_ACCOUNT` (el JSON completo) y `PROSPECTOR_FIREBASE_PROJECT_ID`. A la cuenta de servicio darle el rol **Firebase Hosting Admin** y **Firebase Rules Admin** (o Editor) en console.cloud.google.com → IAM.
6. Push → el workflow publica el panel en `https://<proyecto>.web.app`. En Authentication → Configuración → Dominios autorizados ya figura ese dominio.
7. Entrar al panel con Google → muestra tu UID → en Firestore crear `usuarios/<UID>` con `rol: "admin"` → recargar.
8. Más → Importar planilla → elegir `talleres-planilla.csv`.

## Probar sin Firebase

En la PC corporativa: preview `reportcar-prospector` de `.claude/launch.json` (servidor PowerShell en el puerto 8904) y abrir `http://localhost:8904/?demo`.

## Contexto que condiciona todo

- **El repo `appsart-git/AppsArt` es PÚBLICO.** Nunca commitear `talleres-planilla.csv` (teléfonos, notas, objeciones), `.env`, el topic de ntfy ni keys. Agregar el CSV y `.env` al `.gitignore` desde el primer commit.
- La PC corporativa de Martín no tiene Bun/Node/Firebase CLI y no se pueden instalar. Por eso:
  - El **panel no tiene build** (se edita y se prueba desde cualquier PC).
  - Todo lo **programado** (cron) corre en **GitHub Actions**.
  - Los **scripts** se pueden correr con Bun en local (en la otra PC) **y** como workflow manual de Actions (para usarlos desde la PC corporativa o el celular).

## Decisiones

| Decisión | Propuesta |
|---|---|
| Base de datos | **Firestore** en un proyecto Firebase nuevo y separado (ej. `appsart-reportcar-prospector`, plan Spark). Auth con Google. Colección `usuarios/{uid}` con `rol`; las reglas solo dejan entrar a quien esté ahí (permite sumar un segundo usuario sin tocar código). |
| Planilla | **La app es la fuente de verdad.** Importación idempotente (id = `placeId` o `manual_<slug>`). Export a CSV desde el panel y por script. El CSV vive fuera del repo. |
| Panel | **PWA sin build**: HTML + ES modules, Firebase modular SDK por CDN (gstatic), dependencias vía import map (esm.sh, ej. `libphonenumber-js`). Hosting en **Firebase Hosting**, deploy con workflow de Actions en cada push a `reportcar-prospector/panel/**`. |
| Recordatorio | **GitHub Actions (cron) + ntfy.sh.** Aviso diario 11:30 UTC lun-vie; resumen viernes 20:00 UTC; cron cada 30 min en horario hábil solo para el aviso de reunión 1 h antes (marca `avisoEnviado` para no repetir). |
| Scripts | **Bun + TypeScript.** Keys de Places y Anthropic solo en `.env` local y en secrets de Actions, nunca en el panel. |

## Ajustes a la spec

1. **Código compartido** (`lib/secuencia.js`, `phone.js`, `plantillas.js`, `csv.js`) en JS plano con `// @ts-check`, importable desde el panel (import map) y desde Bun. Así la cuenta de `proximoToque` es la misma en los dos lados.
2. **Rubro**: `rubros/talleres.json` es la semilla; un script lo sube a `rubros/talleres` en Firestore. Panel y scripts leen de Firestore; las plantillas se editan en el panel (§7.2).
3. **Reseñas**: no persistir el texto. Se usan en memoria para el análisis y se guarda solo `Analisis` (más seguro con los términos de Google Maps).
4. **ntfy**: los avisos llevan solo números y el link, sin nombres de talleres (el topic es legible por cualquiera que lo conozca). `NTFY_TOPIC` como secret.
5. **Cron de Actions**: puede llegar 5–20 min tarde, y GitHub lo desactiva tras 60 días sin commits en el repo.
6. **Importación de los 50**: `ganchoCorto` con Haiku (una llamada por fila) y `placeId` solo con match claro nombre + ciudad; ambos con `--dry-run` primero y revisables en la ficha.
7. **Métricas**: desde los documentos de `negocios` (estado como orden); "contactos por día" con una consulta sobre `eventos` de las últimas 4 semanas.

## Estructura

```
reportcar-prospector/
  SPEC.md, DECISIONES.md
  panel/      index.html, app/*.js, sw.js, manifest.json, firestore.rules, firebase.json
  lib/        secuencia.js, phone.js, plantillas.js, csv.js
  scripts/    importar.ts, enriquecer.ts, listas.ts, mensajes.ts, aviso.ts, resumen.ts, export.ts
  rubros/     talleres.json
  data/       ciudades.json
.github/workflows/prospector-{deploy,aviso,resumen,listas,enriquecer,mensajes}.yml
```
