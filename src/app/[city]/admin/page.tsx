import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminClient } from "./AdminClient";

export const metadata: Metadata = { title: "Panel del operador" };

async function AdminRoute(props: PageProps<"/[city]/admin">) {
  const { city } = await props.params;
  return <AdminClient city={city} />;
}

// Cache Components exige leer params dentro de <Suspense>.
export default function Page(props: PageProps<"/[city]/admin">) {
  return (
    <Suspense fallback={null}>
      <AdminRoute {...props} />
    </Suspense>
  );
}
