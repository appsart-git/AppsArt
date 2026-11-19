# Decisiones de la §2 (propuesta del 19/11/2026)

> Para Claude Code en la otra PC: leé `SPEC.md` y este archivo antes de arrancar la Fase 1.
> Están propuestas, todavía no confirmadas por Martín: revisalas con él antes de escribir código.

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
