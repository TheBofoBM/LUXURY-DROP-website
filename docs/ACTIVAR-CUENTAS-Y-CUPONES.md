# Activar cuentas y cupones reales

**El proyecto actual ya tiene las tablas y la conexión configuradas.** Consultar [ESTADO-SUPABASE.md](ESTADO-SUPABASE.md) antes de ejecutar SQL. Los pasos de creación siguientes sirven como referencia para un proyecto nuevo.

El frontend permanece en GitHub Pages. Supabase aporta Auth (correo y Google) y PostgreSQL. Mientras falten sus dos valores públicos, el sitio funciona como **vista previa**: no pide datos personales, ofrece un perfil de ejemplo y emite códigos `LD-DEMO-…` sin valor de canje. Esa simulación se almacena en este navegador; no ofrece seguridad, sincronización entre dispositivos ni canje real.

## 1. Crear el proyecto

1. Crear un proyecto en https://supabase.com/dashboard con tu cuenta de propietario.
2. Guardar la contraseña de la base de datos de forma privada.
3. En SQL Editor, ejecutar una vez y en orden `supabase/migrations/202610270001_welcome_coupons.sql` y `supabase/migrations/202610270002_manual_admin.sql`. Si la primera ya se aplicó, ejecutar solo la segunda. Ambas se ejecutan dentro de una transacción.
4. En Authentication → URL Configuration, configurar Site URL y una Redirect URL permitida exactamente como `https://thebofobm.github.io/LUXURY-DROP-website/` (incluye la barra final).

## 2. Acceso por correo

1. Habilitar Email en los proveedores de Authentication.
2. La configuración actual usa la plantilla predeterminada **con enlace de acceso** (`emailMode: 'magiclink'`). El cliente introduce su correo y abre el enlace con el mismo navegador para completar PKCE; no crea una contraseña.
3. El correo debe quedar verificado antes del giro. El servicio predeterminado permite pruebas con las direcciones del equipo, no el registro público de clientes.
4. Antes de abrir el registro al público, configurar SMTP propio y probar recepción, caducidad y límites de envío. Supabase exige SMTP propio para personalizar la plantilla. Si se prefiere un código, incluir `{{ .Token }}` en su cuerpo y cambiar a `emailMode: 'otp'`. Mantener el modo de la web y la plantilla sincronizados.

Referencia: https://supabase.com/docs/guides/auth/auth-email-templates

## 3. Google (opcional)

Crear un cliente OAuth Web en Google Cloud y habilitar el proveedor Google en Supabase, usando el callback que muestre el panel de Supabase (normalmente `https://TU-PROYECTO.supabase.co/auth/v1/callback`). El client secret de Google se guarda en el proveedor de Supabase, nunca en GitHub Pages. Completar la configuración/publicación de la pantalla de consentimiento de Google antes de abrir el acceso al público.

Referencia: https://supabase.com/docs/guides/auth/social-login/auth-google

## 4. Conectar GitHub Pages

En el repositorio → Settings → Secrets and variables → Actions → **Variables**, agregar:

| Variable | Valor |
| --- | --- |
| `SUPABASE_URL` | URL HTTPS del proyecto |
| `SUPABASE_PUBLISHABLE_KEY` | Clave publicable (`sb_publishable_…`) o la clave legacy `anon` |
| `SUPABASE_GOOGLE_ENABLED` | `true` únicamente si Google ya está habilitado; en otro caso `false` |
| `SUPABASE_EMAIL_MODE` | `magiclink` para enlace o `otp` cuando la plantilla envía código |
| `SUPABASE_EMAIL_DELIVERY` | `team-only` para el servicio de pruebas o `public` después de configurar y probar SMTP |

Son parámetros públicos del cliente. El build rechaza claves `sb_secret_…` y JWT con rol distinto de `anon`. **Nunca colocar `service_role`, secretos de Google o claves de pagos en el frontend, config.js, variables públicas o archivos del repositorio.**

Ejecutar Actions → Publicar Luxury Drop en GitHub Pages → Run workflow sobre `main`, o subir un nuevo commit. El build genera `dist/config.js` y empaqueta el cliente oficial de Supabase en `dist/vendor/supabase.js`. No se inicia ningún servidor local.

También es posible editar `dist/config.js` directamente con los dos parámetros públicos, pero las variables de Actions permiten hacerlo sin modificar el código.

## 5. Qué queda protegido por la base de datos

- Una sola fila por `(user_id, campaign)` impide un segundo giro de la misma campaña, incluso al caducar el primero.
- Un índice `UNIQUE` protege el código. Se genera en PostgreSQL con UUID aleatorio, sin aceptar código, monto ni fecha del navegador.
- `issued_at` y `expires_at` provienen del reloj del servidor, con diferencia exacta de 24 horas. La cuenta regresiva usa el desfase del reloj del servidor; la validación definitiva ocurre en PostgreSQL.
- RLS permite a clientes leer únicamente los cupones y ventas propios. No pueden editar ni canjear cupones. El panel de administración accede a funciones que vuelven a verificar el rol privado en cada solicitud.
- `ld_claim_welcome()` exige identidad y correo verificado. Si se repite una solicitud, devuelve el mismo cupón; no vuelve a sortear.
- El canje manual bloquea la fila de la cuenta y del cupón dentro de una transacción. Dos administradores no pueden consumir el mismo código. Un fallo revierte la operación completa.
- El derecho se limita a una cuenta sin compras pagadas. No identifica a una misma persona que use cuentas con correos diferentes; esto necesitaría reglas antifraude adicionales antes del lanzamiento.

Probabilidades propuestas, modificables en el SQL antes de activar la campaña: $50 (35%), $100 (30%), $150 (20%), $200 (10%), $300 (4%), $400 MXN (1%). El frontend muestra las mismas condiciones. Sin compra mínima propuesta, sin acumular descuentos, sin saldo a favor ni efectivo. El descuento se limita al subtotal de productos.

## 6. Ventas manuales: efectivo o transferencia

El carrito muestra una previsualización; copiar, ver o aplicar un cupón en esa vista **no lo reserva ni lo consume**. Para operar la promoción no hace falta integrar pagos en línea.

Una vez conectado Supabase, habilitar de forma privada tu cuenta administradora según [ADMINISTRACION.md](ADMINISTRACION.md). Desde **Administración** podrás consultar un código y registrar su canje cuando confirmes personalmente la venta. El panel calcula el descuento, conserva un historial y marca el código como utilizado, sin mover dinero.

La operación real queda lista al aplicar ambas migraciones, configurar Auth y otorgar el permiso de administrador. Las funciones anteriores de reserva/pago se conservan por compatibilidad; el flujo actual no depende de pasarelas ni webhooks.

## 7. Verificación antes de abrir al público

Las pruebas `npm test` ejecutan las migraciones reales en PostgreSQL embebido (PGlite) con una emulación de las identidades de Supabase. Cubren emisión repetida, 24 horas, permisos, aislamiento por cuenta y canjes manuales idempotentes. No sustituyen pruebas de OAuth, correo ni carga concurrente contra el proyecto alojado.

En el proyecto real, probar dos cuentas y dos administradores confirmando el mismo cupón al mismo tiempo; comprobar que solo se registra una venta. Verificar también acceso desde otro dispositivo, cierre de sesión, reconexión, expiración y reintentos tras un error de red. Todavía no se han ejecutado estas verificaciones contra un proyecto Supabase real.
