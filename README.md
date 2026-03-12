# Chloeverse Portals

`chloeverse-portals` is the codebase behind [chloeverse.io](https://chloeverse.io), Chloe Kang's multi-scene portal website.

This is not a default Next.js starter. The site is a stylized portfolio / creator-world that splits Chloe's brand, work, collaborations, and media kit into distinct interactive experiences.

## Live Site Structure

### `/`

The homepage is a cinematic landing screen with:

- the animated "The Chloeverse" title
- a typed tagline: `where storytelling meets tomorrow`
- ambient audio
- click-to-reveal portal navigation
- links to `Projects`, `Collabs`, `Work`, `Contact`, and `Mediacard`

### `/projects`

The projects route opens as a Windows-style desktop environment.

- creator-tool icons are staged like a desktop workspace
- the Instagram icon is the main entry point
- double-clicking it opens a reels-style project showcase
- the page works more like a themed content portal than a conventional gallery

### `/collabs`

The collabs route is an immersive portal scene.

- it loads a full-screen 3D / iframe world
- visitors click and drag to look around
- entering the door continues deeper into the collabs experience
- soundtrack controls sit on top of the scene

### `/collabs/reels`

This route presents collaborations as a curated reels / showcase flow inside the collabs shell.

### `/work`

The work route is a retro-computer / terminal-style career page.

The live experience presents Chloe's background across creator, startup, marketing, and brand work, including current and recent roles such as:

- stealth startup founder
- Adobe AI Search contract work
- Instagram creator growth
- Single Origin Studios
- Outsmart
- Soluna
- Headspace

### `/contact`

The contact route is a canvas-driven "contact mission" sequence.

- it plays like a small interactive cutscene
- the experience resolves into a clickable contact card
- visitors can open email, copy email, open socials, return to the portal hub, or jump back to the candy castle

### `/mediacard`

The media card is a dedicated creator-facing brand page with an interactive globe UI.

Current sections include:

- audience markets: United States, Canada, Australia, South Korea
- metrics: Instagram, TikTok, monthly views, engagement
- services / rates
- noteworthy collaborations: Adobe, Adidas, Estee Lauder, OpenAI

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Framer Motion
- Three.js / React Three Fiber
- custom canvas and iframe-based interactive scenes

## Local Development

```bash
npm install
npm run dev
```

Useful commands:

```bash
npm run lint
npm run typecheck
npm run build
```

## Important Project Areas

- `src/app/page.tsx`: homepage entry
- `src/app/projects/page.tsx`: Windows desktop to reels transition
- `src/app/collabs/`: collabs portal routes
- `src/app/work/page.tsx`: retro work iframe entry
- `src/app/contact/page.tsx`: contact mission entry
- `src/app/mediacard/page.tsx`: media card page
- `src/components/home/`: landing experience
- `src/components/contact/`: contact mission canvas implementation
- `src/components/mediacard/`: globe + media kit UI
- `src/routes/`: immersive collabs route wrappers

## Repo Purpose

This repo powers the portal side of Chloe's web presence: the branded destination pages that sit behind the candy-castle hub on `imchloekang.com`.
