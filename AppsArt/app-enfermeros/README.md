# Enfermeros a Domicilio

MVP de marketplace tipo Uber, pero conectando enfermeros matriculados con pacientes que
necesitan atención a domicilio (curaciones, inyecciones, control de signos vitales,
cuidado post-operatorio).

## Setup

1. Crear un proyecto nuevo en [Supabase](https://supabase.com).
2. Correr `supabase/schema.sql` en el SQL editor del proyecto (crea las tablas,
   políticas RLS y el bucket de storage para las matrículas).
3. Copiar `.env.local.example` a `.env.local` y completar:
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Settings → API.
   - `SUPABASE_SERVICE_ROLE_KEY` — Settings → API (clave secreta, solo se usa en
     las rutas `/api/admin/*`, nunca se expone al cliente).
   - `ADMIN_PASSCODE` — la clave para entrar al panel de administración en `/admin`.
4. `npm install`
5. `npm run dev` y abrir `http://localhost:3000`

## Flujos

- **Paciente** (`/paciente/registro`): crea cuenta, pide un servicio (tipo, zona,
  fecha, horario), ve el estado de sus pedidos.
- **Enfermero** (`/enfermero/registro`): crea cuenta, sube su matrícula, queda
  "pendiente" hasta que el admin lo aprueba manualmente.
- **Admin** (`/admin`, con passcode): aprueba/rechaza enfermeros, revisa la matrícula
  subida, asigna enfermeros a pedidos y marca el estado de pago.

## Lo que falta para el MVP completo (no incluido en este scaffold)

- **Cobro con Mercado Pago**: hoy el pago se marca a mano desde el panel admin
  (`pago_estado`). Falta generar el link de cobro (Checkout Pro) al confirmar un
  pedido y el webhook que actualice `pago_estado` automáticamente.
- **Íconos reales de la PWA**: `public/icons/` está vacío — faltan `icon-192.png`,
  `icon-512.png` e `icon-512-maskable.png` con la marca del emprendimiento.
- **Términos y Condiciones / Política de Privacidad**: página pública con el
  disclaimer de que la plataforma es intermediaria y no presta el servicio de salud
  en sí, más el tratamiento de datos sensibles de salud (Ley 25.326).
- **Entrada por WhatsApp / QR / dominio corto**: tal como se conversó con la
  clienta, la app web necesita estos canales de entrada porque no pasa por
  tiendas de aplicaciones.
- **Notificaciones** (WhatsApp o push) cuando se asigna un enfermero a un pedido —
  hoy el paciente tiene que entrar a la app para ver el estado.
