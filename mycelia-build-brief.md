# MYCELIA — Family Tree PWA — Build Brief

*Named for the mycelial network: a living structure that grows outward
node by node, with no fixed starting shape — exactly how this tree is
meant to be built.*

## 1. Concept

A installable, offline-first Progressive Web App for building a family tree
organically — add people as you discover or remember them, not in a fixed
top-down order. All data lives on-device. Sharing happens via an explicit
export/import step, not a server.

The visual language is biological/microbiological: the tree isn't drawn as a
corporate org chart, it's drawn like a living structure — root systems,
mycelial networks, cell division, branching capillaries. Motion should feel
grown, not animated-for-effect.

## 2. Visual & Animation Direction (biology theme)

**Reference structures to draw from** (pick 1–2 as the dominant metaphor,
don't mix all of them or it reads as random):
- **Root/mycelial network** — thin branching filaments, nodes as swollen
  root nodules. Fits "discovering relatives" framing well — the tree
  visibly grows outward from a root person.
- **Cell division** — a new person node "buds" off an existing one with a
  brief mitosis-style split animation when added.
- **Capillary/vein branching** — pulsing, organic connector lines instead
  of straight edges, using bezier curves with slight animated waver.

**Animation moments** (AI-generated / procedurally generated, not stock
assets):
- Adding a node: growth animation — a thin tendril extends from the parent/
  connection point and a new node "blooms" open.
- Idle state: extremely subtle ambient motion (slow pulse on connector
  lines, like sap or blood flow) — must respect `prefers-reduced-motion`.
- Connecting an orphan node to the tree: the tendril animates from the
  unconnected node to its new parent, visually "grafting" it in.
- Background texture: optional faint generative pattern (cell wall / bark /
  capillary mesh) using SVG or canvas, generated at runtime — no heavy
  image assets, since this needs to work fully offline.

**Palette/type**: carry over the archival tone from the earlier prototype
(parchment, ink, gold) but shift toward a more organic register — deep
moss/forest greens, blood-red or amber for the "living" connector lines,
bone/parchment for card backgrounds. Keep the same serif (Fraunces) for
names to preserve the "record" feeling against the organic motion.

## 3. Data Model

Core principle: **no fixed root, no required top-down structure.** Any
person can be added standalone and connected later.

```
Person {
  id: uuid
  name: string
  photoBlob?: Blob (stored locally, IndexedDB)
  born?: string
  died?: string
  bio?: string
  events: { label: string, date?: string }[]
  createdAt: timestamp
}

Relationship {
  id: uuid
  type: "parent-child" | "spouse" | "sibling" | "adoptive-parent-child" | "step-parent-child"
  personA: Person.id
  personB: Person.id
  note?: string   // e.g. "adopted 1994", "second marriage"
}

Tree {
  rootPersonId?: Person.id   // optional — "orphan" nodes can exist with no root yet
  people: Person[]
  relationships: Relationship[]
}
```

- Any `Person` can exist with zero relationships ("unlinked" — shown in a
  side tray of discovered-but-unconnected relatives).
- Connecting an unlinked person to the tree is just adding a
  `Relationship` — no restructuring required.
- Relationship `type` supports adoption/step-family from the start so it
  doesn't need to be retrofitted later.

## 4. Storage — on-device only

- **IndexedDB** as primary store (via a thin wrapper like `idb` or Dexie)
  for people, relationships, and photo blobs.
- No backend, no account system, no analytics calls.
- Must survive browser storage eviction reasonably well — request
  persistent storage via `navigator.storage.persist()` on first launch and
  explain to the user why (so their data isn't cleared under storage
  pressure).

## 5. Sharing with family (without a server)

Since storage is local-only, sharing needs an explicit export/import flow
rather than live sync. Options to offer, roughly in order of simplicity:

1. **Export/import file** — serialize the whole tree (or a chosen subtree)
   to a single `.json` (or a zipped bundle with photos) file. Recipient
   opens the PWA and imports it. Uses the Web Share API on mobile so it
   drops straight into Messages/WhatsApp/AirDrop/email.
2. **Merge on import** — when importing a file into an existing tree,
   detect overlapping people (by name + birth year, or a stable ID if the
   person originated from the same source tree) and prompt: keep mine /
   keep theirs / keep both as separate nodes to merge later.
3. **QR code for small shares** — for a single person's card or a short
   branch, encode as a QR code for quick in-person sharing without files.
4. *(Later/optional)* Peer-to-peer live sync via WebRTC (e.g. through a
   library like Yjs + y-webrtc) for two people editing the same tree
   collaboratively without a central server — more complex, worth flagging
   as a v2 idea rather than building day one.

Start with (1) and (2). They cover "share with family" without
contradicting the local-only storage requirement.

## 6. Core Features (v1)

- Add a person at any time, with or without a connection to anyone else.
- Connect two existing people with a relationship (parent-child, spouse,
  sibling, adoptive, step), from either person's card.
- Visual tree canvas: pan/zoom, root-network/branching rendering per the
  animation direction above.
- "Unlinked relatives" tray — people added but not yet connected to the
  main tree; drag or tap to graft them in once you know how they connect.
- Person profile drawer: photo, bio, life events timeline (reuse pattern
  from the earlier prototype).
- Search by name.
- Export tree (full or subtree) to a shareable file; import a shared file
  with merge prompts.
- Installable PWA: manifest.json, service worker for offline asset
  caching, works fully with no network connection after first load.

## 7. Tech Stack

- **Framework**: React (Vite) — lightweight, works well with a service
  worker setup via `vite-plugin-pwa`.
- **Storage**: IndexedDB via Dexie.js.
- **Rendering**: SVG for the tree canvas and connector animations
  (matches the earlier prototype's approach); consider `<canvas>` only if
  the ambient background texture needs per-frame procedural drawing.
- **Animation**: CSS + SVG SMIL/CSS keyframes for most motion; Framer
  Motion if more choreography control is needed for the "grafting" and
  "budding" moments.
- **PWA tooling**: `vite-plugin-pwa` for manifest + service worker +
  offline caching, `navigator.storage.persist()` for storage durability.
  App name in `manifest.json`: **MYCELIA**.
- **File export/import**: native File System Access API where available,
  falling back to download/upload for broader browser support; Web Share
  API for the mobile share sheet.

## 8. Open decisions for Claude Code to flag back

- Photo storage size limits — compress on import? Cap resolution?
- Whether "unlinked relatives tray" needs its own visual metaphor (e.g. a
  petri dish / seed tray) distinct from the main root network.
- Exact merge-conflict UX for step 5.2 — needs a simple but clear diff
  view even for non-technical family members.
