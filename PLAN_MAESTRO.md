# RUTA SEGURA · Plan Maestro V3 (Hackpony 2026, Reto 02)

> Líder: **Tony**. Equipo: Tony · Kike · Paulo · Cesar.
> Arranque: jueves 10:00. **Último commit: 16:30** (límite duro 17:00). Congelamiento de features: 15:45.
> Este archivo es la fuente de verdad. Si algo contradice el Plan V2, **gana este** (V3 = V2 con el reparto de roles corregido).

---

## 0. Reparto de roles (lo que cambió respecto a V2)

| Quién | Rama | Rol | Carpetas |
| --- | --- | --- | --- |
| **Tony** | `feature/mapa` | Líder + Commit 0 + Mapa | `src/components/map/**` y archivos bloqueados (types, constants, store, CityApp, page, package.json, AGENTS.md, CLAUDE.md, PLAN_MAESTRO.md, `src/components/ui/*`, `components.json`, `.env*`) |
| **Cesar** | `feature/datos` | Supabase, tiempo real y hooks | `supabase/`, `src/hooks/`, `src/lib/supabase/`, `src/app/debug/` |
| **Kike** | `feature/geo` | Rutas, geo y simulador | `src/data/`, `src/lib/geo/`, `src/lib/simulator/`, `src/components/simulator/`, `scripts/` |
| **Paulo** | `feature/ux` | UX / interfaz | `src/components/report/`, `src/components/panels/`, `globals.css`, `layout.tsx`, `manifest.ts`, `public/` |

Orden de merge en integración: **Kike (geo) → Cesar (datos) → Tony (mapa) → Paulo (UX)**.

## 1. Cómo usar este archivo (2 minutos)

1. El Commit 0 de Tony deja en `main`: este archivo, `AGENTS.md`, `CLAUDE.md` y los stubs. Todos hacen `git pull origin main`.
2. Cada quien abre su Claude **en la raíz del repo** y copia **el bloque de su rol** (sección 4) a **`CLAUDE.local.md`** en la raíz. Está en `.gitignore`: no se sube.
3. Primer mensaje a tu Claude: **"Lee AGENTS.md, CLAUDE.local.md y PLAN_MAESTRO.md. Confirma qué carpetas puedes tocar y empieza por la tarea 1 de mi Fase 1."**
4. Cada quien trabaja **solo en sus carpetas** y en **su rama**. Nunca en `main` (solo Tony, el Commit 0).
5. Si tu Claude sugiere tocar algo fuera de tu carpeta: **no**. Se pide en el grupo.

Qué se evalúa (100 pts): **Prototipo 45 · Impacto en México 25 · UX/UI 15 · Pitch 15**. Prioridad absoluta: que el flujo principal **funcione y no se caiga**. Después, que se vea bien.

---

## 2. El producto en una frase

App web móvil-first donde la gente ve las rutas de transporte público de Morelia en un mapa, reporta en un toque lo que pasa en la unidad o en la parada, y todos los demás lo ven **en vivo**. Incluye un simulador de unidades para la demo.

### Requisitos del reto (no negociables)
- Mapa interactivo con **2 rutas locales**: **Gris 1** (`GRIS-1`) y **Naranja 1** (`NARANJA-1`).
- **3 botones rápidos de reporte**, con estos textos **exactos**: `Unidad llena` · `Unidad pasando aquí` · `Incidencia / Accesibilidad`
- Simulador y/o reportes en vivo entre sesiones (hacemos **ambos**).
- Sin documentación extra: solo `AGENTS.md` y este plan. **No hay README.**

---

## 3. Stack y decisiones cerradas

| Tema | Decisión |
| --- | --- |
| Framework | Next.js 16 (App Router) + TypeScript + Tailwind 4 + shadcn/ui |
| Estado cliente | Zustand (solo `store/ui.ts`) |
| Validación | Zod |
| Backend/Realtime | Supabase (Postgres + RLS + Realtime + Anonymous Auth) |
| Mapa | Mapbox GL JS v3 vía `react-map-gl/mapbox` |
| Plan B del mapa | MapLibre + OpenFreeMap. Se cambia **solo** editando `src/components/map/engine.ts` |
| Geo | Turf.js modular |
| Rutas | Se trazan **una vez** con OSRM, se guardan como GeoJSON de circuito cerrado en `src/data/` |
| Deploy | Vercel (HTTPS obligatorio para GPS) |
| Tiempo real | `postgres_changes` en `reports` + presence + broadcast. **Polling cada 3 s como respaldo** |

**Regla del mapa:** token funcionando a las 9:50 → Mapbox. Si a las **10:15** no renderiza o piden tarjeta → MapLibre + OpenFreeMap, sin debatir. (Alguien que no sea Tony hace esta prueba en los primeros 15 min, porque Tony está en el Commit 0.)

**Next 16:** `params` y `searchParams` son asíncronos (`await props.params`), `middleware` se llama `proxy`. Usar los tipos globales `PageProps<'/ruta'>` / `LayoutProps<'/ruta'>`. Ante la duda, leer `node_modules/next/dist/docs/`.

---

## 4. Reglas por rol (cada quien copia **su** bloque a `CLAUDE.local.md`)

### 4.1 Tony · Líder, Commit 0 y Mapa

```markdown
# CLAUDE.local.md · TONY (líder + mapa)
Lee AGENTS.md primero. Soy el líder y dueño de `main`.

## Mis carpetas
`src/components/map/**` y todos los archivos bloqueados de AGENTS.md. Rama de trabajo: `feature/mapa`. El Commit 0 va directo a `main`.

## Reglas para mi Claude
- Solo `engine.ts` importa `react-map-gl` / `mapbox-gl` / `maplibre-gl`. Los demás archivos de mapa usan lo que `engine.ts` exporta.
- Vehículos con UNA capa GeoJSON (`setData` a ~10 Hz). Prohibido un `<Marker>` por unidad.
- Reportes y paradas también como capas (symbol/circle), no como DOM.
- El mapa recibe datos por props o hooks del contrato; no hace fetch por su cuenta.
- Mientras no existan `routes.json` ni hooks reales, uso los stubs del Commit 0.
- Estilo claro y legible al sol; la ruta activa resaltada, la otra atenuada.
- `types.ts` es el contrato. Cualquier cambio se hace en un PR pequeño y se avisa al grupo en el momento.
- Cuando reviso PRs: solo checo que compile, que no toquen archivos bloqueados y que no rompan el flujo principal. No pido refactors.
```

### 4.2 Cesar · Supabase, tiempo real y hooks

```markdown
# CLAUDE.local.md · CESAR (datos)
Lee AGENTS.md primero. Soy dueño de Supabase, el tiempo real y los hooks.

## Mis carpetas
`supabase/**`, `src/hooks/**`, `src/lib/supabase/**`, `src/app/debug/**`. Rama: `feature/datos`.

## Reglas para mi Claude
- `src/lib/types.ts` es el contrato (lo escribe Tony). `supabase/migrations/0001_init.sql` debe coincidir con sus enums y tablas. Si la DB necesita algo distinto, lo pido a Tony; no invento valores.
- Cada hook devuelve `{ data, loading, error }` o equivalente y tolera estar offline.
- `useReports`: carga inicial, INSERT/UPDATE/DELETE en vivo, UI optimista, manejo de RATE_LIMIT (15 s), polling a 3 s si el canal cae.
- Nunca exponer la service key. Solo anon key en el cliente.
- No toco `.env*`: las variables las pasa Tony por el grupo y viven en mi `.env.local` (no se sube).
- Los stubs de `src/hooks/*` del Commit 0 se reemplazan por implementaciones reales manteniendo la misma firma.
```

### 4.3 Kike · Rutas, geo y simulador

```markdown
# CLAUDE.local.md · KIKE (geo)
Lee AGENTS.md primero. Soy dueño de los datos de rutas, la geometría y el simulador.

## Mis carpetas
`src/data/**`, `src/lib/geo/**`, `src/lib/simulator/**`, `src/components/simulator/**`, `scripts/**`. Rama: `feature/geo`.

## Reglas para mi Claude
- Solo existen 2 rutas: `GRIS-1` y `NARANJA-1`. No agregues otras.
- Las rutas son circuitos cerrados: el primer y el último punto coinciden. Se generan con el script de OSRM y se guardan como GeoJSON; no se llama a OSRM en runtime.
- No inventes recorridos: valido contra SIG Morelia / Moovit / Google Maps. Si una ruta no se puede verificar, la sustituyo por una que pase por el ITM y aviso al grupo.
- 12 a 15 paradas por ruta, cada una con: id, nombre, coordenadas, y atributos de seguridad (luz, rampa, techo).
- El simulador es DETERMINISTA: la posición es función del reloj (`simTimeMs`), así todos los dispositivos ven lo mismo sin servidor.
- Funciones puras y tipadas; sin efectos secundarios en `lib/geo`.
- Los escenarios de "Simular evento" respetan el límite de 15 s por usuario.
- El panel del simulador solo aparece con `?admin=1`.
```

### 4.4 Paulo · UX / interfaz

```markdown
# CLAUDE.local.md · PAULO (UX)
Lee AGENTS.md primero. Soy dueño de la interfaz de reporte y los paneles.

## Mis carpetas
`src/components/report/**`, `src/components/panels/**`, `src/app/globals.css`, `src/app/layout.tsx`, `src/app/manifest.ts`, `public/**`. Rama: `feature/ux`.

## Reglas para mi Claude
- Los 3 botones usan `REPORT_BUTTONS` de `constants.ts` (textos exactos). Jamás los escribo a mano.
- Mobile-first a 390x844: el reporte se hace en UN toque, con el pulgar, sin scroll.
- Botones de mínimo 48 px, contraste alto, nada de color como única señal.
- Mis componentes reciben datos y callbacks por props (`onReport`, `onUndo`, etc.). No importan Supabase ni el mapa.
- Mientras no existan los hooks reales, uso los stubs del Commit 0.
- Feedback inmediato en cada acción: vibración corta, toast "Reporte enviado · Deshacer" (5 s), cooldown visual de 15 s.
- Textos cortos, en español de México. Estados de cargando / vacío / error en cada panel.
- Detalles que suman: animaciones sutiles, `prefers-reduced-motion`, ARIA en botones, modo oscuro solo si sobra tiempo.
```

---

## 5. Estructura de carpetas y dueños

```
src/
  app/
    [city]/page.tsx            ← Tony (bloqueado)
    [city]/CityApp.tsx         ← Tony (bloqueado): layout y zonas
    debug/                     ← Cesar
    globals.css, layout.tsx    ← Paulo
    manifest.ts                ← Paulo
  components/
    ui/                        ← bloqueado (shadcn)
    map/                       ← Tony
    report/, panels/           ← Paulo
    simulator/                 ← Kike
  hooks/                       ← Cesar
  lib/
    types.ts, constants.ts     ← Tony (bloqueado)
    supabase/                  ← Cesar
    geo/                       ← Kike
    simulator/                 ← Kike
  store/ui.ts                  ← Tony (bloqueado)
  data/                        ← Kike
scripts/                       ← Kike
supabase/                      ← Cesar
```

Zonas de `CityApp.tsx` (cableadas con stubs en el Commit 0):
`TopBar` (Paulo) · `TransitMap` (Tony) · `ReportBar` (Paulo) · `BottomSheet` (Paulo) · `SimulatorPanel` (Kike, solo `?admin=1`).

---

## 6. FASE 1 · Base del proyecto (10:00 → 12:00)

**Meta: Hito 1 a las 12:00.** Un reporte hecho desde un celular aparece en el mapa de la laptop, en vivo, con 2 rutas visibles y unidades moviéndose.

### 6.1 Tony · Commit 0 (entregable 10:20) y mapa
- [ ] `src/lib/types.ts`, `src/lib/constants.ts`, `src/store/ui.ts`.
- [ ] Todas las dependencias instaladas y shadcn base.
- [ ] Stubs con las firmas del contrato: hooks, geo, simulator, `getCityBundle`, y componentes de UI/mapa.
- [ ] `CityApp.tsx` con las 5 zonas cableadas a los stubs.
- [ ] `AGENTS.md`, `CLAUDE.md` (`@AGENTS.md`), este `PLAN_MAESTRO.md`, `.gitignore` con `CLAUDE.local.md` y `.env.local`.
- [ ] Aviso al grupo: **"Commit 0 listo, hagan `git pull origin main`."**
- [ ] Deploy a Vercel con `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `NEXT_PUBLIC_MAPBOX_TOKEN`; pasar las variables a Cesar.
- [ ] Después del Commit 0, mapa en `feature/mapa`: `engine.ts`, `TransitMap`, `RouteLayers`, `StopLayer` (semáforo por `stopSafety`), `ReportLayer`, `VehicleLayer` (una capa, ~10 Hz), `UserLocation`.

**Listo cuando:** en el celular se ven las 2 rutas, paradas y unidades moviéndose fluido, sin lag.

### 6.2 Cesar · Datos y tiempo real
- [ ] **Primeros 15 min:** `supabase/migrations/0001_init.sql` (tablas, enums que coincidan con `types.ts`, RLS, trigger de límite de 15 s) y seed. Si se necesita otro valor en un enum, pedírselo a Tony.
- [ ] **Arreglo obligatorio en el trigger `reports_before_insert()`:** dentro de `if auth.uid() is not null then ... end if;` agregar `new.is_simulated := false;`. Sin esto un cliente podría mandar `is_simulated = true` y saltarse el límite de 15 s.
- [ ] Seed con `GRIS-1` y `NARANJA-1` (no hay otras rutas).
- [ ] Panel de Supabase: Anonymous sign-ins activos, **límite de sign-ins por IP subido** (la sala de jueces comparte IP) y `reports` dentro de la publicación `supabase_realtime`. Antes de las 11:00.
- [ ] `src/lib/supabase/client.ts` y `useSession` (login anónimo automático).
- [ ] `RealtimeProvider` + `useReports`: carga inicial, INSERT/UPDATE/DELETE, UI optimista, manejo de `RATE_LIMIT`, polling a 3 s.
- [ ] `useGeolocation` (permiso denegado manejado).
- [ ] `/debug`: 2 columnas con los reportes en vivo y un botón por tipo, para probar con 2 pestañas sin depender del mapa ni de la UI.

**Listo cuando:** abro `/debug` en dos pestañas, mando un reporte en una y aparece en la otra en menos de 1 s.

### 6.3 Kike · Rutas, geo y simulador
- [ ] **10:00 → 10:30:** validar `GRIS-1` y `NARANJA-1` en SIG Morelia / Moovit / Google Maps. Si alguna no se confirma, sustituir por una que pase por el ITM y avisar.
- [ ] 12–20 waypoints por ruta cerrando el circuito y correr `scripts/fetch-osrm-routes.mjs`. Revisar en geojson.io.
- [ ] 12–15 paradas por ruta (nombre, coordenadas, luz/rampa/techo).
- [ ] **10:45: subir `src/data/routes.json` a `feature/geo` y avisar** (Tony lo necesita para pintar rutas reales; si no llega, subir uno provisional grueso).
- [ ] `getCityBundle(city)`: rutas, paradas y configuración.
- [ ] `lib/geo`: `snapToRoute`, `nearestStop`, `etaToStop` (circuito), `stopSafety` (semáforo + razones), `routeStatus`, `isActive`, `timeAgo`.
- [ ] `lib/simulator`: `simTimeMs`, `vehiclesAt(t)` y `useVehicles` con 3–4 unidades por ruta; posición = función del reloj.
- [ ] Entregar a Cesar las coordenadas reales para el seed (11:00).

**Listo cuando:** `vehiclesAt(Date.now())` devuelve unidades sobre las rutas reales y `etaToStop` da tiempos coherentes.

### 6.4 Paulo · UX
- [ ] **10:00 → 10:20:** `globals.css` (tokens de color, fuente, safe-areas), `layout.tsx` con `<Toaster />`, viewport móvil correcto.
- [ ] `ReportBar`: 3 botones grandes con `REPORT_BUTTONS`, recibe `onReport(type)`, deshabilita durante cooldown.
- [ ] `IncidentPicker`: al tocar "Incidencia / Accesibilidad" aparecen 4 chips para detallar el tipo.
- [ ] Cooldown visual de 15 s y vibración corta al reportar.
- [ ] `LocationChip`: "Cerca de: <parada>" con estado de permiso de GPS.
- [ ] `TopBar`: 2 chips de ruta (Gris 1 / Naranja 1) conectados al store + contador "N en línea".
- [ ] `BottomSheet` con `StopDetail`, `RouteStatusCard` (semáforo y razones) y `ReportFeed` (lista con `timeAgo`).
- [ ] Estados de cargando, vacío y error en cada panel.

**Listo cuando:** con los stubs, en 390x844 se reporta en un toque, se ve el cooldown y el panel inferior abre y cierra suave.

### 6.5 Puntos de control

| Hora | Debe estar |
| --- | --- |
| 10:15 | Decisión de mapa (Mapbox o MapLibre); SQL base de Cesar |
| 10:20 | Commit 0 en `main`; todos hacen pull |
| 10:45 | `routes.json` de Kike disponible |
| 11:30 | Integración: merges a `main` en este orden → **Kike, Cesar, Tony, Paulo** |
| 12:00 | **Hito 1:** reporte desde celular aparece en laptop. Si falla, todos ayudan a Cesar y se pausa todo lo demás |
| 13:30 → 14:30 | Comida |

---

## 7. FASE 2 · A partir del Hito 1 (12:00 → 15:45)

No saltar a extras con algo base roto.

### 7.1 Núcleo que debe quedar sólido (12:00 → 13:30)
| Quién | Tarea |
| --- | --- |
| Cesar | `vote` ("Confirmo +1" / "Ya se resolvió"), `undo`, presence (`usePresenceCount`), `useSimConfig` por Broadcast (play/pausa y velocidad sincronizadas), indicador de conexión |
| Tony | Giro de unidades según su rumbo, pulso en reportes nuevos, `ReportPopup` con "Confirmo (+1)" y "Ya se resolvió", botón de centrar |
| Kike | `SimulatorPanel` (`?admin=1`): play/pausa, 1x/2x/5x; 3 escenarios de "Simular evento" (respetan los 15 s); ETA que use reportes reales cuando existan |
| Paulo | Parada más cercana al abrir, toast "Reporte enviado · Deshacer" (5 s) conectado a `undo`, onboarding de 3 pasos, layout de escritorio para la pantalla de jueces |

**13:20 → Demo interna** en `main` desplegado: recorrido completo con 2 celulares.

### 7.2 Después de comer (14:30 → 15:45): extras, solo si el núcleo está estable
1. **Impacto en México (25 pts):** razones del semáforo de seguridad por parada, enlaces `?ruta=&reporte=` + "Compartir por WhatsApp", mensaje claro de a quién ayuda (usuarios sin app oficial de horarios, accesibilidad).
2. **Detalle que impresiona (UX):** capa de calor, leyenda, estilo oscuro, accesibilidad completa, PWA instalable.
3. **Respaldo para la demo:** seed final con reportes de edades distintas (Cesar), datos de demo realistas (Kike), revisión de RLS (Cesar).

### 7.3 Pitch
Slides y discurso **después de las 17:00** (sin commits). Durante la tarde, Tony anota 3 ideas de impacto mientras revisa PRs.

---

## 8. Git: cómo no pisarnos

```
git checkout main && git pull origin main
git checkout -b feature/<tu-area>     # solo la primera vez
# ... trabajas con tu Claude ...
npm run build                         # debe pasar
git add -A && git commit -m "feat(area): descripción corta"
git pull origin main                  # NO --rebase
npm run build
git push origin feature/<tu-area>     # y abrir PR a main
```

- **Los commits salen solo a nombre de quien los hace: sin `Co-Authored-By` ni coautor de IA.**
- Tony revisa y mergea. Orden en integración: **Kike → Cesar → Tony → Paulo**.
- Conflicto en un archivo que **no** es tuyo: no lo resuelvas, avisa a Tony.
- Commits chicos y seguidos; un PR por bloque que funcione.
- Después de las **15:45**: solo fixes de bugs.
- **16:30:** último commit. **17:00:** límite duro.

---

## 9. Plan de riesgos

| Problema | Acción |
| --- | --- |
| Mapbox no carga / pide tarjeta | MapLibre + OpenFreeMap vía `engine.ts` (Tony, 10 min) |
| Realtime no llega | Polling cada 3 s ya activo; revisar publicación `supabase_realtime` (Cesar) |
| Muchos usuarios en la misma IP (sala de jueces) | Subir el límite de anonymous sign-ins (Cesar, antes de las 11:00) |
| Ruta no verificable | Cambiarla por otra que pase por el ITM (Kike) |
| Build roto en `main` | Todo se detiene; Tony revierte el último merge y se arregla en rama |
| GPS denegado o sin HTTPS | La app sigue funcionando con parada manual; probar siempre en el URL de Vercel |
| Alguien se atora más de 10 min | Pedir ayuda en el grupo |
| Cesar atorado en Supabase (ruta crítica del Hito 1) | Tony lo apoya de inmediato; el mapa espera |

---

## 10. Checklist final de demo (15:45 → 16:30)

- [ ] `main` desplegado en Vercel, build verde, sin errores en consola.
- [ ] Se ven **2 rutas** y unidades moviéndose.
- [ ] Los 3 botones con **textos exactos** reportan en un toque.
- [ ] Un reporte desde un celular aparece en otro dispositivo en vivo.
- [ ] El simulador (`?admin=1`) arranca, pausa y cambia velocidad; los eventos simulados respetan el límite.
- [ ] Sin permisos de GPS la app sigue usable.
- [ ] Seed con datos de demo creíbles.
- [ ] Dos celulares y una laptop probados en el URL final.
- [ ] Último commit antes de las 16:30.
