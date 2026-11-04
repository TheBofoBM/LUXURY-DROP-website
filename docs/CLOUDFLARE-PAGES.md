# Publicar en Cloudflare Pages

Publicación confirmada el **4 de noviembre de 2026**: **https://luxury-drop.pages.dev/**. Cloudflare compiló el commit `d41cf1b`, ejecutó las 32 pruebas y confirmó el despliegue. La integración está conectada al repositorio de la tienda y a `main`. GitHub Pages sigue disponible como respaldo.

## Configuración concreta

| Campo | Valor |
| --- | --- |
| Repositorio | `TheBofoBM/LUXURY-DROP-website` |
| Rama de producción | `main` |
| Nombre del proyecto | `luxury-drop` |
| Framework | `None` |
| Comando de build | `npm run build && npm run check && npm test` |
| Directorio de salida | `dist` |
| Directorio raíz | raíz del repositorio (dejar vacío) |
| Node.js | `22`, fijado en `.node-version` |

Cloudflare instala las dependencias usando `package-lock.json`. El build genera el cliente de Supabase y los recursos con nombres versionados. No hace falta subir `node_modules`, iniciar localhost ni ejecutar Wrangler. El navegador del cliente solo descarga archivos estáticos.

La configuración pública de Supabase y el número de WhatsApp ya están en `dist/config.js` y `dist/store-config.js`. No hacen falta variables adicionales para este proyecto. Si en el futuro se usan variables de build, configurar siempre `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` juntas. Nunca usar contraseñas, `service_role` ni claves privadas en estos archivos o variables públicas.

## Acceso a la cuenta y al repositorio

El propietario inicia sesión o crea la cuenta gratuita de Cloudflare. La integración de GitHub debe autorizarse únicamente para este repositorio. No conectar todos los repositorios si no es necesario. Elegir Pages, conectar GitHub, seleccionar el repositorio y completar los campos de la tabla. Los nuevos commits a `main` generarán publicaciones automáticas en Cloudflare.

## Supabase después del primer despliegue

1. Copiar la URL de producción exacta que devuelve Cloudflare, con barra final. No usar una URL temporal de preview.
2. En Authentication → URL Configuration del proyecto `mtprghhunykhxcnvldza`, poner esa URL en **Site URL**.
3. Agregar esa URL exacta a **Redirect URLs**, manteniendo también `https://thebofobm.github.io/LUXURY-DROP-website/` durante la transición. No autorizar comodines de `*.pages.dev`.
4. La web calcula el retorno de correo y Google desde su dirección actual; no necesita una URL fija en el JavaScript.
5. Al cambiar de dominio hay que iniciar sesión de nuevo. Los usuarios, permisos de administrador y cupones permanecen en el mismo proyecto de Supabase. La bolsa y el verificador PKCE pertenecen al navegador y al dominio donde se generaron.

El servicio de correo sigue limitado al equipo de la tienda hasta configurar SMTP propio. El nuevo subdominio no elimina esa limitación.

## Verificación

Comprobar catálogo, fotos, bolsa, enlace de WhatsApp y condiciones del 75% en la nueva URL. El propietario debe probar el enlace de acceso por correo solicitándolo y abriéndolo en el mismo navegador y dominio. No generar premios ni registrar ventas reales como datos de prueba automáticos.

La validación de archivos verifica tanto rutas de raíz como rutas bajo `/LUXURY-DROP-website/`. La publicación en GitHub Pages puede continuar como respaldo; no es necesario eliminar repositorios ni datos de Supabase.

Referencias: [Git integration](https://developers.cloudflare.com/pages/get-started/git-integration/), [Build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/), [Supabase redirects](https://supabase.com/docs/guides/auth/redirect-urls).

## Estado verificado

Supabase tiene Site URL `https://luxury-drop.pages.dev/` y dos retornos exactos: esa dirección y `https://thebofobm.github.io/LUXURY-DROP-website/`. Se comprobó el catálogo, las imágenes, la ficha de una playera y el enlace de WhatsApp con su resumen desde el nuevo dominio. No se enviaron mensajes, solicitudes de correo, giros ni canjes reales durante la verificación. El acceso por correo completo debe probarlo el propietario desde el nuevo dominio.
