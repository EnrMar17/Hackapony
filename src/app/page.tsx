import { redirect } from "next/navigation";
import { DEFAULT_CITY } from "@/lib/constants";

export default function Home() {
  redirect(`/${DEFAULT_CITY}`);
}
