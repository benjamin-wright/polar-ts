# polar-ts — Implementation Plan

Phased delivery, each phase ending in a deployable build on GitHub Pages.
See [architecture.md](./architecture.md) for the design this plan implements.

## Phase 0 — Scaffold

Vite + TS + Pixi + bitecs, ESLint/Prettier/Vitest, CI → GitHub Pages, one sprite
on screen, pointer input working on mobile.

_Deliverable: empty but deployed app._

## Phase 1 — Walking demo (smallest executable game)

Tiled island map, tile rendering + collision, player sprite with idle/walk
animation, tap-to-walk with A*, follow camera, mobile viewport. Includes dev
previewer panel #1 (animation preview) since asset iteration starts here.

_Deliverable: walk around an island on your phone._

## Phase 2 — Sailing

Wind/current fields, boat entity, embark/disembark at docks, sail/keel/rudder
force model, touch sailing controls, HUD. Includes previewer panel #3 (force
visualizer) built alongside the model.

## Phase 3 — Sailing consequences

Crash-jibe detection, boat damage/repair, swim mechanics + stamina.

## Phase 4 — People

NPCs on schedules, interaction prompts, dialogue popups with portraits
(JSON-driven).

## Phase 5 — Gathering & inventory

Resource nodes (wood, fish, ore…), inventory UI, crafting-lite if desired.

## Phase 6 — Economy

Ports with markets, price engine, trading UI, stock drift over time; previewer
panel #4 (economy sandbox).

## Phase 7 — Polish

Audio (Howler), weather/wind time-variation, save/load, PWA hardening,
performance pass (sprite batching, chunk culling).

## Phasing principle

Phases 1–2 are deliberately thin vertical slices; every later phase only _adds_
systems, components, and data files without restructuring — the ECS +
fixed-order system pipeline is what guarantees progressive enhancement stays
cheap.
