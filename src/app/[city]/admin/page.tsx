import type { Metadata } from "next";
import { Suspense } from "react";
import { isAdmin } from "@/lib/admin/auth";
import { AdminClient } from "./AdminClient";
import { ADMIN_TITLE, LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: ADMIN_TITLE, robots: { index: false, follow: false } };

async function AdminRoute(props: PageProps<"/[city]/admin">) {
  const { city } = await props.params;
  return (await isAdmin()) ? <AdminClient city={city} /> : <LoginForm />;
}

// Cache Components exige leer params dentro de <Suspense>.
export default function Page(props: PageProps<"/[city]/admin">) {
  return (
    <Suspense fallback={null}>
      <AdminRoute {...props} />
    </Suspense>
  );
}
