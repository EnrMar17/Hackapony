// Traza las rutas como circuito cerrado con OSRM y las guarda como GeoJSON.
// Uso: node scripts/fetch-osrm-routes.mjs [entrada.json] [salida.json] [ID ...]
// Entrada: { "GRIS-1": { "waypoints": [[lng, lat], ...] }, "NARANJA-1": { "path": [[lng, lat] | null, ...] } }
//   waypoints: pocos puntos; OSRM traza el camino entre ellos.
//   path: polilínea densa (p. ej. de OSM). Un `null` marca un hueco que se une con OSRM;
//         los saltos de más de GAP_M sin marcar también se unen.
// Con IDs al final solo se vuelven a trazar esas rutas; las demás se conservan de la salida actual.
// Salida:  FeatureCollection con un LineString cerrado por ruta (properties.id).
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const OSRM = 'https://router.project-osrm.org/route/v1/driving';
const NEAREST = 'https://router.project-osrm.org/nearest/v1/driving';
const SPUR_MAX_M = 150; // espigón: ida y vuelta corta sobre el mismo punto
const SPUR_NEAR_M = 12;
const GAP_M = 500; // salto sin marcar que se une con OSRM (los tramos rectos de OSM pueden medir 100-300 m)
const SIMPLIFY_M = 4; // tolerancia al simplificar la línea final
const CALL_DELAY_MS = 120; // cortesía con el servidor público de OSRM
const input = process.argv[2] ?? 'scripts/waypoints.json';
const output = process.argv[3] ?? 'src/data/routes.json';
const only = process.argv.slice(4);

const dist = (a, b) => Math.hypot((a[0] - b[0]) * 104500, (a[1] - b[1]) * 111000);
const r5 = (n) => Math.round(n * 1e5) / 1e5;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url) {
  await sleep(CALL_DELAY_MS);
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url);
    if (res.ok) return res.json();
    await sleep(1500 * (attempt + 1));
  }
  throw new Error(`OSRM no respondió: ${url.slice(0, 80)}`);
}

// Pega cada punto a la calle más cercana para evitar desvíos a calles laterales.
async function snap([lng, lat]) {
  const data = await getJson(`${NEAREST}/${lng},${lat}?number=1`);
  return data.code === 'Ok' ? data.waypoints[0].location : [lng, lat];
}

// Quita espigones: tramos cortos que regresan por donde ya pasaron.
function dropSpurs(line) {
  const out = [];
  for (const p of line) {
    let cut = -1;
    let acc = 0;
    for (let j = out.length - 1; j > 0 && acc < SPUR_MAX_M; j--) {
      acc += dist(out[j], out[j - 1]);
      if (dist(out[j - 1], p) < SPUR_NEAR_M) cut = j - 1;
    }
    if (cut >= 0) out.length = cut + 1;
    out.push(p);
  }
  return out;
}

// Douglas-Peucker iterativo (en metros) para que routes.json pese poco.
function simplify(line, tolM) {
  const keep = new Uint8Array(line.length);
  keep[0] = keep[line.length - 1] = 1;
  const stack = [[0, line.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let worst = 0;
    let idx = -1;
    const [ax, ay] = line[a];
    const [bx, by] = line[b];
    const sx = (bx - ax) * 104500;
    const sy = (by - ay) * 111000;
    const len = Math.hypot(sx, sy) || 1e-9;
    for (let i = a + 1; i < b; i++) {
      const wx = (line[i][0] - ax) * 104500;
      const wy = (line[i][1] - ay) * 111000;
      const t = Math.max(0, Math.min(1, (wx * sx + wy * sy) / (len * len)));
      const d = Math.hypot(wx - t * sx, wy - t * sy);
      if (d > worst) {
        worst = d;
        idx = i;
      }
    }
    if (idx > 0 && worst > tolM) {
      keep[idx] = 1;
      stack.push([a, idx], [idx, b]);
    }
  }
  return line.filter((_, i) => keep[i]);
}

function close(points) {
  const real = points.filter(Boolean);
  const [a, b] = [real[0], real.at(-1)];
  return a[0] === b[0] && a[1] === b[1] ? points : [...points, null, a];
}

async function osrmLine(id, pts) {
  const coords = pts.map(([lng, lat]) => `${lng},${lat}`).join(';');
  const data = await getJson(`${OSRM}/${coords}?overview=full&geometries=geojson&steps=false`);
  if (data.code !== 'Ok' || !data.routes?.[0]) throw new Error(`${id}: OSRM no encontró ruta (${data.code})`);
  return data.routes[0].geometry.coordinates;
}

async function joinGap(id, from, to) {
  try {
    return await osrmLine(id, [await snap(from), await snap(to)]);
  } catch {
    console.warn(`  aviso ${id}: hueco de ${Math.round(dist(from, to))} m sin ruta, queda en línea recta`);
    return [];
  }
}

async function bridge(id, path) {
  const out = [];
  let gap = false;
  for (const p of path) {
    if (p === null) {
      gap = true;
      continue;
    }
    if (out.length && (gap || dist(out.at(-1), p) > GAP_M)) out.push(...(await joinGap(id, out.at(-1), p)));
    gap = false;
    out.push(p);
  }
  return out;
}

async function trace(id, entry) {
  let raw;
  if (entry.path) {
    raw = await bridge(id, close(entry.path));
  } else {
    if (!Array.isArray(entry.waypoints) || entry.waypoints.length < 3) {
      throw new Error(`${id}: se necesitan al menos 3 waypoints`);
    }
    const snapped = [];
    for (const w of entry.waypoints) snapped.push(await snap(w));
    raw = await osrmLine(id, close(snapped));
  }
  const cleaned = dropSpurs(raw);
  cleaned[cleaned.length - 1] = cleaned[0]; // garantiza circuito cerrado exacto
  const line = simplify(cleaned, SIMPLIFY_M).map(([x, y]) => [r5(x), r5(y)]);
  line[line.length - 1] = line[0];
  return {
    type: 'Feature',
    properties: { id, lengthM: Math.round(line.slice(1).reduce((s, p, i) => s + dist(line[i], p), 0)) },
    geometry: { type: 'LineString', coordinates: line },
  };
}

const config = JSON.parse(await readFile(input, 'utf8'));
let previous = [];
try {
  previous = JSON.parse(await readFile(output, 'utf8')).features;
} catch {
  previous = [];
}
const ids = only.length ? only : Object.keys(config);
const traced = new Map(previous.map((f) => [f.properties.id, f]));
for (const id of ids) {
  if (!config[id]) throw new Error(`Falta ${id} en ${input}`);
  const feature = await trace(id, config[id]);
  traced.set(id, feature);
  console.log(`${id}: ${feature.geometry.coordinates.length} puntos, ${(feature.properties.lengthM / 1000).toFixed(1)} km`);
}
const order = Object.keys(config);
const features = [...traced.values()].sort((a, b) => order.indexOf(a.properties.id) - order.indexOf(b.properties.id));
await mkdir(dirname(output), { recursive: true });
await writeFile(output, JSON.stringify({ type: 'FeatureCollection', features }));
console.log(`Guardado en ${output}`);
