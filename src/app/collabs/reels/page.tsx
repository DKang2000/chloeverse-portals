import CollabsShell from "@/components/collabs/CollabsShell";
import { parseCollabsRouteQuery } from "@/app/collabs/query";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function CollabsReelsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const query = parseCollabsRouteQuery(await searchParams);
  return (
    <CollabsShell routeMode="reels" query={query}>
      <div data-collabs-page="reels" className="sr-only" />
    </CollabsShell>
  );
}
