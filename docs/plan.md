# polar-ts — Implementation Plan

Phased delivery, each phase ending in a deployable static build. GitHub Actions
publishes `dist/` via rsync over SSH to `polar/` for production and `polar-qa/`
for QA.
See [architecture.md](./architecture.md) for the design this plan implements.

## Phase 0 — Scaffold

Vite + TS + Pixi + bitecs, ESLint/Prettier/Vitest, CI with static deployment via
rsync over SSH, one sprite on screen, pointer input working on mobile.

_Deliverable: empty but deployed app._

## Phase 1 — Walking demo (smallest executable game)

Tiled island map, tile rendering + continuous collision, player sprite with
idle/walk animation, hold-to-move steering toward the touch point, a panning
follow camera, and mobile viewport. Movement stops at obstacles and impassable
ground; the player steers around them manually. Includes dev previewer panel #1
(animation preview) since asset iteration starts here.

_Deliverable: walk around an island on your phone._

See [Phase 1 deliverable tasks](./phase-1.md) for the implementation sequence,
dependencies, and acceptance criteria. Each task should be a separate reviewable
change that keeps the static build deployable.

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

## Phase 6 — Combat: the persuasion system

Turn-based debate encounters, per [combat.md](./combat.md): party recruits,
self-esteem/anger/composure stats, persuade/reassure/tactic/memento actions,
mindset affinities with a deduction layer, turn-queue order, and a DOM-overlay
battle UI that leans on the dialogue/popup machinery. All moves, mindsets,
affinity multipliers, and penguin personalities are data-driven JSON under
`assets/data/`.

## Phase 7 — Economy

Ports with markets, price engine, trading UI, stock drift over time; previewer
panel #4 (economy sandbox).

## Phase 8 — Polish

Audio (Howler), weather/wind time-variation, save/load, PWA hardening,
performance pass (sprite batching, chunk culling).

## Phasing principle

Phases 1–2 are deliberately thin vertical slices; every later phase only _adds_
systems, components, and data files without restructuring — the ECS +
fixed-order system pipeline is what guarantees progressive enhancement stays
cheap. Combat (Phase 6) follows the same rule: a new, additive ECS system file
plus JSON data, respecting the fixed system execution order.
