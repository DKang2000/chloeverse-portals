export const dynamic = "force-dynamic";

import CollabsShell from "@/components/collabs/CollabsShell";
import { parseCollabsRouteQuery } from "./query";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function CollabsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const query = parseCollabsRouteQuery(await searchParams);
  return (
    <CollabsShell routeMode="home" query={query}>
      <div data-collabs-page="landing" className="sr-only" />
    </CollabsShell>
  );
}
