# Garage Life (v0.1)

Juego de taller de autos en el navegador: Phaser 3 (escena isométrica) + React/TypeScript (interfaz) + Vite.

## Uso local
```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # comprueba TypeScript y genera dist/
```
Controles: arrastrar / flechas / WASD = mover cámara · rueda / +/- / pellizco = zoom · clic o toque en un carro = seleccionar.

## Publicar (GitHub + Cloudflare Pages)
```bash
git init && git add . && git commit -m "Garage Life v0.1"
git branch -M main
git remote add origin https://github.com/PlinioAbner97/garage-life.git   # crea antes el repo vacío
git push -u origin main
```
Cloudflare → Workers & Pages → Create → Pages → Connect to Git → elige el repo.
Build command: `npm run build` · Output directory: `dist` · Variable `NODE_VERSION=20`.

## Estructura
- `src/data/catalog.ts` – modelos de carros, pinturas, aros (agregar un carro = añadir una entrada).
- `src/core/` – estado (`store.ts`), economía/XP (`economy.ts`), persistencia (`save.ts`, interfaz `SaveRepository`; hoy localStorage, luego Supabase).
- `src/game/` – Phaser: escena, cámara, dibujo isométrico (`render/`). El arte es PROVISIONAL (vectorial en código) y está aislado en `render/`.
- `src/ui/` – React: inicio, HUD, paneles de garaje/tienda/inventario.

## Estado real
Implementado: pantalla de inicio; taller isométrico; 2 carros originales (Kaze S1 inicial, Raiden GT en tienda); selección; cámara con pan/zoom (ratón, teclado, táctil); HUD con dinero, nivel/XP e inventario; cambio de pintura y aros en vivo; tienda con compras que descuentan dinero y dan XP; trabajo de reparación para ganar dinero; guardado local.
Pendiente: arte final/sprites, animaciones, reparaciones y modificaciones de rendimiento, ampliar el taller, carreras, misiones, cuentas y guardado en Supabase, multijugador, sonido.
