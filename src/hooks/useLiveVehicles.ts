// Posición real de las unidades (CE-11).
//
// Hoy las unidades son simuladas (`useVehicles`). Si un pasajero comparte la posición de la unidad en la que va
// ("Voy en esta unidad", `useShareVehicle`), `useLiveVehicles` usa esa posición real mientras sea de hace menos de
// 20 s, y la simulada en cualquier otro caso. Así la fuente real se puede agregar sin cambiar nada más del mapa.
//
// Cómo se usa "Voy en esta unidad":
//  1. El pasajero elige la unidad en la que va (su id es el mismo que el del simulador, p. ej. "NARANJA-1-3").
//  2. `useShareVehicle` manda su posición cada ~5 s a `vehicle_positions` (una fila por unidad; el servidor
//     redondea a ~11 m y pone la hora). Un pasajero comparte una sola unidad a la vez.
//  3. Si deja de compartir (o cierra la app) la fila envejece y a los 20 s todos vuelven a ver la simulada.
//  4. Si dos pasajeros van en la misma unidad, el segundo toma el relevo cuando el primero lleva más de 20 s callado.
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/client";
import { correctedNowMs, serverToLocalMs, syncClock } from "@/lib/supabase/clock";
import { ensureSession } from "@/lib/supabase/session";
import type { LngLat, Vehicle } from "@/lib/types";

/** Una posición real deja de valer si tiene más de esto. */
export const LIVE_MAX_AGE_MS = 20_000;
const SHARE_EVERY_MS = 5_000;
const POLL_MS = 10_000;

interface PositionRow {
  vehicle_id: string;
  route_id: string;
  lat: number;
  lng: number;
  bearing: number;
  updated_at: string;
}

interface LivePosition {
  lng: number;
  lat: number;
  /** Hora local (ms) de la última lectura. */
  at: number;
}

/** Mezcla pura: la posición real reemplaza a la simulada solo si es reciente. */
export function mergeLiveVehicles(
  simulated: Vehicle[],
  live: Record<string, LivePosition>,
  now: number,
): Vehicle[] {
  return simulated.map((v) => {
    const real = live[v.id];
    if (!real || now - real.at > LIVE_MAX_AGE_MS || real.at > now + LIVE_MAX_AGE_MS) return v;
    // El rumbo se queda el de la simulación (sigue la ruta); la posición es la real.
    return { ...v, lng: real.lng, lat: real.lat };
  });
}

/** Unidades con posición real cuando la hay y es reciente; si no, las simuladas que recibe. */
export function useLiveVehicles(simulated: Vehicle[]): Vehicle[] {
  const [live, setLive] = useState<Record<string, LivePosition>>({});
  const [now, setNow] = useState(0);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    let active = true;
    let channel: RealtimeChannel | null = null;

    const toLive = (r: PositionRow): LivePosition => ({
      lng: r.lng,
      lat: r.lat,
      at: serverToLocalMs(Date.parse(r.updated_at)),
    });

    const load = async () => {
      try {
        const since = new Date(correctedNowMs() - 60_000).toISOString();
        const { data, error } = await supabase
          .from("vehicle_positions")
          .select("vehicle_id, route_id, lat, lng, bearing, updated_at")
          .gt("updated_at", since);
        if (error || !data || !active) return;
        const next: Record<string, LivePosition> = {};
        for (const r of data as PositionRow[]) next[r.vehicle_id] = toLive(r);
        setLive(next);
      } catch {
        // Sin red: se siguen usando las posiciones simuladas.
      }
    };

    void (async () => {
      await syncClock();
      await load();
      if (!active) return;
      channel = supabase
        .channel(`vehicle-positions-${Math.random().toString(36).slice(2)}`)
        .on<PositionRow>("postgres_changes", { event: "*", schema: "public", table: "vehicle_positions" }, (payload) => {
          if (!active) return;
          if (payload.eventType === "DELETE") {
            const id = payload.old.vehicle_id;
            if (id) {
              setLive((prev) => {
                const rest = { ...prev };
                delete rest[id];
                return rest;
              });
            }
            return;
          }
          setLive((prev) => ({ ...prev, [payload.new.vehicle_id]: toLive(payload.new) }));
        })
        .subscribe();
    })();
    const poll = setInterval(() => void load(), POLL_MS);
    const tick = setInterval(() => setNow(Date.now()), 2_000);
    const first = setTimeout(() => setNow(Date.now()), 0);

    return () => {
      active = false;
      clearInterval(poll);
      clearInterval(tick);
      clearTimeout(first);
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

  return useMemo(
    () => (now > 0 && Object.keys(live).length > 0 ? mergeLiveVehicles(simulated, live, now) : simulated),
    [simulated, live, now],
  );
}

/**
 * "Voy en esta unidad": mientras `vehicle` no sea null y haya `position`, comparte la posición de esa unidad
 * cada ~5 s. Al dejar de compartir (o cambiar de unidad) borra su fila para que nadie vea una posición vieja.
 * Devuelve true si la última publicación llegó al servidor.
 */
export function useShareVehicle(vehicle: Pick<Vehicle, "id" | "route_id"> | null, position: LngLat | null): boolean {
  const [shared, setShared] = useState(false);
  const positionRef = useRef(position);
  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  const id = vehicle?.id ?? null;
  const routeId = vehicle?.route_id ?? null;
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase || !id || !routeId) return;
    let active = true;
    let userId: string | null = null;

    const publish = async () => {
      const here = positionRef.current;
      if (!here || !userId) return;
      const { error } = await supabase.from("vehicle_positions").upsert({
        vehicle_id: id,
        route_id: routeId,
        lng: here[0],
        lat: here[1],
        bearing: 0,
      });
      if (active) setShared(!error);
    };

    void (async () => {
      try {
        userId = await ensureSession();
      } catch {
        return;
      }
      if (!active) return;
      // Un pasajero va en una sola unidad: se suelta la anterior antes de tomar esta.
      await supabase.from("vehicle_positions").delete().eq("user_id", userId);
      await publish();
    })();
    const timer = setInterval(() => void publish(), SHARE_EVERY_MS);

    return () => {
      active = false;
      clearInterval(timer);
      setShared(false);
      void supabase.from("vehicle_positions").delete().eq("vehicle_id", id);
    };
  }, [id, routeId]);

  return shared;
}
