export const dynamic = "force-dynamic";

import CollabsShell from "@/components/collabs/CollabsShell";
export default function CollabsPage() {
  return (
    <CollabsShell routeMode="home">
      <div data-collabs-page="landing" className="sr-only" />
    </CollabsShell>
  );
}
