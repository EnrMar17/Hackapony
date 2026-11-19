"use client";

import { useEffect } from "react";
import { useMap } from "./engine";

/**
 * Coloca capas en el orden del mapa, por encima de las que ya existen. Una capa que se monta después (por ejemplo
 * al elegir un viaje) queda donde la deja Mapbox, y una ruta que pase por la misma calle puede taparla.
 * Con `beforeId` quedan justo debajo de esa capa; sin él, al tope. Conservan el orden en que se pasan.
 * Las capas aparecen un poco después de montar el componente (su fuente carga primero), así que se reintenta
 * unos instantes. `ids` debe ser una constante (no un arreglo nuevo en cada render); `key` repite el ajuste
 * cuando algo cambia (por ejemplo el tema, que recarga el estilo).
 */
export function useRaiseLayers(ids: readonly string[], key: string, beforeId?: string) {
  const { current: map } = useMap();
  useEffect(() => {
    if (!map) return;
    const raise = () => {
      for (const id of ids) {
        if (!map.getLayer(id)) continue;
        if (beforeId && map.getLayer(beforeId)) map.moveLayer(id, beforeId);
        else map.moveLayer(id);
      }
    };
    const timers = [0, 120, 400, 1000].map((ms) => window.setTimeout(raise, ms));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [map, ids, key, beforeId]);
}
