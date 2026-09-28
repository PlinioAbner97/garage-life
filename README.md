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
- `src/data/` – catálogos basados en datos: `vehicles.ts` (modelos JDM), `parts.ts` (pintura, aros, suspensión, body kit, extras, motor), `upgrades.ts` (mejoras del taller), `util.ts`.
- `src/core/` – `types.ts` (estado y build de cada auto), `store.ts` (acciones, vista previa, migración de guardado), `economy.ts`, `stats.ts` (potencia/manejo/valor/nivel de mods), `save.ts` (interfaz `SaveRepository`; hoy localStorage, luego Supabase).
- `src/game/` – Phaser: `GarageScene.ts` (cámara, zonas interactivas), `render/` (dibujo isométrico del auto y del taller, PROVISIONAL/vectorial).
- `src/ui/` – React: inicio, HUD, y `screens/` (Personalización, Colección, Inventario, Taller).

## Estado real (actualización 2)
**Implementado y funcional:**
- 5 vehículos originales inspirados en JDM (coupé, hatch, GT-R, Supra-style, Evo-style) con marca, año, rareza, stats y precio; colección con compra y cambio del auto activo en el taller.
- Personalización real (cambia el dibujo del auto): pintura (paletas + selector de color personalizado libre), aros (color y tamaño), suspensión (3 alturas), body kit (paragolpes, faldones, capó, alerón), vinilos, cristales polarizados, escape, motor (con boost de potencia).
- Vista previa al pasar el mouse sobre una pieza (escritorio); en móvil se aplica al equipar directamente.
- Inventario que lista piezas compradas por categoría y cuáles están instaladas en el auto activo.
- Economía: dinero visible, verificación de saldo y de nivel antes de comprar, descuento real, XP por compra, mensajes de confirmación/error; no se puede comprar dos veces la misma pieza.
- Taller interactivo: elevador con el auto activo (clic para personalizar), gabinete de herramientas (clic abre mejoras), zona de almacenamiento con espacios bloqueados/ocupados/vacíos (clic abre colección).
- Mejoras del taller compradas y persistentes: elevadores adicionales (visual), iluminación LED/neón (visual), piso premium (visual), ampliación de espacio (aumenta cuántos autos puedes poseer).
- Progreso: nivel/XP compartidos entre reparar el auto, comprar piezas, vehículos y mejoras; artículos bloqueados muestran el nivel requerido; nada se reinicia entre sesiones.
- Guardado local con control de versión: si detecta un guardado de una versión anterior, conserva dinero/XP y reinicia el resto de forma seguridad en vez de romperse.
- Controles de cámara (arrastrar/WASD/flechas, zoom con rueda/botones/pellizco) y "Girar vista" (espejo del auto; ver nota abajo).

**Parcialmente implementado:**
- "Ver desde otros ángulos": el botón Girar vista voltea el auto (espejo horizontal), no es una rotación 3D real ni multi-ángulo con sprites.
- Body kit / vinilos / motor: cambian la apariencia y las estadísticas mostradas, pero son piezas únicas por categoría (no hay combinaciones de capas ilimitadas ni slots independientes por accesorio).

**Pendiente para próximas fases:** arte/sprites finales en vez de vectores, animaciones (puertas, herramientas en movimiento), carreras, misiones, ciudad explorable, cuentas de usuario y guardado real en Supabase, funciones sociales/multijugador (visitar talleres, perfiles públicos, encuentros), sonido.
