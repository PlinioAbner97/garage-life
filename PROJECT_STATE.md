# PROJECT_STATE.md — Garage Life

Resumen de referencia rápida. Leer esto antes de releer código fuente.

## Stack
Phaser 3 (juego) + React/TypeScript (UI) + Vite. Guardado: localStorage vía `core/save.ts` (interfaz `SaveRepository`, lista para Supabase). Repo: github.com/PlinioAbner97/garage-life, rama `main`. Deploy: Render (static site, build `npm install && npm run build`, publish `dist`).

## Arquitectura
- `core/store.ts` — única fuente de estado (`GameState`), patrón pub/sub manual (`subscribe`/`useGame`). Todas las mutaciones pasan por `actions.*`. `SAVE_VERSION = 4`, `migrate()` preserva progreso reconocible de versiones previas.
- `core/types.ts` — todas las interfaces de estado (CarBuild, GameState, JobOffer/ActiveJob, UsedListing, etc).
- `core/jobs.ts`, `core/stats.ts`, `core/dates.ts`, `core/rng.ts`, `core/economy.ts` — lógica pura sin UI.
- `data/*.ts` — catálogos estáticos (vehicles, parts, upgrades, taskCatalog, clientArchetypes, missions, zones, usedMarket, racing).
- `game/GarageScene.ts` + `game/CityScene.ts` — dos escenas Phaser, cambian con `this.scene.start()`, comunicadas por `game/bus.ts` (EventEmitter). `render/*.ts` = primitivos isométricos reutilizables (`iso.ts`: box/poly/iso/shade).
- `ui/App.tsx` — enrutador de paneles (overlay tipo sheet sobre el canvas Phaser). `ui/screens/*` = una pantalla por feature.

## Visual overhaul (5 fases, completo)
`iso.ts` (+shadowBlob/outline) → `garage.ts`, `car.ts` (cabina ahusada/parachoques/espejos), `styles.css` (solo CSS, botones con relieve/dock/paneles), `fx.ts` (pulso/destello/fade, respeta reduced-motion), `city.ts`. Mismo motor vectorial (box/poly/iso), sin nueva tecnología de sprites.

## Implementado (4 actualizaciones)
1. Taller base: vehículos, personalización (pintura/aros/suspensión/bodykit/vinilos/motor), inventario, mejoras del taller, economía.
2. Clientes y trabajos: ofertas, tareas con timer real + minijuego opcional, reputación, misiones diarias/semanales.
3. Ciudad explorable: 2ª escena, 3 concesionarios, mercado usado (rotación semanal determinista), tienda de piezas, distrito de carreras (solo inscripción, sin mecánica de resultado), encuentros (mecánica de puntaje real), desbloqueo de zonas.

## Pendiente / limitaciones conocidas
- Carreras: sin simulación/resultado real todavía (solo inscripción).
- Sin ciclo día/noche ni tráfico animado en la ciudad.
- Sin sprites/arte final (todo vectorial).
- Sin Supabase real (solo localStorage).
- Sin funciones sociales reales (perfil es demo local).
- Rotación de tareas de mecánica: neumáticos/frenos no son categorías de pieza propias (cubiertas narrativamente por tareas de reparación).

## Convenciones a mantener
- Nunca romper `SaveRepository` ni el shape de `GameState` sin migración en `migrate()`.
- Nuevas piezas/vehículos/misiones van en `data/*.ts`, no hardcodeadas en componentes.
- Nuevas pantallas van en `ui/screens/`, registradas en `App.tsx` (switch `panelBody`) y si aplica en `Hud.tsx` (nav) o en una zona de `data/zones.ts` + `CityScene`.
- Token de GitHub NUNCA se guarda en el repo; se usa solo en `git remote set-url` temporal y se limpia tras el push.
