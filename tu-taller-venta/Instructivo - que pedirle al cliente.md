# Instructivo: qué pedirle al cliente para instalar Tu Taller

Oct 12, 2026 · @Martin

## Resumen

Al cliente le pedís dos cosas obligatorias y una opcional. El proyecto lo creás vos y después lo invitás; el cliente no tiene que configurar nada técnico.

| # | Qué le pedís | Obligatorio | Quién lo hace | Tiempo del cliente |
| --- | --- | --- | --- | --- |
| 1 | Una cuenta de Google (Gmail) del taller | Sí | El cliente | 5 minutos si no tiene una |
| 2 | Que acepte la invitación como Propietario del proyecto | Sí | Vos invitás, el cliente acepta un mail | 2 minutos |
| 3 | Si quiere usar su dominio: que agregue un registro en el DNS | No | El cliente o quien le maneja la página web | 10 minutos |

Una corrección a la idea original: para el dominio no hay que crear una "subpágina". Lo que se agrega es un **registro CNAME**, que es una línea de configuración que dice "esta dirección apunta a la app". Su página web no se toca.

Además, pedí los datos para cargar en la app: logo, nombre del taller, dirección, teléfono y la lista de clientes.

## Paso 1: la cuenta de Google del taller

Lo ideal es una cuenta del **taller**, no la personal del dueño ni la de un empleado. Así, si alguien se va, el sistema no queda atado a esa persona.

**Qué pedirle:**

- La dirección de Gmail del taller, por ejemplo `tallerperez@gmail.com`.
- Si no tiene una, que la cree en [accounts.google.com/signup](https://accounts.google.com/signup).
- Que tenga el **celular de recuperación** cargado en la cuenta. Es lo que le permite recuperarla si se olvida la contraseña.

**Nunca le pidas la contraseña.** No la necesitás: vos entrás con tu propia cuenta como segundo propietario.

**Mensaje para mandarle:**

> "Hola \[nombre\], para instalar el sistema necesito el mail de Gmail del taller. Si no tienen uno, te recomiendo crear uno solo para el taller, por ejemplo \[nombretaller\]@gmail.com, y cargarle tu celular para recuperarlo. Pasame la dirección, la contraseña no la necesito."

## Paso 2: acceso al proyecto de Firebase

Vos creás el proyecto desde tu cuenta y le mandás una invitación a la cuenta del taller como **Propietario**. Cuando la acepta, quedan los dos como dueños con los mismos permisos: los datos son del taller y vos podés dar soporte.

**Lo que hacés vos:**

1. Creá el proyecto en [console.firebase.google.com](https://console.firebase.google.com) con el nombre del taller, por ejemplo `tutaller-perez`. Dejalo en el plan gratuito (Spark), sin tarjeta.
2. Andá a **Configuración del proyecto** (el engranaje) y entrá en **Usuarios y permisos**.
3. Tocá **Agregar miembro**, escribí el Gmail del taller y elegí el rol **Propietario**.
4. Google le manda un mail de invitación al taller.

**Lo que hace el cliente:** abrir el mail de Google y tocar **Aceptar invitación**. Si no lo encuentra, que lo busque en Spam o en Promociones.

**Mensaje para mandarle:**

> "Te acabo de mandar una invitación de Google Firebase a \[gmail del taller\]. Es el lugar donde va a quedar guardado tu sistema y los datos de tus clientes, a tu nombre. Abrí el mail y tocá 'Aceptar invitación'. Si no te llega, fijate en Spam. Cuando lo aceptes, avisame."

**Cómo comprobar que quedó bien:** en **Usuarios y permisos** tienen que aparecer las dos cuentas, la tuya y la del taller, con el rol Propietario.

A tener en cuenta: Google limita cuántos proyectos puede crear una misma cuenta. Si con muchos clientes llegaras a ese límite, se puede pedir un aumento a Google, o pedirle al cliente que cree él el proyecto y te invite a vos con los mismos pasos.

## Paso 3 (opcional): dominio propio

Si el taller no tiene dominio, o no le importa, la app queda en una dirección gratuita del tipo `tutaller-perez.web.app` y este paso se saltea. Si ya tiene página web, la app puede quedar en un subdominio, por ejemplo `app.tallerperez.com.ar`, sin tocar la página.

**Qué preguntarle:**

1. "¿Tenés página web? ¿Cuál es la dirección?"
2. "¿Quién te la hizo o dónde la pagás?" Con eso sabés quién maneja el DNS: la empresa de hosting (con cPanel, como en la prueba con entrepymes), Cloudflare o un diseñador.
3. "¿Cómo querés que se llame la dirección del sistema?" Sugerí `app.`, `sistema.` o `clientes.` delante del dominio.

**Qué pedirle, según el caso:**

- **Si te puede dar acceso al cPanel o al panel del dominio:** entrás vos y cargás el registro, como hiciste en la prueba.
- **Si la web la maneja otra persona:** mandale a esa persona el mensaje de abajo, con los datos que te da Firebase al agregar el dominio.

**Mensaje para quien maneja la web del taller:**

> "Hola, soy Martín de AppsArt. Estamos instalando un sistema para \[nombre del taller\] y necesitamos que agregues este registro en la zona DNS de \[dominio\]: tipo CNAME, nombre \[app.dominio\], valor \[proyecto\].web.app. Es solo agregar ese registro: no hay que modificar ni borrar ninguno de los que ya existen, así no se afectan la web ni el mail. Gracias."

**Cómo comprobar que quedó bien:** en Firebase, en **Hosting**, el dominio pasa a decir **Conectado**. Después, la dirección abre la app con el candadito de https. Puede tardar entre unos minutos y 24 horas.

**El dominio lo sigue pagando el taller** a quien ya se lo pagaba, una vez por año. Si deja de pagarlo, la app se puede seguir usando desde la dirección gratuita `.web.app`.

## Lo que hacés vos: instalación

Este es el orden de trabajo una vez que el cliente aceptó la invitación. Los pasos 5 y 6 ya los probaste con `taller.entrepymes.com.ar`.

- [ ] Crear el proyecto en plan Spark, sin tarjeta, e invitar al taller como Propietario (Paso 2)
- [ ] Crear la base de datos Firestore, en una ubicación de Sudamérica (`southamerica-east1`, San Pablo)
- [ ] Configurar las reglas de seguridad y el usuario de acceso del taller, para que nadie más pueda leer sus datos
- [ ] Cargar la configuración del proyecto en la app y sacar los datos de ejemplo de la demo
- [ ] Publicar la app en Firebase Hosting y comprobar que abre en `[proyecto].web.app`
- [ ] Si hay dominio propio: agregarlo en Hosting y cargar el CNAME (Paso 3)
- [ ] Cargar en Configuración el logo, el nombre, la dirección y el teléfono del taller
- [ ] Cargar la lista inicial de clientes
- [ ] Instalar la app en el celular del taller ("Agregar a pantalla de inicio") y en la computadora del mostrador
- [ ] Mostrarle dónde está el botón "Exportar respaldo" y acordar que lo usen una vez por mes
- [ ] Anotar la fecha de entrega: desde ahí corren los 60 días de garantía
