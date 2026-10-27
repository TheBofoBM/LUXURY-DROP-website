# Activar cuentas y cupones reales

El frontend permanece en GitHub Pages. Supabase aporta Auth (correo y Google) y PostgreSQL. Mientras falten sus dos valores públicos, el sitio funciona como **vista previa**: no pide datos personales, ofrece un perfil de ejemplo y emite códigos `LD-DEMO-…` sin valor de canje. Esa simulación se almacena en este navegador; no ofrece seguridad, sincronización entre dispositivos ni canje real.

## 1. Crear el proyecto

1. Crear un proyecto en https://supabase.com/dashboard con tu cuenta de propietario.
2. Guardar la contraseña de la base de datos de forma privada.
3. En SQL Editor, ejecutar una vez el archivo `supabase/migrations/202610270001_welcome_coupons.sql` completo. La migración se ejecuta dentro de una transacción.
4. En Authentication → URL Configuration, configurar Site URL y una Redirect URL permitida exactamente como `https://thebofobm.github.io/LUXURY-DROP-website/` (incluye la barra final).

## 2. Acceso por correo

1. Habilitar Email en los proveedores de Authentication.
2. En Email Templates → Magic Link, incluir `{{ .Token }}` en el cuerpo. Por ejemplo: `<p>Tu código de acceso a Luxury Drop es: <strong>{{ .Token }}</strong></p>`. El frontend usa OTP; no solicita contraseña ni depende de un enlace en otra pestaña.
3. La persona introduce su correo, recibe un código y lo confirma. El correo debe quedar verificado antes del giro.
4. Antes de abrir el registro al público, configurar un proveedor SMTP propio y probar recepción, caducidad y límites de envío. El correo incluido por Supabase para desarrollo tiene restricciones; no es el envío comercial definitivo.

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

Son parámetros públicos del cliente. El build rechaza claves `sb_secret_…` y JWT con rol distinto de `anon`. **Nunca colocar `service_role`, secretos de Google o claves de pagos en el frontend, config.js, variables públicas o archivos del repositorio.**

Ejecutar Actions → Publicar Luxury Drop en GitHub Pages → Run workflow sobre `main`, o subir un nuevo commit. El build genera `dist/config.js` y empaqueta el cliente oficial de Supabase en `dist/vendor/supabase.js`. No se inicia ningún servidor local.

También es posible editar `dist/config.js` directamente con los dos parámetros públicos, pero las variables de Actions permiten hacerlo sin modificar el código.

## 5. Qué queda protegido por la base de datos

- Una sola fila por `(user_id, campaign)` impide un segundo giro de la misma campaña, incluso al caducar el primero.
- Un índice `UNIQUE` protege el código. Se genera en PostgreSQL con UUID aleatorio, sin aceptar código, monto ni fecha del navegador.
- `issued_at` y `expires_at` provienen del reloj del servidor, con diferencia exacta de 24 horas. La cuenta regresiva usa el desfase del reloj del servidor; la validación definitiva ocurre en PostgreSQL.
- RLS permite leer únicamente los cupones y pedidos propios. El navegador no tiene permiso para insertar, editar, reservar, canjear ni eliminar cupones.
- `ld_claim_welcome()` exige identidad y correo verificado. Si se repite una solicitud, devuelve el mismo cupón; no vuelve a sortear.
- Reserva y confirmación de pago bloquean la fila de la cuenta y del cupón dentro de la transacción. Dos pedidos no pueden reservar el mismo código. Un fallo revierte la operación completa.
- El derecho se limita a una cuenta sin compras pagadas. No identifica a una misma persona que use cuentas con correos diferentes; esto necesitaría reglas antifraude adicionales antes del lanzamiento.

Probabilidades propuestas, modificables en el SQL antes de activar la campaña: $50 (35%), $100 (30%), $150 (20%), $200 (10%), $300 (4%), $400 MXN (1%). El frontend muestra las mismas condiciones. Sin compra mínima propuesta, sin acumular descuentos, sin saldo a favor ni efectivo. El descuento se limita al subtotal de productos.

## 6. Conectar compras reales (aún pendiente)

El sitio todavía no procesa pagos. El carrito muestra una previsualización; copiar, ver o aplicar un cupón en esa vista **no lo reserva ni lo consume**. El alta de Supabase activa el registro, la emisión y la consulta real de cupones, pero no convierte el carrito de demostración en un checkout comercial.

El futuro backend de checkout debe:

1. Autenticar la sesión, obtener `user_id` de su token verificado y calcular subtotal, inventario y promociones desde registros autoritativos. No confiar en montos, usuario, premio ni estado enviados por el navegador.
2. Crear un pedido `ld_orders` con ID estable, precios confirmados y estado `pending` usando una credencial privada de servidor.
3. Reservar el código con `ld_reserve_coupon(p_user_id,p_order_id,p_code)`. Estas funciones solo son ejecutables por `service_role`, nunca desde el frontend. La respuesta devuelve descuento en centavos, ID del cupón y caducidad. Reintentar con el mismo pedido es idempotente; otro pedido queda rechazado.
4. Crear la sesión del proveedor de pagos con exactamente ese descuento y una expiración que no supere `expires_at`. Si el proveedor no permite cumplir esa caducidad, deberá elegirse otra estrategia de checkout antes de habilitar la promoción.
5. Al recibir un webhook con firma válida, verificar en el proveedor importe, moneda MXN, pedido, identidad y fecha de pago. Llamar a `ld_complete_order(p_user_id,p_order_id,p_payment_id,p_paid_at)` con la fecha confirmada por el proveedor, nunca con una fecha enviada por el cliente. No completar compras desde la URL de retorno del navegador.
6. Si se abandona/cancela un pago, primero cancelar la sesión del proveedor y confirmar que ya no puede cobrar; después llamar a `ld_cancel_order`. No liberar una reserva por un temporizador del navegador mientras el pago siga abierto. Liberar no extiende las 24 horas.
7. Si se completa otro pedido sin cupón, cancelar primero cualquier sesión descontada pendiente de esa cuenta. Completar la primera compra sin el cupón deja sin efecto el beneficio de bienvenida. Conservar un registro de webhooks/idempotencia y resolver pagos fuera de plazo o inconsistentes mediante conciliación/reembolso según el proveedor.

La integración concreta de webhooks y pedidos depende del proveedor de pagos que se elija; no está simulada como si ya existiera.

## 7. Verificación antes de abrir al público

Las pruebas `npm test` ejecutan la migración real en PostgreSQL embebido (PGlite) con una emulación de las identidades de Supabase. Cubren emisión repetida, 24 horas, permisos, aislamiento por cuenta, reserva exclusiva, cancelación y consumo idempotente. No sustituyen pruebas de OAuth, correo, webhooks ni carga concurrente contra el proyecto alojado.

En el proyecto real, probar dos cuentas, dos navegadores y dos peticiones simultáneas de reserva; comprobar que solo una obtiene el cupón. Verificar también acceso desde otro dispositivo, cierre de sesión, reconexión, expiración, webhook duplicado y cancelación de sesiones del proveedor. Todavía no se han ejecutado estas verificaciones contra un proyecto Supabase real.
