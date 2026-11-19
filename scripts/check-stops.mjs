// Revisa src/data/stops.json contra src/data/routes.json. Sale con código 1 si algo falla.
//   - cada parada debe quedar a menos de MAX_OFF_M metros de la línea de SU ruta
//   - cada ruta debe tener paradas, con ids únicos y sin nombres repetidos
//   - lista las paradas sin nombre ("Parada") para revisarlas a ojo
// Nota de datos: en Naranja 1 el tramo de ~450 m del extremo norte (donde la ida y la vuelta no se
// conectan en OSM) lo puso OSRM; ninguna parada cae en ese tramo a propósito.
// Uso: node scripts/check-stops.mjs
import { readFile } from 'node:fs/promises';

const MAX_OFF_M = 30;
const KX = 104500;
const KY = 111000;

/** Distancia (m) de un punto a un segmento, en plano local. */
function distToSegment([px, py], [ax, ay], [bx, by]) {
  const sx = (bx - ax) * KX;
  const sy = (by - ay) * KY;
  const wx = (px - ax) * KX;
  const wy = (py - ay) * KY;
  const len2 = sx * sx + sy * sy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, (wx * sx + wy * sy) / len2));
  return Math.hypot(wx - t * sx, wy - t * sy);
}

const routes = new Map(
  JSON.parse(await readFile('src/data/routes.json', 'utf8')).features.map((f) => [f.properties.id, f.geometry.coordinates]),
);
const stops = JSON.parse(await readFile('src/data/stops.json', 'utf8'));

const problems = [];
const unnamed = [];
const ids = new Set();
const perRoute = new Map();

for (const s of stops) {
  if (ids.has(s.id)) problems.push(`id repetido: ${s.id}`);
  ids.add(s.id);
  const line = routes.get(s.route_id);
  if (!line) {
    problems.push(`${s.id}: la ruta ${s.route_id} no existe en routes.json`);
    continue;
  }
  let min = Infinity;
  for (let i = 1; i < line.length; i++) min = Math.min(min, distToSegment([s.lng, s.lat], line[i - 1], line[i]));
  if (min > MAX_OFF_M) problems.push(`${s.id} (${s.route_id}) a ${Math.round(min)} m de su ruta: ${s.name}`);
  if (s.name === 'Parada') unnamed.push(s.id);
  const list = perRoute.get(s.route_id) ?? [];
  list.push(s);
  perRoute.set(s.route_id, list);
}

for (const id of routes.keys()) {
  const list = perRoute.get(id) ?? [];
  if (list.length === 0) problems.push(`${id}: sin paradas`);
  const names = new Map();
  for (const s of list) names.set(s.name, (names.get(s.name) ?? 0) + 1);
  for (const [name, n] of names) if (n > 1 && name !== 'Parada' && !name.endsWith('(sentido contrario)')) problems.push(`${id}: nombre repetido ${n} veces: ${name}`);
}

console.log(`${stops.length} paradas en ${perRoute.size} rutas; margen máximo ${MAX_OFF_M} m`);
if (unnamed.length) console.log(`Sin nombre (revisar a ojo): ${unnamed.join(', ')}`);
if (problems.length) {
  console.log(`\n${problems.length} problema(s):`);
  for (const p of problems) console.log(`  - ${p}`);
  process.exit(1);
}
console.log('Todas las paradas están sobre su ruta.');
