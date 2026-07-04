# dnd-campaign-api — Roadmap

## Vision

An AI-assisted platform for building D&D adventures in the format of the
classic keyed modules (*Against the Giants*, *Temple of Elemental Evil*):
numbered areas and sub-areas, read-aloud text, keyed encounters, maps,
NPCs, monsters, lore, and treasure — authored with AI assistance, not
generated wholesale by it.

Two consumers of that content, in order of when they're built:

1. **Solo playtesting** — the DM plays through their own adventure as a
   single player, using the dialogue harness to talk to the NPCs and
   monsters they've placed, to check pacing, tone, and whether an
   encounter actually plays the way it reads on paper.
2. **Game apps** — the same content, read through a clean API, powering
   an actual player-facing game client (or a VTT integration) later.

The dialogue harness (`npc-harness/`) is the first piece built, and it's
deliberately scoped narrow: relationship state, skill checks, objectives,
inventory, persistence. It is **not** where adventure-authoring features
belong. Each new content type gets its own sub-project, reusing the
def/state CRUD pattern `npc-harness/server/store.js` already established
(validated slug keys, PUT/DELETE/GET route trio) rather than growing
inside the harness.

## Content model

An **Adventure** is the top-level container. Everything else hangs off it:

- **Areas** — the numbered/keyed locations from the classic module format.
  Hierarchical (areas contain sub-areas), each with a description,
  read-aloud text, keyed features, and connections to other areas.
- **Maps** — image assets, associated with areas.
- **Monsters** — SRD reference (done, read-only, see `npc-harness`'s
  "Monster stat blocks" section) + homebrew (not started, full CRUD).
- **NPCs** — already has a CRUD start (`npc-harness`'s PC/NPC manager
  pattern); needs extending to attach a monster/homebrew stat block and to
  belong to a specific area/adventure rather than existing standalone.
- **Lore** — world-building entries: factions, deities, history, rumors.
- **Items** — custom weapons, armor, magic items, treasure.
- **Character options** — custom classes, backgrounds, races, for players
  building characters for a specific adventure.

## Phases

**Phase 0 — Dialogue harness (done)**
Relationship state, DC-tiered skill checks, objectives/triggers,
inventory, persistence, provider-agnostic LLM layer, PC management CRUD,
SRD monster reference data. Lives in `npc-harness/`.

**Phase 1 — Creature compendium (partly done)**
SRD data: done. Homebrew creature CRUD: not started. Reuses the existing
def/state store pattern directly.

**Phase 2 — Adventure content model (not started)**
Areas/sub-areas (the actual dungeon-key structure), maps, lore. This is
the biggest net-new data model — nothing so far has represented a
*place*, only NPCs and their relationships.

**Phase 3 — Items & character options (not started)**
Custom items, classes, backgrounds, races. Likely the most mechanically
complex CRUD (interacting with existing rules text), lowest urgency.

**Phase 4 — AI-assisted authoring (not started)**
Tools that help *draft* content in the classic module voice — area
descriptions, keyed encounter suggestions, lore hooks — reviewed and
edited by the author, not auto-generated wholesale. This is where "AI
assistance" actually shows up for the DM, as opposed to phases 0-3 which
are the data model it needs to stand on.

**Phase 5 — Playtesting integration (not started)**
Connect the dialogue harness to real adventure content — playtesting an
NPC means playtesting *this NPC, in this area, in this adventure*, not a
standalone character disconnected from the module.

**Phase 6 — Game app / external consumption (not started)**
A clean read API over the finished adventure content, for an actual
player-facing client or VTT integration to consume. Everything before
this phase is authoring tooling for the DM; this is the first phase aimed
at players.

## Explicit non-goals (for now)

- A full combat/initiative system — the harness has a combat *trigger*
  banner, not turn-by-turn combat, and that's likely to stay true through
  at least Phase 3.
- Multi-tenancy / real user accounts — everything so far assumes one DM's
  own content. Needed before this is usable by more than one person, but
  not before then.
- Automatic (non-reviewed) content generation — Phase 4 is assisted
  drafting with a human editing pass, not one-click adventure generation.

## Repo structure
dnd-campaign-api/              (repo root)
├── dnd_campaign_manager.py,   (existing Python town generator)
│   app/, ui/, tests/
├── npc-harness/               (Phase 0-1: dialogue engine + SRD monsters)
├── ROADMAP.md                 (this file)
└── (future sub-projects, one per phase, added as they're started —
not scaffolded ahead of time)

CODE
