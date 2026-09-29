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
- `src/data/` – catálogos: `vehicles.ts`, `parts.ts`, `upgrades.ts`, `taskCatalog.ts` (tareas de mecánica), `clientArchetypes.ts` (tipos de cliente, diálogos, niveles de reputación), `missions.ts` (misiones diarias/semanales), `util.ts`.
- `src/core/` – `types.ts` (estado global), `store.ts` (todas las acciones), `jobs.ts` (generación y resolución de órdenes de trabajo), `dates.ts` (claves de fecha estables), `stats.ts`, `economy.ts`, `save.ts`.
- `src/game/` – Phaser: `GarageScene.ts`, `render/` (dibujo isométrico del auto y del taller).
- `src/ui/` – React: inicio, HUD, y `screens/` (Personalización, Colección, Inventario, Taller, **Trabajos**, minijuego de tareas).

## Estado real (actualización 3: clientes, trabajos y misiones)
**Implementado y funcional:**
- **Clientes:** 5 arquetipos (común, entusiasta JDM, corredor, coleccionista, especial) con nombres, diálogos, dificultad y multiplicador de pago; los coleccionistas y clientes especiales se desbloquean por nivel de reputación. Hasta 3 solicitudes disponibles a la vez, generadas con "Buscar clientes".
- **Órdenes de trabajo reales:** cada oferta muestra tareas concretas del catálogo (reparaciones y modificaciones), pago estimado, costo de materiales y XP *antes* de aceptar. Al aceptar se descuentan los materiales de inmediato; el vehículo del cliente se mantiene separado de la colección del jugador.
- **Interacción mecánica real:** cada tarea se "Inicia" (guarda una marca de tiempo persistente), tiene una duración real con barra de progreso, y las tareas de modificación exigen elegir la pieza a instalar (reutilizando el catálogo de piezas existente) antes de poder finalizar — esto cambia visualmente el auto del cliente de verdad.
- **Minijuego opcional de precisión** (clic cuando el marcador pasa por la zona central) con alternativa simple ("Finalizar sin minijuego"); terminar antes del 60% de la duración limita la calidad máxima a "aceptable", incentivando esperar sin bloquear el progreso.
- **Taller integrado:** el botón "Llevar al elevador" muestra el auto del cliente en el mismo elevador del taller (reutilizando el renderizado 3D existente), con aviso "Trabajando en el auto de…" y opción de volver al auto propio en cualquier momento.
- **Entrega y economía:** al completar todas las tareas el trabajo pasa a "listo"; "Entregar vehículo" paga dinero + XP + reputación según la satisfacción promedio de las tareas (perfecto/aceptable/con errores), con protección real contra reclamar la recompensa dos veces (el trabajo se elimina de activos al entregarse).
- **Reputación:** contador independiente con 6 niveles (Mecánico principiante → Leyenda automotriz), barra de progreso y lista de qué desbloquea cada tipo de cliente.
- **Misiones diarias y semanales:** progreso real ligado a acciones del jugador (reparaciones, mods, dinero ganado, clientes atendidos, trabajos completados, clientes especiales, restauraciones), con reclamo protegido contra duplicados y reinicio basado en la fecha real del dispositivo (no en la sesión del navegador).
- **Historial de trabajos** completados con cliente, vehículo, satisfacción y recompensas.
- **Guardado ampliado (v3):** la migración ahora conserva *todo* el progreso reconocible de una partida v2 (dinero, vehículos, piezas, mejoras) y solo añade con valores por defecto los campos nuevos de clientes/misiones, en vez de reiniciar el juego. Se añadió una validación defensiva básica de los datos cargados (números inválidos o negativos se corrigen al valor por defecto).

**Parcialmente implementado / limitaciones señaladas honestamente:**
- La validación anti-manipulación de `localStorage` es solo defensiva (sanea valores corruptos); no puede impedir por completo que alguien edite el guardado a mano en el navegador — eso requiere un backend real (Supabase), ya previsto en la arquitectura (`SaveRepository`).
- El auto del cliente reutiliza el mismo sistema visual que el auto del jugador; no tiene un modelo de "daño" visual distinto antes de reparar.
- Solo un cliente puede estar "enfocado" en el elevador a la vez (hay un solo elevador con auto 3D); los demás trabajos activos se gestionan desde la lista, no desde la escena.

**Pendiente para próximas fases:** avatares/arte de los clientes (hoy son texto), animaciones de herramientas moviéndose, carreras, ciudad explorable, cuentas de usuario y sincronización real con Supabase, funciones sociales (visitar talleres de amigos, compartir reputación, eventos comunitarios), sonido.
