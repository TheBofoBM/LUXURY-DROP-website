# Administrador: validar y canjear cupones en ventas manuales

Este panel **no procesa pagos ni mueve dinero**. Consultas el cupón, acuerdas el descuento con el cliente, recibes efectivo o verificas su transferencia por tu cuenta y registras el canje. No hacen falta pasarela de pagos, webhooks ni claves de bancos.

## Probar ahora

En el pie de página del sitio, entrar en **Administración → Probar perfil administrador**. También existe un acceso dentro de **Mi perfil → Mi cuenta** cuando la sesión es administradora.

Sin Supabase, el panel es una demostración, identificada como tal. Incluye tres botones de ejemplo: **Vigente**, **Vencido** y **Usado**. Los datos se conservan en ese navegador; no sirven para validar descuentos reales ni se sincronizan entre dispositivos.

También puedes copiar el código `LD-DEMO-…` de un perfil cliente de ejemplo, entrar como administrador de prueba y consultarlo. Al registrar su canje, ese perfil de ejemplo lo verá utilizado. La demostración no permite convertir cupones de prueba en reales.

## Activar tu cuenta administradora real

1. Crear y conectar Supabase siguiendo `ACTIVAR-CUENTAS-Y-CUPONES.md`.
2. En SQL Editor, ejecutar **en orden** ambas migraciones:
   - `supabase/migrations/202610270001_welcome_coupons.sql`
   - `supabase/migrations/202610270002_manual_admin.sql`
   Si ya se aplicó la primera, ejecutar únicamente la segunda. Cada migración se aplica una vez.
3. Registrarte en Luxury Drop con el correo o Google que usarás para administrar. Verificar el correo e iniciar sesión.
4. Desde el **SQL Editor privado del propietario en Supabase**, reemplazar `TU_CORREO` y ejecutar:

```sql
insert into public.ld_admins (user_id)
select id from auth.users where lower(email)=lower('TU_CORREO')
on conflict do nothing;

-- Debe devolver exactamente la cuenta esperada.
select u.id, u.email
from public.ld_admins a join auth.users u on u.id=a.user_id;
```

5. Actualizar la página. En **Administración** se abrirá el panel real. No hay una contraseña de administrador incluida en el código ni una casilla pública para obtener ese rol.

Para retirar acceso a una cuenta, el propietario puede eliminar su fila de `ld_admins` desde ese mismo SQL Editor privado. Cada consulta y cada canje vuelve a comprobar el permiso en PostgreSQL, aunque la página conserve una sesión antigua.

## Operación diaria

1. El cliente te comparte su código desde **Perfil → Cupones**.
2. Pegarlo en **Administración → Validar cupón → Consultar**.
3. Revisar el cliente asociado, descuento, vigencia y estado. Un código encontrado no significa automáticamente que pueda usarse: debe indicar **Válido para canjear**.
4. Verificar que el cupón pertenece al cliente y acordar el descuento. Introducir el importe de productos **antes** del descuento. El panel calcula cuánto se aplica y cuánto corresponde cobrar; nunca crea saldo a favor ni combina descuentos.
5. Seleccionar **Efectivo** o **Transferencia**. El folio interno de venta es opcional; no es necesario guardar datos bancarios.
6. Confirmar la venta y el cobro acordado, marcar la casilla y pulsar **Registrar canje y marcar como usado**.
7. Esperar el mensaje **Canje confirmado** antes de considerar consumido el cupón. Consultarlo otra vez mostrará que ya está utilizado.

Si aparece un error de red, **volver a consultar el código**: la operación pudo haberse guardado aunque no llegara la respuesta. Repetir la misma solicitud reutiliza su ID, evitando registrar dos ventas. Un segundo canje con otra solicitud queda rechazado.

El historial muestra los últimos 20 canjes: código, cliente, descuento, importe de cobro registrado, forma de pago, fecha, administrador y folio. El canje es definitivo desde este panel; no existe una acción pública para reactivarlo.

## Protección del canje

- `ld_admins` no puede leerse ni modificarse por clientes. Solo el propietario o el servicio privado administra ese listado.
- Las funciones `ld_admin_lookup_coupon`, `ld_admin_recent_sales` y `ld_admin_redeem_coupon` exigen una sesión y comprueban el rol en el servidor. Cambiar `localStorage`, el HTML o los metadatos del perfil no concede acceso.
- La validación inicial es informativa. La función de canje **vuelve a comprobar** estado, vencimiento y primera compra al confirmar, usando el reloj del servidor.
- Se bloquea la cuenta del cliente y la fila del cupón durante la transacción. Solo una venta puede consumirlo. Una segunda solicitud obtiene “ya utilizado”, y un reintento idéntico devuelve el registro original.
- Descuento y total se calculan en PostgreSQL a partir del valor almacenado del cupón y el importe confirmado por el administrador; el navegador no elige un premio nuevo.
- El registro utiliza `ld_orders` como comprobante interno de una venta ya confirmada manualmente. `provider_payment_id` contiene una referencia interna `manual:<UUID>`; **no implica conexión con un proveedor de pagos**.

Las pruebas automatizadas ejecutan ambas migraciones en PostgreSQL embebido y cubren permisos, intento de autoasignarse rol, códigos vencidos/reservados, consulta por administrador, canje por efectivo/transferencia, reintentos, un segundo administrador y actualización del perfil cliente. Al activar Supabase, comprobar también dos sesiones administrativas reales enviando la confirmación al mismo tiempo. La vista previa local no ofrece esas garantías comerciales.
