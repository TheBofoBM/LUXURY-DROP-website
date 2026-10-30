# Estado de la conexión · 30 de octubre de 2026

Proyecto: **Luxury Drop**, referencia `mtprghhunykhxcnvldza`.

URL pública de API: `https://mtprghhunykhxcnvldza.supabase.co`.

## Hecho

- Las tres migraciones del repositorio se ejecutaron desde SQL Editor en el proyecto alojado. No volver a ejecutarlas sobre esta misma base de datos.
- Se verificaron las tablas `ld_accounts`, `ld_coupons`, `ld_orders` y `ld_admins`, todas con RLS activado.
- Site URL y único retorno permitido: `https://thebofobm.github.io/LUXURY-DROP-website/`.
- Clave **publicable** del proyecto configurada en el frontend. No contiene claves privadas de servidor ni contraseñas de base de datos.
- Email Auth y altas de usuarios habilitados; Google todavía deshabilitado.
- Acceso configurado con **enlace de un solo uso**, tal como aparece en la plantilla predeterminada de Supabase.
- Se comprobó que una solicitud anónima no puede leer cupones ni ejecutar la comprobación de administrador (HTTP 401).
- Las 27 pruebas de reglas/permisos en PostgreSQL embebido siguen pasando. No sustituyen las pruebas de acceso real por correo ni la concurrencia del proyecto alojado.

## Cuenta administradora y promoción activa

La cuenta propietaria de la tienda ya está verificada y autorizada como administradora mediante `ld_admins`. No se publican su correo ni su identificador en este documento. En la tienda, iniciar sesión y abrir **Administración**; actualizar la página después de cambios de permisos.

La migración `202610300003_percentage_welcome.sql` se aplicó el 30 de octubre de 2026. Los nuevos premios son **5%, 10%, 15%, 20% y 25%**, con probabilidades **5%, 10%, 15%, 25% y 45%**. Se calculan sobre todas las prendas de la primera compra, sin envío y sin tope en pesos. Un 25% de $3,200 son $800. Los cupones anteriores conservan importe, código, vigencia e historial; no se habilita otro giro.

Las pruebas verifican cálculos, redondeo, las 10,000 posiciones de la distribución, migración con cupones ya emitidos, permisos, caducidad, primer pedido y canje idempotente. En producción se verificó la distribución con una consulta de solo lectura, sin emitir ni canjear premios reales. Los giros y canjes reales de prueba debe realizarlos el propietario.

Para entrar por correo, solicitar un enlace y abrirlo con el mismo navegador donde se solicitó: la protección PKCE necesita el verificador guardado allí.

## Antes de registrar clientes externos

El correo de Supabase por defecto solo se envía a direcciones del equipo y tiene un límite de pruebas reducido. Hace falta configurar SMTP propio para clientes externos. La web lo indica y no presenta el registro público como terminado.

La configuración `emailDelivery: 'team-only'` es informativa, no una restricción de seguridad del cliente. El servicio de Supabase aplica la restricción real. Después de configurar y probar SMTP, cambiarla a `public` y publicar de nuevo.

Con SMTP se puede mantener el enlace o pasar a OTP: incluir `{{ .Token }}` en la plantilla y configurar `emailMode: 'otp'`. Mientras se use la plantilla predeterminada con enlace, mantener `emailMode: 'magiclink'`.

Referencias oficiales: https://supabase.com/docs/guides/auth/auth-smtp y https://supabase.com/docs/guides/auth/auth-email-passwordless
