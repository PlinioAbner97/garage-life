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

## Cuentas y guardado en la nube (Supabase)
Sin configurar nada el juego guarda en el navegador. Para que cada jugador tenga cuenta y su progreso en cualquier dispositivo:
1. Crea un proyecto gratis en https://supabase.com.
2. SQL Editor → pega y ejecuta `supabase/schema.sql` (tabla `saves` con seguridad por fila: cada jugador solo ve la suya).
3. Authentication → Providers → Email: para entrar al instante desactiva **Confirm email** (si lo dejas activo, el jugador debe confirmar su correo).
4. Settings → API: copia **Project URL** y **anon public key** a las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (en Render: servicio → Environment; en local: `.env.local`, ver `.env.example`) y vuelve a desplegar.

Al crear cuenta, si ya había una partida local en ese dispositivo se sube a la cuenta. Nota: el guardado lo escribe el cliente, así que un jugador técnico podría editar su propia partida; para un juego competitivo habría que mover la lógica de dinero al servidor.

## Terreno, expansiones y editor del garaje
- **Disposición**: el garaje original está pegado al muro del fondo (sin muro lateral izquierdo), la entrada de vehículos mira a la calle y las 6 zonas de expansión (patios, flancos, frente) se desbloquean por **nivel + GarageCoins** (`ZONES` en `src/data/config.ts`; costos y niveles son configurables). Se compran en **🗺️ Expansiones** o tocando la zona oscurecida.
- **Tienda de accesorios** (`src/data/items.ts`, 12 artículos), **Inventario** (cantidad, colocados, libres) y **Editar garaje**: arrastrar, rotar (⟳), guardar en inventario, cuadrícula de 0.25 m opcional, vista previa verde/roja, *Guardar cambios* / *Cancelar* (cancelar no pierde nada). Mover o guardar un objeto nunca vuelve a cobrar; cada objeto colocado tiene `uid` único.
- **Reglas** (`src/core/layout.ts`, puras): solo zonas desbloqueadas, nada fuera del terreno, sin choques entre objetos, sin tapar plazas, el carril de entrada ni los muebles ya dibujados; accesorios de pared solo pegados a un muro.
- **Acabados** de suelo y paredes (tinte), en Inventario → Acabados; gratis una vez comprados.
- **Persistencia**: `zones`, `inventory`, `placed`, `style` dentro de la partida (local o Supabase). Partidas antiguas se migran con valores vacíos.
- **Renders**: `tools/render_lot.py` (terreno y calles V11), `tools/render_items.py` (sprites de accesorios, 4 rotaciones) con la cámara del juego.
- **Limitaciones**: no hay backend propio, así que las compras se validan en el cliente (la partida vive en el navegador/Supabase con RLS por usuario; un jugador técnico podría alterar su propia partida). Los artículos marcados "decorativo" aún no tienen función de juego. Depuración: añadir `?debug` a la URL expone `window.__gl`.

## Usuarios, amigos y visitas
- Con cuenta, el jugador elige un **username** (3–16 letras, números o `_`, único), añade amigos por username (solicitud → aceptar) y **visita sus garajes** en solo lectura (👥 arriba a la derecha).
- Los amigos ven una copia reducida (`garages`: autos, zonas, accesorios, acabados y nivel; **sin dinero ni datos privados**). Se publica sola unos segundos después de cada guardado.
- **Requiere ejecutar `supabase/schema_social.sql`** en Supabase → SQL Editor (tablas `profiles`, `friendships`, `garages` con RLS: solo el amigo aceptado puede leer tu garaje).
- Próximo paso previsto: carreras entre amigos y contra IA (dinero y XP). Cuando se haga, el premio debería validarse en el servidor (función de Supabase), no en el cliente.

## Clientes, Recepción y Bahías de Servicio
- **Recepción** ($15.000, nivel 10) desbloquea la pestaña *Trabajos → Clientes*. **Bahía de Servicio** ($5.000, nivel 10) se instala sobre una plaza libre desbloqueada (el índice de plaza es estable) y la reserva para clientes. Al retirarla vuelve a ser estacionamiento normal. No se puede mover/retirar con un trabajo activo.
- Para operar hacen falta la recepción y ≥1 bahía libre. Motor y transmisión requieren además el *Elevador* (`car_lift`).
- Configuración (precios, tiempos, XP, reputación, autos de clientes): `src/data/clients.ts`. Equipos: `src/data/items.ts`. Validación de colocación: `src/core/layout.ts`. Lógica y máquina de estados (offered → arriving → waiting → repairing → ready → leaving): `src/core/store.ts` (`tickBiz`). Basada en marcas de tiempo, segura al recargar; la recompensa se marca `claimed` en la misma operación que se paga.
- Los autos de clientes son temporales (no entran a la colección) y recorren `bayPath(slot)`; el camino queda reservado y no se puede bloquear con accesorios.
- Pruebas: `npm run build && npx vite preview --port 4173` y `node tools/test_biz.mjs` (22 comprobaciones de los 16 casos).
- Limitación: la validación es del lado del cliente (no hay servidor propio); para carreras/recompensas competitivas habrá que validar con una función de Supabase.

## Carreras (arrancones estilo CSR2)
- Panel 🏁 *Carreras*: eliges tu auto y rival (IA por categorías de nivel, o el mejor auto de un amigo desde el nivel 2). Cuota de inscripción + premio + XP; al perder, 25 % del XP. Enfriamiento de 60 s por auto.
- **Juego:** semáforo con luz verde → toca *GO* (reacción) → cambia de marcha en la zona verde del tacómetro (perfecto / bien / pronto / tarde) → un nitro por carrera. Salida en falso = +1 s. Teclado: Espacio/Enter y N.
- **Más caro = más rápido:** `RACE_POWER` en `src/data/races.ts` (Falcon 56 … Shirogane 100) → `accelOf()` en `src/data/drag.ts` (≈13,3 s a ≈9,0 s los 402 m con cambios perfectos).
- El jugador y la IA usan el mismo motor (`drag.ts`); la IA tiene error de habilidad por categoría (`SKILL`). Vista en canvas: `src/ui/dragView.ts`.
- Al terminar se guarda el resultado y se cobra una sola vez. Si recargas a mitad de carrera, se cuenta como abandonada.
- Pruebas: `node tools/test_race.mjs`. Limitación: validación del lado del cliente; para premios competitivos reales hará falta una función de Supabase.

## Economía (cambio de diseño)
- Los autos propios **ya no dan dinero**: el ingreso viene de **clientes** (reparaciones en bahías) y de **carreras**. Los autos propios sirven para competir y lucir.
- Todos empiezan con la Recepción y una Bahía de Servicio ya instaladas (partidas anteriores las reciben una vez, `withStarter` en `store.ts`). Bahías extra: $5.000 (nivel 3).
- Los trabajos viejos en curso se pueden cobrar, pero ya no se pueden iniciar nuevos.
