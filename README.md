# Luxury Drop · Import & Streetwear

Tienda de demostración preparada para **GitHub Pages**, con catálogo, tallas, bolsa, bienvenida con ruleta y **Perfil → Cupones**. El sitio publicado no requiere localhost ni instalación de Node por parte del visitante. Cuentas reales y cupones protegidos se conectan a Supabase; mientras no esté configurado, el recorrido se identifica como vista previa.

**Para activar registro y cupones reales:** [guía paso a paso](docs/ACTIVAR-CUENTAS-Y-CUPONES.md). Para validar descuentos en efectivo o transferencia: [administración y canje manual](docs/ADMINISTRACION.md). No hace falta una pasarela de pagos.

**Sitio:** https://thebofobm.github.io/LUXURY-DROP-website/

**Repositorio:** https://github.com/TheBofoBM/LUXURY-DROP-website

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
- Bienvenida al entrar: un giro por cuenta con premios de $50 a $400 MXN, sin monto previo en la bolsa.
- Perfil → Cupones, código personal, fecha de caducidad y cuenta regresiva de 24 horas.
- Previsualización del descuento en la bolsa; se aplica el mayor ahorro, sin acumular promociones.
- Resumen de selección copiable.
- Panel de administrador: buscar código, validar vigencia/cliente, calcular descuento y registrar un canje manual por efectivo o transferencia, con historial privado.

## Estado comercial y créditos

Productos, fotografías, precios, tallas e inventario son ilustrativos. Sin Supabase configurado, los perfiles (incluido el administrador) son de ejemplo y los códigos `LD-DEMO-…` no son canjeables en ventas reales. El SQL y la integración están preparados; falta conectar Supabase y asignar tu cuenta administradora. El canje manual no procesa pagos: tú confirmas la venta fuera del sitio.

Logo proporcionado por Luxury Drop. Fotografías de referencia de Unsplash; sus enlaces están en los créditos del sitio. Tipografías Barlow Condensed y DM Sans mediante Google Fonts.

Para vender se deberán definir inventario real, fotos, precios, canal de pedidos, envío y términos de promoción. GitHub Pages aloja el frontend; Supabase valida identidad, permisos y el canje único. La lógica local de la demostración no es un control de producción.
