import type { Metadata } from "next";
import { Suspense } from "react";
import { DebugClient } from "./DebugClient";

export const metadata: Metadata = { title: "Debug · Ruta Segura", robots: { index: false } };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <DebugClient />
    </Suspense>
  );
}
