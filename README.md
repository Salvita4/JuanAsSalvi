# Juan Salvi — Portfolio Ionic Vue

Migración del prototipo original a Ionic 8 + Vue 3, manteniendo Tailwind CSS 4 y Three.js.

## Desarrollo

Requiere Node.js 20 o superior.

```bash
npm install
npm run dev
```

También se puede iniciar con `ionic serve` si Ionic CLI está instalado globalmente.

## Verificación y producción

```bash
npm run typecheck
npm run build
npm run preview
```

El resultado de producción se genera en `dist/`.

## Estructura principal

- `src/views/PortfolioPage.vue`: interfaz y navegación de la revista.
- `src/components/MagazineScene.vue`: escena, animación e interacción Three.js.
- `src/data/portfolio.json`: todo el contenido editable del portfolio.
- `src/three/magazinePages.ts`: contenido y render de las páginas sobre canvas.
- `src/theme/global.css`: estilos globales, Tailwind y ajustes responsive/Ionic.
- `src/router/index.ts`: navegación estándar de Ionic Vue.

La revista acepta clic/toque, swipe horizontal y las flechas izquierda/derecha del teclado.

## Editar el contenido

Los textos, imágenes, proyectos, datos de contacto, skills y etiquetas de navegación se modifican desde `src/data/portfolio.json`. Las claves de color disponibles para `theme.background` y `theme.ink` son `blood`, `crimson`, `red`, `mustard`, `silver`, `ink` y `black`.

El nombre de portada se toma de `site.owner`: cada palabra se distribuye automáticamente en una línea y reduce su tamaño si hace falta para evitar cortes.

Cada página tiene su propia propiedad `displayFont`. La portada, cada proyecto, el índice, skills y contacto pueden cambiar de tipografía de manera independiente. Actualmente los nombres y títulos usan `Jersey 25`, mientras que los párrafos conservan `Inter Tight`.

Las fotos de portada y “Sobre mí” son independientes mediante `cover.portrait` y `about.portrait`. Cada una posee un `imageTreatment` propio: `tint` selecciona el color, `tintOpacity` controla su intensidad, `grayscale` la pérdida de color natural y `contrast` el contraste de la foto.

La posición del código de barras se controla desde `cover.barcode`. Aumentar `bottom` lo mueve hacia arriba; `right`, `width` y `height` controlan el resto de su geometría.

Para agregar o quitar un proyecto, actualizá también las listas `navigation` y `contents.items` del mismo JSON. La cantidad de hojas 3D se calcula automáticamente a partir de los proyectos configurados.
