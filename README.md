# Luxury Drop

Prototipo de diseño para explorar una tienda de streetwear. HTML, CSS y JavaScript nativos, sin instalación de dependencias. Productos, precios, tallas, inventario y premios son ilustrativos. No procesa ventas, pagos ni datos de clientes.

## Desarrollo

Ejecutar `npm run dev` y abrir http://127.0.0.1:4173. Verificación: `npm run check` y `npm test`.

## Qué se puede probar

Catálogo con categorías, búsqueda y orden por precio; detalle con selección de talla; bolsa persistente por navegador con cantidades; descuentos automáticos; ruleta de ejemplo con un resultado por sesión de pestaña; resumen copiable. Adaptado para móvil, navegación con teclado y preferencia de movimiento reducido.

## Edición

- `dist/catalog.js`: productos, precios, tallas, existencias ilustrativas, umbrales de descuento y premios.
- `dist/styles.css`: colores, tipografía y diseño responsive.
- `dist/app.js`: interacciones del catálogo, bolsa y promociones.
- `dist/assets/logo.png`: logo proporcionado por el usuario.
- Fotografías de Unsplash: archivos locales `tee.jpg`, `hoodie.jpg`, `jacket.jpg` y `denim.jpg`. Sustituir por fotos del inventario real. Sus URLs de origen están en los créditos del sitio. Las fuentes se cargan desde Google Fonts; hay fuentes de respaldo del sistema.

## Para la tienda comercial

Definir inventario real, fotos, precios, canal de pedidos, envío, pagos y condiciones de promoción. Implementar backend y base de datos para pedidos, disponibilidad y precios autoritativos. Los pagos deberán verificarse en servidor mediante el proveedor seleccionado; el giro se otorgará una sola vez por pedido pagado, con registro transaccional de premio y canje. La persistencia local y la ruleta de esta demo no son controles de producción. No hay panel administrativo todavía.

Propuesta actual: 5% desde $1,000, 10% desde $2,000, tomando solo el nivel más alto. Giro desde $1,500 de subtotal. Los premios simulados no se canjean ni se suman al descuento. Los montos están expresados en MXN.
