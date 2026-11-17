# Edición de imágenes de gorras

16 de noviembre de 2026. Edición mediante la herramienta integrada `image_gen`, sin usar una API externa de generación. La compresión final usa `sharp-cli` local; no genera ni retoca contenido nuevo.

Se retiraron fondos y manos y se solicitaron luz neutra, recorte transparente, producto completo y márgenes similares. Se conservan los originales JPG. Las versiones editadas son una presentación retocada con IA: no equivalen a conservar cada píxel o cada carácter diminuto de los originales. Se revisaron visualmente color, forma y distintivos principales antes de publicar.

Los PNG RGBA maestros se guardan en la carpeta del sitio. Para servirlos se codifican copias WebP con calidad 90, calidad alfa 100 y esfuerzo 6, sin redimensionar ni cambiar el encuadre. El conjunto pasa de 10,342,519 a 1,438,790 bytes (aproximadamente 86% menos). El fondo claro, el tamaño de presentación y la sombra se aplican con CSS. Los precios permanecen en $450 MXN para cuatro gorras y $600 MXN para la blanca WES-TRN.

## Archivos guardados

- Original: `dist/assets/gorra-champion-negra.jpg`; edición: [ gorra-champion-negra-studio.png ](../dist/assets/gorra-champion-negra-studio.png)
- Original: `dist/assets/gorra-uwharrie-negra.jpg`; edición: [ gorra-uwharrie-negra-studio.png ](../dist/assets/gorra-uwharrie-negra-studio.png)
- Original: `dist/assets/gorra-howdy-negra-blanca.jpg`; edición: [ gorra-howdy-negra-blanca-studio.png ](../dist/assets/gorra-howdy-negra-blanca-studio.png)
- Original: `dist/assets/gorra-wes-trn-texas-blanca.jpg`; edición: [ gorra-wes-trn-texas-blanca-studio.png ](../dist/assets/gorra-wes-trn-texas-blanca-studio.png)
- Original: `dist/assets/gorra-no-fear-negra.jpg`; edición: [ gorra-no-fear-negra-studio.png ](../dist/assets/gorra-no-fear-negra-studio.png)

Las cinco copias servidas tienen los mismos nombres que los maestros, con extensión `.webp` en lugar de `.png`.

## Prompt compartido exacto

```text
Use case: background-extraction. Asset type: real ecommerce product photo for Luxury Drop, matched set of five caps. Edit target: the cap in the supplied photo. Remove the entire environment, any hand, glove, stump, grass, vehicle or furniture. Isolate ONLY the exact photographed cap on a truly transparent background. Preserve its actual silhouette, viewing angle, fabric texture, embroidery, seams, mesh, bill shape and all existing logos/text exactly as photographed; this is extraction and light cleanup, not a redesign or a new cap. Do not add or change lettering, patches, decorations or colors. Preserve the cap's natural black/white/orange/brown/pink colors. Use soft neutral, balanced product lighting without plastic smoothing. Square 1024x1024 transparent canvas, complete cap visible centered, approximately 80% canvas width with 10% clear margin each side, same generous breathing room above and below, no cropping or stretching. No added labels, background, props, watermark, border or text. Keep existing logo/patched text and shapes faithful. Clean fine edge separation, preserve mesh holes and embroidery detail, no remnants of glove or outdoor setting.
```

A cada llamada se añadió la identificación de su propia gorra: Champion negra con bordado blanco/rojo y rosa; Uwharrie Roofing negra con parche café; HOWDY! negra y blanca con parche naranja; WES-TRN Texas blanca con visera negra; No Fear Be Brave negra con parche naranja. Cada fotografía fue el único objetivo de su llamada de edición.

