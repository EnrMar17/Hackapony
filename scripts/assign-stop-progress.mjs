// Guarda en src/data/stops.json el `progress` (0 a 1) de cada parada: en QUÉ pasada del circuito la sirve la ruta,
// es decir, su sentido. Si el circuito recorre una calle de ida y de vuelta, una parada tiene dos pasadas posibles
// y el ETA no debe contar las unidades del sentido contrario.
//
// Las paradas se generaron repartidas a intervalos iguales a lo largo del recorrido (el id lleva el número de
// orden), así que el sentido se recupera eligiendo, para cada parada, la pasada más cercana a su posición
// esperada: (orden + 0.5) / total. Excepción: en Gris 1, de `g1-15` en adelante son las paradas del sentido
// contrario (la vuelta) y se asignan a la ÚLTIMA pasada.
//
// Uso: node scripts/assign-stop-progress.mjs [--write]   (sin --write solo informa)
import { readFile, writeFile } from "node:fs/promises";

const STOPS = "src/data/stops.json";
const ROUTES = "src/data/routes.json";
const M_PER_DEG_LAT = 111_000;
const M_PER_DEG_LNG = 104_500;
const write = process.argv.includes("--write");
const force = process.argv.includes("--force"); // escribe aunque haya paradas sin orden (se revisan a mano)
/** Rutas cuyas paradas, a partir de este número de orden, están en el sentido de vuelta. */
const RETURN_FROM = { "GRIS-1": 15 };
/** Rutas de paradas colocadas a mano (no a intervalos iguales). */
const HAND_MADE = new Set(["GRIS-1", "NARANJA-1"]);

/** Mismo cálculo que `passProgresses` de src/lib/geo/routeGeometry.ts. */
function passProgresses(coords, cumulativeM, point, radiusM = 25) {
  const total = cumulativeM[cumulativeM.length - 1];
  const [px, py] = point;
  const found = [];
  let best = null;
  const flush = () => {
    if (best) found.push(best.along / total);
    best = null;
  };
  for (let i = 1; i < coords.length; i++) {
    const [ax, ay] = coords[i - 1];
    const [bx, by] = coords[i];
    const sx = (bx - ax) * M_PER_DEG_LNG;
    const sy = (by - ay) * M_PER_DEG_LAT;
    const len2 = sx * sx + sy * sy;
    const wx = (px - ax) * M_PER_DEG_LNG;
    const wy = (py - ay) * M_PER_DEG_LAT;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, (wx * sx + wy * sy) / len2));
    const d = Math.hypot(wx - t * sx, wy - t * sy);
    if (d <= radiusM) {
      const along = cumulativeM[i - 1] + t * Math.sqrt(len2);
      if (!best || d < best.d) best = { d, along };
    } else flush();
  }
  flush();
  return found;
}

const routes = JSON.parse(await readFile(ROUTES, "utf8")).features;
const stops = JSON.parse(await readFile(STOPS, "utf8"));
let withTwo = 0;
let problems = 0;

for (const f of routes) {
  const id = f.properties.id;
  const coords = f.geometry.coordinates;
  const cumulativeM = [0];
  for (let i = 1; i < coords.length; i++) {
    const [ax, ay] = coords[i - 1];
    const [bx, by] = coords[i];
    cumulativeM.push(cumulativeM[i - 1] + Math.hypot((bx - ax) * M_PER_DEG_LNG, (by - ay) * M_PER_DEG_LAT));
  }
  const mine = stops
    .filter((s) => s.route_id === id)
    .sort((a, b) => Number(a.id.split("-").pop()) - Number(b.id.split("-").pop()));
  let prev = -1;
  let routeTwo = 0;
  let routeBad = 0;
  const count = mine.length;
  mine.forEach((s, index) => {
    let passes = passProgresses(coords, cumulativeM, [s.lng, s.lat]);
    if (passes.length === 0) passes = passProgresses(coords, cumulativeM, [s.lng, s.lat], 80);
    if (passes.length === 0) {
      routeBad++;
      return;
    }
    if (passes.length > 1) routeTwo++;
    passes.sort((a, b) => a - b);
    const order = Number(s.id.split("-").pop());
    const returnFrom = RETURN_FROM[id];
    const isReturn = Boolean(returnFrom) && order >= returnFrom;
    let chosen;
    if (isReturn) {
      chosen = passes[passes.length - 1]; // sentido de vuelta
    } else if (HAND_MADE.has(id)) {
      // Hechas a mano, sin reparto parejo: la primera pasada que no retrocede respecto a la parada anterior.
      chosen = passes.find((p) => p >= prev - 1e-6) ?? passes[passes.length - 1];
    } else {
      // Generadas a intervalos iguales: la pasada más cercana a su posición esperada.
      const expected = (index + 0.5) / count;
      chosen = passes.reduce((x, y) => (Math.abs(y - expected) < Math.abs(x - expected) ? y : x));
    }
    s.progress = Math.round(chosen * 1e4) / 1e4;
    // Dentro de un mismo sentido el avance solo crece; si retrocede, el orden no cuadra.
    if (!isReturn) {
      if (chosen < prev - 1e-6) {
        routeBad++;
        console.log(`  aviso: ${s.id} retrocede (${chosen.toFixed(3)} < ${prev.toFixed(3)}); pasadas: ${passes.map((x) => x.toFixed(3)).join(" | ")}`);
      }
      prev = chosen;
    }
  });
  withTwo += routeTwo;
  problems += routeBad;
  console.log(`${id.padEnd(24)} ${String(mine.length).padStart(2)} paradas · ${String(routeTwo).padStart(2)} con 2 sentidos · ${routeBad} sin orden`);
}
console.log(`Total: ${stops.length} paradas, ${withTwo} con 2 sentidos, ${problems} problemas`);

if (write && (problems === 0 || force)) {
  await writeFile(STOPS, JSON.stringify(stops, null, 2) + "\n");
  console.log("stops.json actualizado con `progress`.");
} else if (write) {
  console.log("NO se escribió: hay paradas cuyo orden no cuadra; revisar antes.");
}
