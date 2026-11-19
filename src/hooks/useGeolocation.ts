// GPS del usuario. Maneja permiso denegado y falta de soporte sin romper la app.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GeolocationState, GeoStatus, LngLat } from "@/lib/types";

export function useGeolocation(): GeolocationState {
  const [position, setPosition] = useState<LngLat | null>(null);
  const [accuracyM, setAccuracyM] = useState<number | null>(null);
  const [status, setStatus] = useState<GeoStatus>("idle");
  const watchId = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (watchId.current !== null && typeof navigator !== "undefined") {
      navigator.geolocation.clearWatch(watchId.current);
    }
    watchId.current = null;
  }, []);

  const request = useCallback(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setStatus("unavailable");
      return;
    }
    if (watchId.current !== null) return; // ya se está siguiendo
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition([pos.coords.longitude, pos.coords.latitude]);
        setAccuracyM(pos.coords.accuracy);
        setStatus("granted");
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          stop();
          setPosition(null);
          setAccuracyM(null);
          setStatus("denied");
        } else {
          setStatus("unavailable"); // sin señal o tiempo agotado; se conserva la última posición
        }
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
  }, [stop]);

  // Si el permiso ya fue concedido antes, arranca solo sin volver a preguntar.
  useEffect(() => {
    let active = true;
    let permission: PermissionStatus | null = null;
    const onChange = () => {
      if (permission?.state === "granted") request();
    };
    navigator.permissions
      ?.query({ name: "geolocation" })
      .then((p) => {
        if (!active) return;
        permission = p;
        if (p.state === "granted") request();
        else if (p.state === "denied") setStatus("denied");
        p.addEventListener("change", onChange);
      })
      .catch(() => {
        // Sin API de permisos: el usuario lo activa con request().
      });
    return () => {
      active = false;
      permission?.removeEventListener("change", onChange);
      stop();
    };
  }, [request, stop]);

  return { position, accuracyM, status, request };
}
