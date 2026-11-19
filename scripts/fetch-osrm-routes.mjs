// Traza las rutas como circuito cerrado con OSRM y las guarda como GeoJSON.
// Uso: node scripts/fetch-osrm-routes.mjs [entrada.json] [salida.json]
// Entrada: { "GRIS-1": { "waypoints": [[lng, lat], ...] }, "NARANJA-1": { "path": [[lng, lat], ...] } }
//   waypoints: pocos puntos; OSRM traza el camino entre ellos.
//   path: polilínea densa (p. ej. de OSM); los huecos grandes se unen con OSRM.
// Salida:  FeatureCollection con un LineString cerrado por ruta (properties.id).
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const ROUTE_IDS = ['GRIS-1', 'NARANJA-1'];
const OSRM = 'https://router.project-osrm.org/route/v1/driving';
const NEAREST = 'https://router.project-osrm.org/nearest/v1/driving';
const SPUR_MAX_M = 150; // espigón: ida y vuelta corta sobre el mismo punto
const SPUR_NEAR_M = 12;
const GAP_M = 500; // hueco que se une con OSRM en modo path (los tramos rectos de OSM pueden medir 100-300 m)
const input = process.argv[2] ?? 'scripts/waypoints.json';
const output = process.argv[3] ?? 'src/data/routes.json';

const dist = (a, b) => Math.hypot((a[0] - b[0]) * 104500, (a[1] - b[1]) * 111000);

// Pega cada punto a la calle más cercana para evitar desvíos a calles laterales.
async function snap([lng, lat]) {
  const res = await fetch(`${NEAREST}/${lng},${lat}?number=1`);
  const data = await res.json();
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

function close(points) {
  const [a, b] = [points[0], points[points.length - 1]];
  return a[0] === b[0] && a[1] === b[1] ? points : [...points, a];
}

async function osrmLine(id, pts) {
  const coords = pts.map(([lng, lat]) => `${lng},${lat}`).join(';');
  const res = await fetch(`${OSRM}/${coords}?overview=full&geometries=geojson&steps=false`);
  if (!res.ok) throw new Error(`${id}: OSRM respondió ${res.status}`);
  const data = await res.json();
  if (data.code !== 'Ok' || !data.routes?.[0]) {
    throw new Error(`${id}: OSRM no encontró ruta (${data.code})`);
  }
  return data.routes[0].geometry.coordinates;
}

async function bridge(id, path) {
  const out = [path[0]];
  for (let i = 1; i < path.length; i++) {
    if (dist(path[i - 1], path[i]) > GAP_M) {
      out.push(...(await osrmLine(id, [await snap(path[i - 1]), await snap(path[i])])));
    }
    out.push(path[i]);
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
  const line = dropSpurs(raw);
  line[line.length - 1] = line[0]; // garantiza circuito cerrado exacto
  return {
    type: 'Feature',
    properties: { id, lengthM: Math.round(line.slice(1).reduce((s, p, i) => s + dist(line[i], p), 0)) },
    geometry: { type: 'LineString', coordinates: line },
  };
}

const config = JSON.parse(await readFile(input, 'utf8'));
const features = [];
for (const id of ROUTE_IDS) {
  if (!config[id]) throw new Error(`Falta ${id} en ${input}`);
  features.push(await trace(id, config[id]));
  console.log(`${id}: ${features.at(-1).geometry.coordinates.length} puntos, ${features.at(-1).properties.lengthM} m`);
}
await mkdir(dirname(output), { recursive: true });
await writeFile(output, JSON.stringify({ type: 'FeatureCollection', features }));
console.log(`Guardado en ${output}`);
