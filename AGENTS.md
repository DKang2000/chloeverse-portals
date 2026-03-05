# AGENTS.md

## Project
Build a premium cinematic 3D portal landing page in this repo using Codex-only implementation work.

## Primary references
There are 3 distinct references and each must influence a different part of the build:

1. UTSUBO portal experience
   - This is the BEHAVIOR and FEEL reference.
   - The interaction should feel ceremonial, premium, weighty, and intentional.
   - The page should feel like a threshold or ritual, not a game level.
   - The user should feel drawn toward the portal through subtle cursor response, restrained motion, hover energy buildup, and a deliberate click-to-open sequence.
   - No chaotic movement, no playful sandbox energy, no game UI.

2. Bruno Simon / Infinite World
   - This is the ENVIRONMENTAL TECHNIQUE reference only.
   - Borrow only the feeling of:
     - realistic grass sway
     - atmospheric depth
     - fog
     - subtle camera inertia
     - rich sky lighting
     - dusk-to-night progression
   - Do NOT reproduce:
     - free roam
     - player capsule
     - pointer lock
     - WASD movement
     - debug panels
     - HUD
     - infinite traversal
   - Re-implement the techniques in this codebase instead of cloning the product experience.

3. The uploaded Suzume-style reference image
   - This is the ART DIRECTION / COMPOSITION reference.
   - Match:
     - lonely centered doorway in a meadow
     - large sky presence
     - distant mountain silhouettes
     - cool dusk-to-night palette
     - warm or white portal contrast
     - romantic cinematic atmosphere
     - sense of quiet scale
   - Do NOT use the reference image as a flat backdrop.
   - Build the scene in actual 3D.

## Door asset direction
Use the uploaded textured door GLB as the base hero asset.
Also keep the source GLB in the repo for reference.

The door must remain WHITE.
Not blue.

The white door should be:
- weathered chapel white
- premium and cinematic
- aged painted wood
- subtle wear on edges
- visible material richness
- not sterile flat white
- not cheap glossy white

Asset work required:
- split mesh into:
  - frame
  - door leaf
  - handle/latch
- set proper hinge pivot
- optimize geometry
- keep silhouette quality
- preserve hero-asset fidelity

## Scene direction
Create a single authored cinematic portal scene.
This is not an explorable world.

Composition:
- camera locked to a premium hero composition
- door centered slightly low in frame
- large sky area
- meadow foreground
- blue/lilac flower accents
- distant mountain silhouettes
- low valley fog
- strong depth layering

Lighting:
- scene begins at dusk
- transitions quickly toward night
- cool exterior palette
- bright white portal light behind the door
- the door silhouette must remain readable against the portal light

## Interaction direction
The behavior should feel closest to UTSUBO, translated into this door scene.

Required interaction behavior:
- very subtle cursor parallax
- no orbit controls
- no free-look
- no free movement
- hover on the door slightly intensifies portal energy
- click opens the door slowly and heavily
- white light spills outward first
- then a slow engulf effect overtakes the camera
- leave a route transition hook for future navigation into collabs/reels

The interaction should feel:
- sacred
- premium
- restrained
- cinematic
- inevitable

Not:
- game-like
- twitchy
- flashy
- noisy
- over-animated

## Audio
Music file will be added later.
Wire the implementation so audio can be attached without architectural changes.
Do not block the build waiting for final audio.

## Technical direction
Prefer working inside the existing repo stack.
If a React-based 3D setup is needed, use:
- three
- @react-three/fiber
- @react-three/drei
- postprocessing
- gsap only if useful

No unnecessary abstraction.
No debug UI in final output.

## Asset tooling
If asset cleanup is needed, create code-driven tooling under:
- tools/blender/
- scripts/

Include Blender Python scripts when useful for:
- inspecting mesh structure
- separating door parts
- fixing pivots
- optimizing/exporting cleaned assets

Do not handwave asset operations.
Check scripts into the repo.

## File structure target
src/
  components/portal/
    PortalScene.tsx
    Door.tsx
    PortalLight.tsx
    Meadow.tsx
    Mountains.tsx
    SkyDuskNight.tsx
    FogLayer.tsx
    CursorController.tsx
  hooks/
    usePortalScene.ts
    useAudioGate.ts
  lib/
    animationTimeline.ts
    loadDoorModel.ts
  shaders/
    grassVertex.glsl
    grassFragment.glsl
    portalVertex.glsl
    portalFragment.glsl

tools/
  blender/
    inspect_door.py
    split_optimize_door.py

public/
  assets/
    door/
      door-textured.glb
      door-source.glb
    reference/
      portal-vibe.jpg

## Timing targets
- scene reads immediately on load
- dusk transitions toward night over about 4 to 6 seconds
- hover response is soft and fast
- door opening feels weighty, about 1.2 to 1.8 seconds
- white engulf lasts about 2 to 3 seconds

## Non-negotiables
- door stays white
- final feel must be closer to UTSUBO than to a game demo
- Infinite World is a technique reference, not a product clone
- scene must be real-time 3D, not a flat image composition
- no capsule
- no infinite traversal
- no free-roam controls
- keep implementation isolated to the intended preview/landing route
- leave a transition placeholder after the white wash

## Done means
A premium full-screen portal landing page that:
- loads into a cinematic meadow at dusk
- fades into night
- presents a hero white door with strong material quality
- has subtle premium cursor interaction
- responds to hover
- opens on click
- emits portal light and bloom
- engulfs the camera in white
- leaves a clean hook for future transition
- passes lint/typecheck/build