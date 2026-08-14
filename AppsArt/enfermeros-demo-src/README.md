# CuidaHoy (nombre provisorio) — DEMO

**Esto es una demo interna de AppsArt, para probar los flujos y ganar experiencia con este
tipo de producto. No es la versión de producción y no debe usarse con datos reales de
pacientes ni enfermeros.** La versión pensada para eventualmente llegar a producción es
`app-enfermeros/` (Next.js + Supabase), que queda intacta como referencia — este demo
no la reemplaza, es un prototipo aparte hecho en HTML/JS plano + Firebase porque esta PC
no tiene Node instalado.

Marketplace tipo Uber, pero conectando enfermeros matriculados con pacientes que
necesitan atención a domicilio (curaciones, inyecciones, control de signos vitales,
cuidado post-operatorio).

## Arquitectura

Sin build step, sin npm — HTML/JS plano cargando el SDK de Firebase por CDN, mismo patrón
que el resto de las apps de AppsArt (Mundo Repuestos, LYM Inyección). Tres portales
separados (pensados para repartirse como links distintos, tal como se conversó con el
cliente sobre distribución):

- `index.html` — landing, con botones a paciente/enfermero
- `paciente.html` — registro / login / pedir un enfermero / ver estado de pedidos
- `enfermero.html` — registro con matrícula / login / ver turnos asignados
- `admin.html` — login de administrador / aprobar-rechazar enfermeros / gestionar pedidos

## Setup (una sola vez)

1. Entrá a **console.firebase.google.com** y creá un proyecto nuevo.
2. **Compilación → Authentication** → pestaña "Sign-in method" → habilitar
   "Correo electrónico/contraseña".
3. **Compilación → Firestore Database** → crear base de datos (modo producción).
4. **Compilación → Storage** → comenzar (ahí se guardan las fotos/PDF de matrícula).
   Nota: igual que con los otros proyectos de AppsArt, Google pide pasar al plan Blaze
   (pago por uso, con tarjeta asociada) para habilitar Firestore/Storage, aunque el uso
   se mantenga gratis dentro de las cuotas — conviene poner una alerta de presupuesto.
5. Ícono de tuerca → **Configuración del proyecto** → agregar app Web (`</>`) → copiar el
   objeto `firebaseConfig`.
6. Abrir cualquiera de las tres páginas (`paciente.html`, `enfermero.html` o `admin.html`)
   y pegar ese objeto en la pantalla de configuración inicial. Queda guardado en el
   navegador (misma config para las tres páginas, no hay que repetirlo).

## Crear el primer admin

No hay pantalla de "registro" para admin a propósito. Para dar de alta uno:

1. Firebase Console → Authentication → pestaña "Users" → **Add user** → cargar
   email/contraseña a mano.
2. En la lista de usuarios, copiar el valor de la columna **"User UID"** (el código
   largo, no el email).
3. Firestore Database → pestaña "Datos". **Importante:** el botón para crear la
   colección tiene que apretarse estando en la raíz de la base de datos (el breadcrumb
   de arriba muestra solo el nombre de la base, sin ningún documento adelante) — si lo
   apretás estando adentro de otro documento, crea una *subcolección* anidada ahí
   adentro en vez de una colección de primer nivel, y el código no la va a encontrar.
   Con eso claro:
   - **"+ Iniciar colección"** (o "+ Agregar colección" si ya hay otras)
   - ID de la colección: `admins` (minúscula, con "s")
   - Siguiente
   - ID del documento: cambiar de "autogenerado" a manual y pegar el UID del paso 2
   - Agregar cualquier campo (ej. `nombre` de tipo string, valor `"Martín"`) — el campo
     en sí no importa, el código solo chequea que el documento exista
   - Guardar
4. Entrar a `admin.html` con ese email/contraseña.

Si en vez de "no tiene permisos de administrador" te tira "Email o contraseña
incorrectos", el problema es otro: revisá que el usuario esté bien cargado en
Authentication, no el documento de Firestore.

## Probar en esta PC (sin Node)

Como el navegador no ejecuta bien JS en páginas abiertas directo como archivo, para
probar localmente hay un mini-servidor estático (`_serve.ps1`, usa
`System.Net.HttpListener` de PowerShell, no depende de Node/Python) que sirve esta
carpeta en `http://localhost:8899/`. Para producción esto no hace falta — se sube tal
cual a Netlify Drop, como el resto de las apps.

## Reglas de seguridad de Firestore

**Mientras sea demo interna** (sin datos reales), sirven reglas simples — mismo criterio
que Mundo Repuestos/LYM:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**Antes de usarla con pacientes/enfermeros reales**, pasar a reglas por usuario (cada uno
solo ve/edita lo suyo, el admin ve todo):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() { return request.auth != null; }
    function isAdmin() {
      return isSignedIn() &&
        exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }

    match /admins/{adminId} {
      allow read: if isSignedIn() && request.auth.uid == adminId;
      allow write: if false; // se crean a mano desde la consola
    }

    match /pacientes/{pacienteId} {
      allow read, write: if isSignedIn() && request.auth.uid == pacienteId;
      allow read: if isAdmin();
    }

    match /enfermeros/{enfermeroId} {
      allow create: if isSignedIn() && request.auth.uid == enfermeroId;
      allow read: if isSignedIn();
      allow update: if isAdmin() ||
        (isSignedIn() && request.auth.uid == enfermeroId &&
         request.resource.data.estado == resource.data.estado); // no puede autoaprobarse
    }

    match /pedidos/{pedidoId} {
      allow create: if isSignedIn() && request.resource.data.pacienteId == request.auth.uid;
      allow read: if isSignedIn() &&
        (resource.data.pacienteId == request.auth.uid ||
         resource.data.enfermeroId == request.auth.uid || isAdmin());
      allow update: if isAdmin() ||
        (isSignedIn() && resource.data.pacienteId == request.auth.uid);
    }
  }
}
```

## Reglas de seguridad de Storage (matrículas)

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /matriculas/{uid}/{fileName} {
      allow read: if request.auth != null && request.auth.uid == uid;
      allow write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

Nota: para que el admin pueda ver la matrícula de cualquier enfermero (botón
"Ver matrícula" en `admin.html`), hace falta sumar una condición que consulte la
colección `admins` desde las reglas de Storage. Si al probarlo el botón falla por
permisos, la solución rápida para la etapa de demo es dejar `allow read: if request.auth
!= null;` (cualquier usuario logueado puede ver cualquier matrícula) y endurecerlo antes
de manejar datos reales.

## Avisos push (enfermero/pedido nuevo para admins; pedido asignado para el enfermero)

Cuando se crea un enfermero o un pedido, una Cloud Function le manda un push a todos los
admins que hayan activado los avisos. Cuando un pedido pasa de "sin asignar" a asignado a
un enfermero puntual, esa misma Cloud Function le manda el push solo a **ese** enfermero
(token guardado en `enfermeroTokens/{token}`, filtrado por `uid` — a diferencia de
`adminTokens`, que le llega a todos los admins por igual). Llega aunque el celular esté
bloqueado o el sitio no esté abierto. Es la primera pieza de este proyecto que corre en un
servidor (Cloud Functions) en vez de ser solo archivos estáticos, así que el setup tiene
más pasos que el resto:

1. **Generar la clave VAPID** (pública, no es secreta): Firebase Console → ícono de
   tuerca → "Configuración del proyecto" → pestaña "Cloud Messaging" → sección
   "Certificados push web" → "Generar par de claves". Copiar la clave y pegarla en
   `app-admin.js`, reemplazando `VAPID_KEY = "PENDIENTE_PEGAR_VAPID_KEY"`.
2. **Generar la credencial de servicio** (esta SÍ es secreta, no compartirla por chat ni
   subirla al repo): ícono de tuerca → "Configuración del proyecto" → pestaña "Cuentas de
   servicio" → "Generar nueva clave privada" → descarga un `.json`.
3. **Cargarla como secreto de GitHub**: en el repo real (github.com, no este checkout
   local) → Settings → Secrets and variables → Actions → "New repository secret" →
   nombre `CUIDAHOY_FIREBASE_SERVICE_ACCOUNT` → pegar el contenido completo del `.json`
   descargado → Add secret.
4. **Copiar el workflow a su lugar real**: este repo local no es la raíz real del repo de
   GitHub (ver nota de estructura del proyecto), así que GitHub Actions no lee workflows
   guardados acá. Copiar el contenido de `.github-workflow/cuidahoy-deploy-functions.yml`
   tal cual a un archivo nuevo en `.github/workflows/cuidahoy-deploy-functions.yml` en la
   raíz real del repo (se puede crear directo desde la interfaz web de GitHub: "Add file"
   → "Create new file").
5. **Disparar el primer deploy**: en GitHub → pestaña "Actions" → el workflow
   "CuidaHoy — Deploy Cloud Functions" → "Run workflow" (el primer despliegue de Cloud
   Functions puede tardar unos minutos y a veces pide habilitar alguna API de Google Cloud
   la primera vez — si falla, el log del workflow dice cuál).
6. **En el panel admin y en el panel del enfermero** (una vez aprobado): aparece un botón
   "🔔 Activar avisos" — tocarlo y aceptar el permiso del navegador. En iPhone, para que
   funcione con la app cerrada hace falta haber agregado el sitio a la pantalla de inicio
   primero (y tener iOS 16.4 o más nuevo).

Los tokens de dispositivo quedan guardados en las colecciones `adminTokens` /
`enfermeroTokens` de Firestore (ya cubiertas por las reglas simples de la sección
anterior).

## Lo que falta para el MVP completo (no incluido en este demo)

- **Cobro con Mercado Pago**: hoy el pago se marca a mano desde el panel admin
  (`pagoEstado`). Falta el link de cobro y la confirmación automática — necesita una
  Cloud Function (desplegable por GitHub Actions, sin instalar nada local), no se puede
  hacer 100% client-side por el token privado de Mercado Pago.
- **Íconos reales de PWA / manifest / service worker**: todavía no están.
- **Términos y Condiciones / Política de Privacidad**: falta la página con el disclaimer
  de que la plataforma es intermediaria y no presta el servicio de salud en sí, más el
  tratamiento de datos sensibles de salud (Ley 25.326).
- **Entrada por WhatsApp / QR / dominio corto**: tal como se conversó, la app web
  necesita estos canales porque no pasa por tiendas de aplicaciones.
- **Notificación al paciente** cuando cambia el estado de su pedido (asignado, confirmado,
  etc.) — ya existen los avisos push a los *admins* (enfermero/pedido nuevo) y al
  *enfermero* (cuando le asignan un pedido), pero falta avisarle al paciente. Se
  resolvería sumando otro trigger a la misma Cloud Function, mismo patrón que el resto.
- **Calificaciones** de paciente/enfermero al finalizar un servicio — no tiene UI todavía.

## Nombre y marca

"CuidaHoy" es un nombre de trabajo provisorio, no confirmado con el cliente. El logo
también queda pendiente — hoy usa un ícono de emoji como placeholder en vez de un logo
real. Cuando se confirme el nombre, reemplazar el texto "CuidaHoy" en `index.html`,
`paciente.html`, `enfermero.html` y `admin.html` (título de cada página y `brand-name`
en `index.html`).
