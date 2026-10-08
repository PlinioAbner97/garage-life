# Garage Life

Juego de taller de autos estilo Car Town, hecho con **tu garaje de Blender** (`cartown.blend`).
Phaser 3 (escena isométrica) + React/TypeScript (menús y HUD) + Vite. Español.

## Jugar

```bash
npm install
npm run dev            # http://localhost:5173
npm run build:single   # genera dist-single/index.html (un solo archivo, abre con doble clic)
npm run build          # build normal en dist/ (para Cloudflare Pages)
```

## Publicar en Render
Sitio estático. En Render: **New + → Static Site** (o Blueprint con `render.yaml`), Build command `npm ci && npm run build`, Publish directory `dist`.

## Cómo funciona

- **Arte**: el garaje y los autos son renders de tu escena de Blender con tu cámara isométrica (`src/assets`).
  Cada auto tiene un render + una máscara (R = pintura, G = rines) y el juego los recolorea en vivo
  conservando sombras y reflejos (`src/engine/recolor.ts`).
- **Juego**: dinero, XP/nivel, comprar/vender autos, trabajos con temporizador (siguen corriendo con la pestaña cerrada),
  personalización (pintura y rines con vista previa), plazas desbloqueables, guardado automático.
- **Controles**: arrastrar = mover cámara, rueda/pellizco = zoom, tocar auto = seleccionar, tocar plaza libre con auto seleccionado = mover.

## Estructura

```
src/core/     store (estado único), save (LocalSaveStore; interfaz lista para Supabase)
src/data/     vehicles, parts (pinturas/rines), jobs, config (slots, precios)  <- balance del juego aquí
src/engine/   GarageScene (Phaser), recolor, assets
src/ui/       React: StartScreen, Hud, Panels, styles.css
tools/        render_sprites.py: regenera sprites desde el .blend (pip install bpy; BLEND=archivo.blend python tools/render_sprites.py)
```

## Autos incluidos
Falcon GT (Eclipse-style), Kobalt 22 (Subaru 22B-style), Akane RS (Supra-style), Nami 34 (R34-style), Shirogane X (Evo-style).
Todos igualan el tamaño en pantalla del Falcon GT (`SPRITE_SCALE` en `src/engine/assets.ts` y `length` en `tools/render_new_cars.py`).

## Agregar un auto nuevo
1. Renderiza sus sprites: `tools/render_sprites.py` (autos que ya están en el .blend del garaje) o `tools/render_new_cars.py` (importa el auto desde otro .blend, lo escala al tamaño del Eclipse y lo coloca en su plaza; ver cabecera del archivo).
2. Agrega su entrada en `src/data/vehicles.ts` y su `SpriteKey` en `src/engine/assets.ts`.

## Notas
- Los logos de Mitsubishi y Subaru del modelo se ocultaron en los renders y los autos usan nombres ficticios
  (Falcon GT, Kobalt 22) para poder publicar el juego sin problemas de marcas.
- Supabase: implementa `SaveStore` (`src/core/save.ts`) y pásalo a `GameStore`.

## App en el celular (PWA)
Abre https://garagelife.onrender.com en el teléfono y agrégala a la pantalla de inicio:
- **iPhone (Safari):** Compartir → *Agregar a pantalla de inicio*.
- **Android (Chrome):** menú ⋮ → *Instalar app* / *Agregar a pantalla de inicio*.

Incluye manifest, service worker (funciona sin conexión tras la primera visita) e íconos en `public/`. El logo se regenera desde `tools/logo.svg`.
