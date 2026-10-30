# Estado de la conexión · 30 de octubre de 2026

Proyecto: **Luxury Drop**, referencia `mtprghhunykhxcnvldza`.

URL pública de API: `https://mtprghhunykhxcnvldza.supabase.co`.

## Hecho

- Las dos migraciones del repositorio se ejecutaron desde SQL Editor en el proyecto alojado. No volver a ejecutarlas sobre esta misma base de datos.
- Se verificaron las tablas `ld_accounts`, `ld_coupons`, `ld_orders` y `ld_admins`, todas con RLS activado.
- Site URL y único retorno permitido: `https://thebofobm.github.io/LUXURY-DROP-website/`.
- Clave **publicable** del proyecto configurada en el frontend. No contiene claves privadas de servidor ni contraseñas de base de datos.
- Email Auth y altas de usuarios habilitados; Google todavía deshabilitado.
- Acceso configurado con **enlace de un solo uso**, tal como aparece en la plantilla predeterminada de Supabase.
- Se comprobó que una solicitud anónima no puede leer cupones ni ejecutar la comprobación de administrador (HTTP 401).
- Las 18 pruebas de reglas/permisos en PostgreSQL embebido siguen pasando. No sustituyen las pruebas de acceso real por correo ni la concurrencia del proyecto alojado.

## Siguiente paso: tu cuenta administradora

1. En la tienda publicada, abrir el perfil e introducir el mismo correo de la cuenta propietaria del equipo de Supabase.
2. Solicitar un enlace y abrirlo con **el mismo navegador** donde se solicitó. Si el correo abre otro navegador, copiar su enlace al navegador original. La protección PKCE necesita el verificador guardado allí.
3. Una vez creada/verificada la cuenta de la tienda, autorizarla como administradora usando su identidad real, según `ADMINISTRACION.md`. Iniciar sesión en el panel de Supabase no crea automáticamente una cuenta en la tienda.
4. Probar acceso al perfil y al panel. Cualquier giro con descuento real debe realizarlo el propietario, sin tratarlo como datos ficticios.

## Antes de registrar clientes externos

El correo de Supabase por defecto solo se envía a direcciones del equipo y tiene un límite de pruebas reducido. Hace falta configurar SMTP propio para clientes externos. La web lo indica y no presenta el registro público como terminado.

La configuración `emailDelivery: 'team-only'` es informativa, no una restricción de seguridad del cliente. El servicio de Supabase aplica la restricción real. Después de configurar y probar SMTP, cambiarla a `public` y publicar de nuevo.

Con SMTP se puede mantener el enlace o pasar a OTP: incluir `{{ .Token }}` en la plantilla y configurar `emailMode: 'otp'`. Mientras se use la plantilla predeterminada con enlace, mantener `emailMode: 'magiclink'`.

Referencias oficiales: https://supabase.com/docs/guides/auth/auth-smtp y https://supabase.com/docs/guides/auth/auth-email-passwordless
