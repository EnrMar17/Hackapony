import { Suspense } from "react";
import { CityApp } from "./CityApp";

async function CityRoute(props: PageProps<"/[city]">) {
  const { city } = await props.params;
  const { admin } = await props.searchParams;
  return <CityApp city={city} admin={admin === "1"} />;
}

// Cache Components exige leer params/searchParams dentro de <Suspense>.
export default function Page(props: PageProps<"/[city]">) {
  return (
    <Suspense fallback={null}>
      <CityRoute {...props} />
    </Suspense>
  );
}
