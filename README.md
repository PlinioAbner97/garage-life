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
- `src/data/` – catálogos: `vehicles.ts` (9 modelos con `dealerCategory`), `parts.ts`, `upgrades.ts`, `taskCatalog.ts`, `clientArchetypes.ts`, `missions.ts`, `zones.ts` (zonas de la ciudad y requisitos de desbloqueo), `usedMarket.ts` (mercado rotativo), `racing.ts` (carreras y encuentros), `util.ts`.
- `src/core/` – `types.ts`, `store.ts` (todas las acciones), `jobs.ts`, `stats.ts` (incluye `exhibitionScore` para los encuentros), `dates.ts`, `rng.ts` (RNG determinista para la rotación semanal), `economy.ts`, `save.ts`.
- `src/game/` – Phaser: **dos escenas** — `GarageScene.ts` (taller) y `CityScene.ts` (ciudad), que se intercambian con `scene.start()`; `render/` incluye `city.ts` además de `car.ts`/`garage.ts`/`iso.ts`.
- `src/ui/` – React: inicio, HUD (con botón Ciudad/Taller), y `screens/` — Personalización, Colección, Inventario, Mejoras, Trabajos, y las nuevas: `DealershipScreen` (3 concesionarios), `UsedMarketScreen`, `PartsShopScreen`, `RacingDistrictScreen`, `MeetupsScreen`, `ZoneLockedScreen`, `ProfileScreen`.

## Estado real (actualización 4: ciudad explorable)
**Implementado y funcional:**
- **Mapa de la ciudad** como segunda escena de Phaser (reutiliza los mismos primitivos isométricos del taller): calles, aceras, árboles, faroles, y 7 edificios de zona distribuidos por el mapa, cada uno con su propio color, dificultad de desbloqueo y cámara con pan/zoom/WASD/pellizco igual que el taller. Un edificio dedicado regresa al taller.
- **Navegación real entre taller y ciudad**: botón "Ir a la ciudad / Volver al taller" en el HUD, intercambia las escenas de Phaser sin perder el estado del juego.
- **3 concesionarios reales** (JDM, Clásicos, Alto rendimiento) con 9 vehículos en total repartidos por categoría, inspección con estadísticas antes de comprar, y compra conectada al mismo sistema de economía/colección existente (sin duplicar lógica).
- **Mercado de usados con rotación semanal real**: el inventario se genera de forma determinista a partir de la semana actual (mismo RNG con semilla), así que es estable si recargas la misma semana y cambia la siguiente; los autos ya comprados quedan en tu colección y no se pierden al rotar.
- **Tienda de piezas de la ciudad**: reutiliza el catálogo de piezas existente (mismas 35 piezas de pintura/aros/suspensión/body kit/motor/etc.), comprando directo al inventario sin forzar que se equipen a un auto.
- **Distrito de carreras**: navegación, información e inscripción *reales* — inscribirse cuesta dinero de verdad y queda guardado. Deliberadamente **no** otorga recompensas todavía, porque no existe una mecánica de simulación de carrera real (se indica explícitamente en la interfaz, siguiendo la instrucción de no crear carreras falsas).
- **Encuentros automotrices con mecánica real**: a diferencia de las carreras, aquí SÍ hay un resultado real — el auto que presentes se juzga con una fórmula basada en su valor, potencia, manejo y nivel de modificación reales (no una recompensa fija), con niveles bronce/plata/oro y un límite de una presentación por encuentro por día.
- **Sistema de desbloqueo de zonas** con los 3 tipos de requisito pedidos (nivel, reputación, dinero), vista previa con los requisitos exactos cuando está bloqueada, y persistencia real al cumplirlos.
- **Misiones de exploración** añadidas al mismo motor de misiones existente (sin duplicar sistemas): comprar piezas/vehículos en la ciudad, presentar un auto en un encuentro, explorar zonas nuevas, inscribirse en una carrera.
- **Perfil local**, claramente etiquetado como vista de demostración (no un perfil público real), mostrando nivel, reputación, colección y progreso — sin ningún botón de "visitar amigos" falso.
- **Guardado ampliado (v4)**: igual que en la actualización anterior, la migración conserva todo el progreso reconocible (ahora también mezcla los contadores de misiones campo por campo, para que las claves nuevas no rompan los guardados viejos) y añade los campos nuevos de ciudad con valores por defecto.

**Parcialmente implementado / limitaciones señaladas honestamente:**
- No hay ciclo día/noche ni tráfico animado en las calles (el mapa es estático, con autos y decoración solo como ambientación visual) — technically factible pero quedó fuera de esta fase por tiempo.
- El distrito de carreras tiene navegación e inscripción reales pero **sin simulación de carrera**; es una limitación explícita y declarada, no un error.
- El "daño" o desgaste de los autos usados es solo una etiqueta de condición con descuento de precio; no hay un sistema de reparación obligatoria ligado a ello (se puede reparar igualmente vía el sistema de clientes/trabajos existente).
- La tienda de piezas de la ciudad no vende neumáticos ni frenos como categorías independientes porque esas categorías no tienen hoy un sistema visual/de estadísticas propio (ya están cubiertas de forma narrativa por las tareas de reparación existentes); añadir eso sin una mecánica real habría sido una función decorativa falsa.
- Los desbloqueos de zona por misión/logro específico no se implementaron (los tres tipos de requisito que sí se integran — nivel, reputación, dinero — cubren los casos principales); se puede añadir luego sin romper nada, ya que la estructura de requisitos es extensible.

**Pendiente para próximas fases:** mecánica real de carreras (circuito/drag), ciudad con más detalle gráfico/sprites finales, cuentas de usuario y sincronización con Supabase para las funciones sociales reales (amigos, visitar talleres, comparar colecciones, eventos comunitarios), sonido.
