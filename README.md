# Luxury Drop · Import & Streetwear

Tienda publicada en **Cloudflare Pages**, con catálogo DROP 01, tallas, bolsa, pedidos por WhatsApp, bienvenida con ruleta y **Perfil → Cupones**. El código y los commits permanecen en GitHub. El sitio publicado no requiere localhost ni instalación de Node por parte del visitante. Cuentas reales y cupones protegidos se conectan a Supabase; mientras no esté configurado, el recorrido se identifica como vista previa.

**Para activar registro y cupones reales:** [guía paso a paso](docs/ACTIVAR-CUENTAS-Y-CUPONES.md). Para validar descuentos en efectivo o transferencia: [administración y canje manual](docs/ADMINISTRACION.md). No hace falta una pasarela de pagos.

**Sitio principal:** https://luxury-drop.pages.dev/

**Respaldo en GitHub Pages:** https://thebofobm.github.io/LUXURY-DROP-website/

**Repositorio:** https://github.com/TheBofoBM/LUXURY-DROP-website

**Estado actual:** [Supabase conectado; administrador activo y acceso por correo limitado al equipo](docs/ESTADO-SUPABASE.md). Para clientes externos falta configurar SMTP. No se necesita una pasarela de pagos para los canjes manuales.

## Publicación en GitHub Pages

1. En el repositorio, abrir **Settings → Pages**.
2. En **Build and deployment → Source**, seleccionar **GitHub Actions**. Solo se configura una vez.
3. Subir cambios a `main`. El workflow `.github/workflows/pages.yml` instala dependencias, empaqueta el cliente oficial de autenticación, verifica rutas, ejecuta pruebas de promociones y PostgreSQL, y publica `dist/`.
4. Revisar **Actions → Publicar Luxury Drop en GitHub Pages**. Cuando termine correctamente, la página estará en la URL anterior. También se puede ejecutar desde **Run workflow**.

El workflow usa acciones oficiales de GitHub y su token automático. No requiere configurar tokens personales ni secretos. La publicación se detiene si falla una validación. Referencia: https://docs.github.com/es/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages

## Subir cambios desde PowerShell

```powershell
cd "D:\Negocios\LUXURY DROP\luxury-drop"
git status
git add .
git commit -m "Actualiza el catálogo"
git push origin main
```

No es necesario iniciar un servidor local. El código del sitio se versiona en `dist/`; `npm run build` genera el cliente en `dist/vendor/`, la configuración pública de autenticación y los archivos de publicación en `dist/assets/build/`. Sus nombres incluyen una huella del contenido para evitar mezclar código y estilos de distintas versiones por caché. Las carpetas generadas no se suben a Git y Actions las reconstruye. El repositorio conserva la configuración del prototipo anterior en `.openai/`, pero GitHub Pages publica únicamente `dist/`.

## Archivos para editar

```text
.github/workflows/pages.yml  Validación y publicación automática
dist/
  index.html                Estructura y textos
  styles.css                Colores, tipografía y diseño responsive
  app.js                    Catálogo, tallas, bolsa y ruleta
  catalog.js                Productos y reglas de promociones
  assets/                   Logo y fotografías
  welcome-ui.js             Bienvenida, perfil y sección Cupones
  welcome-service.js        Autenticación, emisión y consulta
  welcome-model.js          Vigencia y reglas de presentación
  welcome.css               Diseño de registro y cupones
  config.js                 Parámetros públicos de autenticación
scripts/                    Build y verificación de archivos/rutas
supabase/migrations/        Tablas y funciones de cupones protegidos
tests/                      Pruebas de frontend y de PostgreSQL
```

Los recursos usan rutas relativas, compatibles con `/LUXURY-DROP-website/`. Las imágenes se incluyen en `dist/assets/`; las fuentes se obtienen de Google Fonts y tienen alternativas del sistema.

Para validación por terminal o CI, con Node.js 22 o superior:

```powershell
npm ci
npm run build
npm run check
npm test
```

La primera vez ejecutar `npm ci` y `npm run build` antes de `npm run check`. Las dependencias están fijadas en `package-lock.json`. Ninguno de estos comandos inicia un servidor. GitHub Actions ejecuta los pasos automáticamente.

## Qué se puede probar

- Catálogo con categorías, búsqueda y orden por precio.
- Detalle con selección de talla e inventario ilustrativo.
- Bolsa persistente por navegador con cantidades y descuentos automáticos.
- 5% desde $1,000 o 10% desde $2,000 MXN, aplicando solo el nivel más alto.
- Bienvenida al entrar: un giro por cuenta con premios de 5% a 25% sobre todas las prendas de la primera compra, sin tope en pesos, sin monto previo en la bolsa.
- Perfil → Cupones, código personal, fecha de caducidad y cuenta regresiva de 24 horas.
- Previsualización del descuento en la bolsa; se aplica el mayor ahorro, sin acumular promociones.
- Resumen de selección copiable.
- Panel de administrador: buscar código, validar vigencia/cliente, calcular descuento y registrar un canje manual por efectivo o transferencia, con historial privado.

## Estado comercial y créditos

Productos, fotografías, precios, tallas e inventario son ilustrativos. Supabase ya está conectado y las tablas están aplicadas; falta verificar tu cuenta en la tienda, asignar tu permiso de administrador y configurar SMTP para el registro público. Los códigos `LD-DEMO-…` de la versión anterior no son válidos en la base de datos real. El canje manual no procesa pagos: tú confirmas la venta fuera del sitio.

Logo proporcionado por Luxury Drop. Fotografías de referencia de Unsplash; sus enlaces están en los créditos del sitio. Tipografías Barlow Condensed y DM Sans mediante Google Fonts.

Para vender se deberán definir inventario real, fotos, precios, canal de pedidos, envío y términos de promoción. GitHub Pages aloja el frontend; Supabase valida identidad, permisos y el canje único. La lógica local de la demostración no es un control de producción.

## Bienvenida por porcentaje

Premios: **5%, 10%, 15%, 20% y 25%**; probabilidades respectivas **2%, 3%, 5%, 15% y 75%**. El mayor premio es el más probable. Un 25% sobre $1,600 ahorra $400; sobre $3,200 ahorra $800. No se acumula con otras promociones, no incluye envío y se redondea una sola vez al centavo sobre el subtotal completo.

La migración `supabase/migrations/202610300003_percentage_welcome.sql` se aplica después de las dos anteriores. Conserva los cupones de importe fijo y su historial; los nuevos giros generan porcentaje. La campaña y la restricción de un giro por cuenta permanecen: no se vuelve a sortear al actualizar el sitio.

## Catálogo DROP 01

Luxury Edition muestra tres playeras con imágenes aportadas por Luxury Drop: BOSS azul marino, HUGO negra y Lacoste verde. Las tres cuestan $1,499 MXN, se ofrecen en tallas Chica (S), Mediana (M) y Grande (L) y permiten solicitar hasta cinco piezas por modelo y pedido. La disponibilidad y el plazo de entrega se confirman por WhatsApp; el límite no representa cinco prendas físicas confirmadas. Las imágenes PNG conservan su transparencia y se presentan completas en portada, tarjetas, detalle y bolsa. La bolsa mantiene el límite de cinco por modelo y descarta prendas del catálogo anterior guardadas en el navegador.

Los datos de catálogo se editan en `dist/catalog.js`; las ventas siguen atendiéndose personalmente. Este catálogo estático no descuenta existencias de forma compartida entre dispositivos.

## Pedidos por WhatsApp

**Pedir por WhatsApp** abre el chat del negocio con prendas, color, talla, cantidad, subtotal, promoción aplicable, ahorro y total estimado en MXN. El cliente pulsa Enviar en WhatsApp; abrir el enlace no envía automáticamente el mensaje ni registra una venta. No incluye correo, datos bancarios ni otros datos del perfil.

El contacto público está en `dist/store-config.js`. Es un número internacional de solo dígitos. `dist/order-request.js` genera el texto y aplica una sola promoción: el mayor ahorro entre monto de compra y cupón seleccionado. No incluye códigos vencidos, utilizados, reservados o de demostración; mantiene cupones anteriores de importe fijo. La bolsa vuelve a comprobar el total al pulsar el enlace para impedir compartir el precio de un cupón que acaba de vencer.

El dueño confirma disponibilidad, descuento, entrega y pago en la conversación. Después de comprobar el cobro, registra el canje en Administración. Este flujo no mueve dinero, reserva inventario ni consume cupones. El registro público por correo sigue pendiente de SMTP; pedir por WhatsApp no exige iniciar sesión si no se aplica un cupón.

El 3 de noviembre de 2026 se amplió a cinco el límite por modelo. Las tarjetas, el detalle y el mensaje de WhatsApp identifican las prendas como bajo pedido. Las solicitudes no descuentan inventario, y canjear un cupón no cambia existencias.

La migración `202611030004_welcome_odds_75.sql` aumenta al 75% la probabilidad de ganar el premio de 25%, con efectos en giros futuros. Mantiene códigos, valor y vigencia de todos los cupones ya emitidos. No repetir migraciones aplicadas.

## Publicación gratuita en Cloudflare Pages

La tienda está publicada en **https://luxury-drop.pages.dev/** desde el 4 de noviembre de 2026, conectada al repositorio y a la rama `main`. Los commits se publican automáticamente en Cloudflare. Supabase usa esa dirección principal y mantiene el retorno de GitHub Pages durante la transición. Ver la [configuración y los pasos de migración](docs/CLOUDFLARE-PAGES.md).


### Luxury Edition y Daily Drop

Las tres playeras de DROP 01 pertenecen a **Luxury Edition**, con composición comercial «100% algodón spandex» y calidad original indicadas por el propietario. Cada detalle incluye características visibles de la fotografía y una frase de cierre. Precio: $1,499 por playera.

**Daily Drop** ofrece un paquete de 3 playeras de 100% algodón por $1,299 antes de cupones. Permite elegir Chica (S), Mediana (M) o Grande (L) para cada prenda; modelos, colores y disponibilidad se acuerdan por WhatsApp. La imagen del paquete es una ilustración identificada como tal. Un cupón válido del 25% descuenta $324.75 y deja $974.25 sin envío; no se emiten cupones al configurar ni compartir el paquete.

En la bolsa cada unidad Daily Drop representa un paquete completo de tres prendas. Las tallas se conservan en el mensaje de WhatsApp. El límite de solicitud es de cinco paquetes en total, no cinco por combinación de tallas. Los descuentos automáticos por monto se calculan únicamente sobre Luxury Edition; se comparan con el cupón de bienvenida sobre el subtotal completo y se aplica un único descuento, el mayor.


### Playera de exhibición interactiva

La BOSS de la portada responde al arrastre con dedo, mouse o lápiz: se desplaza e inclina y vuelve suavemente al soltar. El desplazamiento vertical de la página y el zoom táctil siguen disponibles. Las flechas del teclado permiten moverla; Escape o Inicio restablecen la posición. La animación respeta la preferencia de movimiento reducido. El efecto no modifica las fotos ni los controles del catálogo.

### Animaciones de la tienda

`store-motion.js` incorpora entrada progresiva de las tarjetas una vez por prenda, miniatura hacia la bolsa con confirmación del contador, respuesta visual al elegir talla y avance de las tres tallas de Daily Drop. Si el ícono de la bolsa está fuera de pantalla, aparece una confirmación temporal en la esquina.

Al guardar un premio aparece una celebración breve y la acción «Elegir mis prendas», que conserva el cupón seleccionado para la bolsa. Aplicar o quitar un cupón anima la confirmación y la transición entre el importe anterior y el nuevo; el pedido de WhatsApp utiliza el total actualizado inmediatamente. La BOSS tiene una sombra que acompaña el arrastre y las dos colecciones resaltan su selección al navegar.

Los efectos respetan `prefers-reduced-motion`, y sus capas decorativas no reciben clics ni foco. Las mejoras funcionales que el propietario decidió posponer están en [MEJORAS-PENDIENTES.md](docs/MEJORAS-PENDIENTES.md).
