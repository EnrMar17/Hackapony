import { Suspense } from "react";
import { CityApp } from "./CityApp";

async function CityRoute(props: PageProps<"/[city]">) {
  const { city } = await props.params;
  const { admin, ruta, parada } = await props.searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  return <CityApp city={city} admin={admin === "1"} initialRoute={first(ruta)} initialStop={first(parada)} />;
}

// Cache Components exige leer params/searchParams dentro de <Suspense>.
export default function Page(props: PageProps<"/[city]">) {
  return (
    <Suspense fallback={null}>
      <CityRoute {...props} />
    </Suspense>
  );
}
