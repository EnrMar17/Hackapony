// Baja de OpenStreetMap (Overpass) las relaciones de scripts/osm-relations.json y agrega su
// polilínea a scripts/waypoints.json como "path". Los huecos entre tramos van como `null`
// (fetch-osrm-routes.mjs los une con OSRM). No toca GRIS-1 ni NARANJA-1 (ya están hechas).
// Si una línea solo tiene un sentido en OSM, se marca `returnMirror` para reconstruir el regreso.
// Uso: node scripts/build-osm-paths.mjs
import { readFile, writeFile } from 'node:fs/promises';

const OVERPASS = 'https://overpass-api.de/api/interpreter';
const WAYPOINTS = 'scripts/waypoints.json';
const GAP_M = 8; // distancia entre tramos que se considera hueco
const dist = (a, b) => Math.hypot((a[0] - b[0]) * 104500, (a[1] - b[1]) * 111000);
const r5 = (n) => Math.round(n * 1e5) / 1e5;

async function fetchRelations(ids) {
  const body = `[out:json][timeout:120];relation(id:${ids.join(',')});out geom;`;
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(OVERPASS, {
      method: 'POST',
      headers: { 'User-Agent': 'route-research-script/1.0', Accept: 'application/json' },
      body: new URLSearchParams({ data: body }),
    });
    if (res.ok && (res.headers.get('content-type') ?? '').includes('json')) return (await res.json()).elements;
    await new Promise((r) => setTimeout(r, 8000));
  }
  throw new Error('Overpass no respondió');
}

/** Encadena los tramos de una relación en orden de viaje. Devuelve puntos y `null` en los huecos. */
function chain(relation) {
  const ways = relation.members.filter((m) => m.type === 'way' && m.geometry).map((m) => m.geometry.map((p) => [p.lon, p.lat]));
  if (ways.length === 0) return [];
  const near = (p, w) => Math.min(dist(p, w[0]), dist(p, w.at(-1)));
  let out = ways.length > 1 && near(ways[0][0], ways[1]) < near(ways[0].at(-1), ways[1]) ? [...ways[0]].reverse() : [...ways[0]];
  for (const w of ways.slice(1)) {
    const end = out.at(-1);
    const fwd = dist(end, w[0]);
    const bwd = dist(end, w.at(-1));
    if (Math.min(fwd, bwd) > GAP_M) out.push(null);
    out.push(...(fwd <= bwd ? w : [...w].reverse()));
  }
  return out;
}

const ends = (points) => {
  const real = points.filter(Boolean);
  return { start: real[0], end: real.at(-1) };
};

const config = JSON.parse(await readFile('scripts/osm-relations.json', 'utf8'));
const waypoints = JSON.parse(await readFile(WAYPOINTS, 'utf8'));
// Cada entrada es una lista de relaciones o { relations, returnHint }: returnHint son relaciones
// antiguas (desordenadas) que traen calles del regreso; sirven de guía si OSM solo tiene un sentido.
// `bothWays`: la línea corre el circuito en los dos sentidos (Moovit: "Circular" y "Anti-Circular")
// aunque OSM solo tenga una vuelta; se agrega la vuelta en sentido contrario.
const spec = (v) =>
  Array.isArray(v)
    ? { relations: v, returnHint: [], bothWays: false }
    : { relations: v.relations, returnHint: v.returnHint ?? [], bothWays: v.bothWays === true, sameStreets: v.sameStreets === true };
// `sameStreets`: el sentido contrario va exactamente por las mismas calles (verificado con un mapa
// de referencia); se usa la ida al revés en lugar de reconstruir el regreso.
const all = await fetchRelations([...new Set(Object.values(config).flatMap((v) => [...spec(v).relations, ...spec(v).returnHint]))]);
const byId = new Map(all.map((r) => [r.id, r]));
const LOOP_M = 300; // si inicio y fin quedan a menos de esto, la relación ya es un circuito

/** Puntos de las relaciones guía que no están sobre la ida (posibles calles del regreso). */
function hintPoints(hintIds, forward) {
  const pts = [];
  for (const id of hintIds) {
    const rel = byId.get(id);
    if (!rel) continue;
    for (const m of rel.members) {
      if (m.type !== 'way' || !m.geometry) continue;
      for (const g of m.geometry) {
        const p = [g.lon, g.lat];
        if (forward.every((q) => dist(p, q) > 30)) pts.push([r5(p[0]), r5(p[1])]);
      }
    }
  }
  return pts;
}

for (const [routeId, value] of Object.entries(config)) {
  const { relations: relIds, returnHint, bothWays, sameStreets } = spec(value);
  const parts = relIds.map((id) => {
    const rel = byId.get(id);
    if (!rel) throw new Error(`${routeId}: falta la relación ${id}`);
    return chain(rel);
  });
  let ordered = parts;
  if (parts.length === 2) {
    const [a, b] = parts.map(ends);
    const ab = dist(a.end, b.start) + dist(b.end, a.start);
    const ba = dist(b.end, a.start) + dist(a.end, b.start);
    ordered = ab <= ba ? parts : [parts[1], parts[0]];
  }
  const path = [];
  for (const part of ordered) {
    const first = part.find(Boolean);
    const last = path.filter(Boolean).at(-1);
    if (last && dist(last, first) > GAP_M) path.push(null);
    path.push(...part);
  }
  const real = path.filter(Boolean);
  const entry = { path: path.map((p) => (p ? [r5(p[0]), r5(p[1])] : null)) };
  if (parts.length === 1 && bothWays && sameStreets) {
    entry.returnReverse = true;
  } else if (parts.length === 1 && (bothWays || dist(real.at(-1), real[0]) > LOOP_M)) {
    // OSM solo trae un sentido: fetch-osrm-routes reconstruye el regreso por el mismo corredor.
    entry.returnMirror = true;
    const hint = hintPoints(returnHint, real);
    if (hint.length) entry.returnHint = hint;
  } else if (dist(real.at(-1), real[0]) > GAP_M) {
    entry.path.push(null, entry.path.find(Boolean));
  }
  waypoints[routeId] = entry;
  const huecos = path.filter((p) => p === null).length;
  console.log(
    `${routeId}: ${real.length} puntos, ${huecos} huecos${entry.returnMirror ? `, un sentido (regreso espejo${entry.returnHint ? `, ${entry.returnHint.length} puntos guía` : ''})` : ''}`,
  );
}
await writeFile(WAYPOINTS, JSON.stringify(waypoints));
console.log(`Guardado en ${WAYPOINTS}`);
