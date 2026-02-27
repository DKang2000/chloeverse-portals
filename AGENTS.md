\# AGENTS.md — Chloeverse Portals



\## Tech stack

\- Next.js + TypeScript

\- Use the routing system already used in this repo:

&nbsp; - If app/ exists -> App Router

&nbsp; - If pages/ exists -> Pages Router

\- Prefer existing styling approach (Tailwind / CSS modules / styled-components). Do not introduce a new styling system.



\## Non-negotiables

\- Keep diffs small and high-confidence.

\- Do NOT break the existing site routes.

\- Do not modify src/app/layout.tsx, src/app/page.tsx, or global font configuration unless explicitly asked.

\- Collabs styling/typography must be scoped to src/app/collabs/\*\* only.

\- For Collabs:

&nbsp; 1) Main nav "Collabs" should go to /collabs

&nbsp; 2) /collabs is a new "museum landing" page with title "Collabs" and a CTA to enter the reels page.

&nbsp; 3) Reels page lives at /collabs/reels (or /collabs/work if that matches repo conventions).

&nbsp; 4) The reel embed content must look the same when opened as it does today:

&nbsp;    - reuse the existing embed markup / component for each reel.

&nbsp;    - do not restyle the Instagram embed output.

&nbsp; 5) The old "Collabs section" content (everything except the 5 reels) must NOT render on these new pages.



\## Dev workflow

\- Before making changes, summarize:

&nbsp; - current Collabs implementation (where it lives, route/component)

&nbsp; - which router is used (app vs pages)

\- After changes:

&nbsp; - run the repo’s standard checks (lint/build/test scripts that already exist)

&nbsp; - list files changed

&nbsp; - provide manual QA steps

