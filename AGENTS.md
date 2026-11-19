<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md · Ruta Segura

Eres un agente de código en un equipo de 4 personas que hace vibecoding en un hackathon.
Hoy hay un solo objetivo: un prototipo estable, con el flujo principal funcionando, antes de las 16:30.
El reparto de roles y tareas está en `PLAN_MAESTRO.md` (archivo local que Tony comparte por el grupo; no está en el repo).

## Reglas absolutas
1. Solo editas archivos dentro de las carpetas que tu persona posee (ver `CLAUDE.local.md`).
   Si necesitas algo fuera de ellas, DETENTE y dile a la persona que lo pida en el grupo.
2. Archivos BLOQUEADOS (solo Tony): `src/lib/types.ts`, `src/lib/constants.ts`, `src/store/ui.ts`,
   `src/app/[city]/page.tsx`, `src/app/[city]/CityApp.tsx`, `src/components/ui/*`,
   `package.json`, `package-lock.json`, `next.config.*`, `components.json`, `.env*`, `.gitignore`,
   `AGENTS.md`, `CLAUDE.md`, `PLAN_MAESTRO.md`.
   Nunca los modifiques, ni "un cambio pequeño".
3. No instales dependencias. Si falta una, avisa a la persona para que Tony la agregue.
4. No renombres, muevas ni borres archivos de otras personas.
5. Los tipos salen de `src/lib/types.ts`. Los textos de botones y constantes salen de `src/lib/constants.ts`.
   Nunca escribas a mano "Unidad llena", "Unidad pasando aquí" ni "Incidencia / Accesibilidad": importa `REPORT_BUTTONS`.
6. Nada de secretos en el código. Variables con `NEXT_PUBLIC_*` solo desde `process.env`.
7. No crees README, docs, changelogs ni archivos .md.
8. Los commits salen solo a nombre de la persona: sin `Co-Authored-By`, sin coautor de IA y sin líneas de "Generated with".

## Calidad mínima antes de cada commit
- `npm run build` pasa sin errores. Si no pasa, no se hace commit.
- Sin `any`, sin `// @ts-ignore`, sin `console.log` olvidados.
- Sin datos falsos escondidos en componentes: los datos vienen de hooks o de `src/data/`.
- Móvil primero: probar a 390x844. Botones táctiles de mínimo 48 px.
- Todo texto de la interfaz va en español de México, corto y claro.
- Cada pantalla maneja 3 estados: cargando, vacío y error.

## Cómo trabajar
- Cambios pequeños y commits frecuentes en tu rama. Mensaje: `tipo(area): qué` (ej. `feat(mapa): capa de paradas`).
- Antes de abrir PR: `git pull origin main` (NO `--rebase`), `npm run build`, y luego PR a `main`.
- Si algo te bloquea más de 10 minutos, para y avísale a la persona. No inventes soluciones grandes.
- Prefiere la solución simple que funciona hoy sobre la elegante que termina mañana.
- No refactorices código que ya funciona. No agregues features que no estén en el plan.
- Si el contrato (types/constants/store) no alcanza, NO lo cambies: describe el cambio que necesitas para que Tony lo haga.

## Contrato de módulos (firmas fijas, las implementan sus dueños)
- `src/lib/geo/*` (Kike): `snapToRoute`, `nearestStop`, `etaToStop`, `stopSafety`, `routeStatus`, `isActive`, `timeAgo`
- `src/lib/simulator/*` (Kike): `simTimeMs`, `vehiclesAt`, `useVehicles`
- `src/data/*` (Kike): `getCityBundle(city)` → rutas, paradas y configuración
- `src/hooks/*` y `src/lib/supabase/*` (Cesar): `useSession`, `useReports`, `usePresenceCount`, `useSimConfig`, `useGeolocation`, `RealtimeProvider`
- `src/components/map/*` (Tony): `TransitMap` y capas
- `src/components/report/*`, `src/components/panels/*` (Paulo): UI de reporte y paneles
- `src/components/simulator/*` (Kike): `SimulatorPanel`
Mientras un módulo ajeno no exista, usa su stub del Commit 0. No lo reimplementes.
