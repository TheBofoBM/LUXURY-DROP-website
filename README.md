# Luxury Drop · Import & Streetwear

Tienda de demostración preparada para **GitHub Pages**, con diseño responsive, catálogo, tallas, bolsa y promociones. HTML, CSS y JavaScript nativos: el sitio publicado no requiere servidor propio, localhost ni instalación de Node por parte del visitante.

**Sitio:** https://thebofobm.github.io/LUXURY-DROP-website/

**Repositorio:** https://github.com/TheBofoBM/LUXURY-DROP-website

## Publicación en GitHub Pages

1. En el repositorio, abrir **Settings → Pages**.
2. En **Build and deployment → Source**, seleccionar **GitHub Actions**. Solo se configura una vez.
3. Subir cambios a `main`. El workflow `.github/workflows/pages.yml` verifica JavaScript, archivos, rutas e importaciones, ejecuta pruebas de promociones y publica el contenido de `dist/`.
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

No es necesario iniciar un servidor local para ver el sitio. La carpeta `dist/` se versiona y contiene el sitio completo. El repositorio conserva la configuración del prototipo anterior en `.openai/`, pero GitHub Pages publica únicamente `dist/`.

## Archivos para editar

```text
.github/workflows/pages.yml  Validación y publicación automática
dist/
  index.html                Estructura y textos
  styles.css                Colores, tipografía y diseño responsive
  app.js                    Catálogo, tallas, bolsa y ruleta
  catalog.js                Productos y reglas de promociones
  assets/                   Logo y fotografías
scripts/validate-site.mjs    Verifica archivos y rutas para Pages
tests/promotions.test.mjs    Pruebas de descuentos e inventario
```

Los recursos usan rutas relativas, compatibles con `/LUXURY-DROP-website/`. Las imágenes se incluyen en `dist/assets/`; las fuentes se obtienen de Google Fonts y tienen alternativas del sistema.

Para validación por terminal o CI, con Node.js 22 o superior:

```powershell
npm run check
npm test
npm run build
```

No hay dependencias que instalar. `build` verifica que `dist/` esté listo para publicar; no inicia procesos ni servidores.

## Qué se puede probar

- Catálogo con categorías, búsqueda y orden por precio.
- Detalle con selección de talla e inventario ilustrativo.
- Bolsa persistente por navegador con cantidades y descuentos automáticos.
- 5% desde $1,000 o 10% desde $2,000 MXN, aplicando solo el nivel más alto.
- Giro de demostración desde $1,500 de subtotal, una vez por sesión de pestaña.
- Resumen de selección copiable.

## Estado comercial y créditos

Productos, fotografías, precios, tallas, inventario y premios son ilustrativos. No procesa pedidos ni pagos. Los premios no son canjeables ni se suman a los descuentos de la bolsa.

Logo proporcionado por Luxury Drop. Fotografías de referencia de Unsplash; sus enlaces están en los créditos del sitio. Tipografías Barlow Condensed y DM Sans mediante Google Fonts.

Para vender se deberán definir inventario real, fotos, precios, canal de pedidos, envío y términos de promoción. GitHub Pages aloja el frontend; una versión con pagos y premios reales necesitará un servicio externo que valide precios, stock, pagos y un único giro por pedido pagado. La lógica local de esta demostración no es un control de producción.
