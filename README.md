# MYCELIA

An installable, offline-first Progressive Web App for building a family tree
organically — add people as you discover or remember them, not in a fixed
top-down order. All data lives on-device; sharing happens by explicit
export/import or an optional live peer-to-peer session.

Named for the mycelial network: a living structure that grows outward node
by node, with no fixed starting shape.

## Features

- Organic SVG tree canvas — pan/zoom, blob-shaped nodes, animated bezier
  connectors colored by relationship type, respecting `prefers-reduced-motion`
- "Budding" animation when a person is added, with the camera following
- Person profile drawer — photo, bio, life-events timeline, relationships
- Unlinked-relatives tray (petri-dish metaphor) for people not yet connected
- Add/edit person, connect-two-people flow (parent-child, spouse, sibling,
  adoptive, step)
- Search by name
- Export/import — whole tree or a single branch, JSON file or Web Share,
  QR code for a single person's card, and a real merge-conflict UI
- **Live session** — optional real-time peer-to-peer sync (Yjs + WebRTC, no
  server) so two devices can grow the same tree together while both stay
  open. Photos are not synced — only the device that added a photo keeps it.
- Installable PWA — manifest, offline service worker, app shortcuts,
  safe-area-aware layout for notches and gesture areas

## Tech stack

React + TypeScript + Vite, Dexie (IndexedDB), Framer Motion, `vite-plugin-pwa`,
Yjs + y-webrtc for live sync.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```
