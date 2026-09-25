# AGENTS.md

Guidance for agent sessions working on this repository.

## Before making any changes

**Always read these files first** — they define the architecture and roadmap all
changes must follow:

1. [docs/architecture.md](docs/architecture.md) — game design, technology
   decisions, module layout, and runtime architecture.
2. [docs/plan.md](docs/plan.md) — phased implementation plan; identify which
   phase the current work belongs to.

## Key rules

- Follow the layered dependency direction described in docs/architecture.md
  (`assets → core → ecs → game`, with `render/` and `dev/` at the edges). Game
  logic must never import PixiJS directly; rendering lives in `render/`
  adapters.
- Sailing physics and economy logic must remain pure, testable functions with
  unit tests (Vitest).
- Keep game content data-driven (JSON in `assets/data/`) rather than hard-coding
  it.
- When adding a new game system, add it as a new ECS system file rather than
  modifying unrelated systems, and respect the fixed system execution order.
- Each phase of the plan must remain deployable as a static site; don't break
  the static build or the GitHub Actions deployment via rsync over SSH.
