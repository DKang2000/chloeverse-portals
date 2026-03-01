export type CollabsPointerOverride = { x: number; y: number } | null;

export type CollabsRouteQuery = {
  smokeMode: boolean;
  smokeAction: string | null;
  benchMode: boolean;
  noPost: boolean;
  noFx: boolean;
  refMode: boolean;
  fxMode: "soft" | "none";
  debugMode: boolean;
  pointerOverride: CollabsPointerOverride;
};

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return typeof value === "string" ? value : "";
}

function parsePointer(raw: string): CollabsPointerOverride {
  const [xRaw, yRaw] = raw.split(",");
  const x = Number(xRaw);
  const y = Number(yRaw);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return {
    x: Math.max(0, Math.min(1, x)),
    y: Math.max(0, Math.min(1, y)),
  };
}

export function parseCollabsRouteQuery(sp: SearchParams): CollabsRouteQuery {
  const rawBench = first(sp.__collabsBench);
  const benchMode = rawBench === "1";
  const rawPointer = first(sp.__p);
  const pointerOverride = rawPointer ? parsePointer(rawPointer) : null;
  const fxRaw = first(sp.__collabsFx);

  return {
    smokeMode: first(sp.__collabsSmoke) === "1",
    smokeAction: first(sp.__action) || null,
    benchMode,
    noPost: first(sp.__collabsNoPost) === "1",
    noFx: first(sp.__collabsNoFx) === "1",
    refMode: first(sp.__collabsRef) === "1",
    fxMode: fxRaw === "none" ? "none" : "soft",
    debugMode: first(sp.__collabsDebug) === "1",
    pointerOverride,
  };
}

