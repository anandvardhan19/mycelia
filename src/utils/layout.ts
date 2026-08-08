import type { Person, Relationship } from "../types";

export interface LaidOutNode {
  id: string;
  x: number;
  y: number;
  level: number;
  cluster: number;
}

export interface LaidOutEdge {
  id: string;
  type: Relationship["type"];
  note?: string;
  a: LaidOutNode;
  b: LaidOutNode;
  seed: number;
}

export interface TreeLayout {
  nodes: Map<string, LaidOutNode>;
  edges: LaidOutEdge[];
  width: number;
  height: number;
  maxLevel: number;
  minX: number;
  maxX: number;
}

const NODE_SPACING_X = 190;
export const LEVEL_SPACING_Y = 220;
const CLUSTER_GAP = 260;

const isParentEdge = (t: Relationship["type"]) =>
  t === "parent-child" || t === "adoptive-parent-child" || t === "step-parent-child";
const isPeerEdge = (t: Relationship["type"]) => t === "spouse" || t === "sibling";

class UnionFind {
  parent = new Map<string, string>();
  find(x: string): string {
    if (!this.parent.has(x)) this.parent.set(x, x);
    let root = x;
    while (this.parent.get(root) !== root) root = this.parent.get(root)!;
    let cur = x;
    while (this.parent.get(cur) !== root) {
      const next = this.parent.get(cur)!;
      this.parent.set(cur, root);
      cur = next;
    }
    return root;
  }
  union(a: string, b: string) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(ra, rb);
  }
}

export function computeLayout(people: Person[], relationships: Relationship[]): TreeLayout {
  const nodes = new Map<string, LaidOutNode>();
  if (people.length === 0)
    return { nodes, edges: [], width: 0, height: 0, maxLevel: 0, minX: 0, maxX: 0 };

  const uf = new UnionFind();
  for (const p of people) uf.find(p.id);
  for (const r of relationships) {
    if (nodes.has(r.personA) || people.some((p) => p.id === r.personA)) {
      uf.union(r.personA, r.personB);
    }
  }

  const parents = new Map<string, Set<string>>();
  const children = new Map<string, Set<string>>();
  const peers = new Map<string, Set<string>>();
  for (const p of people) {
    parents.set(p.id, new Set());
    children.set(p.id, new Set());
    peers.set(p.id, new Set());
  }
  for (const r of relationships) {
    if (isParentEdge(r.type)) {
      children.get(r.personA)?.add(r.personB);
      parents.get(r.personB)?.add(r.personA);
    } else if (isPeerEdge(r.type)) {
      peers.get(r.personA)?.add(r.personB);
      peers.get(r.personB)?.add(r.personA);
    }
  }

  const clusterRoots = new Map<string, string>();
  let clusterIndex = 0;
  const clusterId = new Map<string, number>();
  for (const p of people) {
    const root = uf.find(p.id);
    if (!clusterRoots.has(root)) {
      clusterRoots.set(root, root);
      clusterId.set(root, clusterIndex++);
    }
  }
  const getCluster = (id: string) => clusterId.get(uf.find(id))!;

  const level = new Map<string, number>();
  const byCreated = [...people].sort((a, b) => a.createdAt - b.createdAt);
  const seeds = byCreated.filter((p) => (parents.get(p.id)?.size ?? 0) === 0);
  const seedIds = new Set(seeds.map((p) => p.id));
  for (const p of byCreated) if (!seedIds.has(p.id) && (parents.get(p.id)?.size ?? 0) === 0) seedIds.add(p.id);

  for (const p of byCreated) {
    if ((parents.get(p.id)?.size ?? 0) === 0) level.set(p.id, 0);
  }

  let changed = true;
  let guard = 0;
  while (changed && guard < people.length + 5) {
    changed = false;
    guard++;
    for (const p of byCreated) {
      const parentIds = parents.get(p.id) ?? new Set();
      if (parentIds.size > 0) {
        let maxParentLevel = -1;
        let allKnown = true;
        for (const par of parentIds) {
          if (level.has(par)) maxParentLevel = Math.max(maxParentLevel, level.get(par)!);
          else allKnown = false;
        }
        const target = allKnown ? maxParentLevel + 1 : maxParentLevel + 1;
        if (maxParentLevel >= 0 && level.get(p.id) !== target) {
          level.set(p.id, target);
          changed = true;
        }
      }
      if (!level.has(p.id)) {
        level.set(p.id, 0);
      }
    }
    for (const p of byCreated) {
      const peerIds = peers.get(p.id) ?? new Set();
      for (const peer of peerIds) {
        const lp = level.get(p.id);
        const lo = level.get(peer);
        if (lp === undefined || lo === undefined) continue;
        if (lp !== lo) {
          const target = Math.max(lp, lo);
          if (level.get(p.id) !== target) {
            level.set(p.id, target);
            changed = true;
          }
          if (level.get(peer) !== target) {
            level.set(peer, target);
            changed = true;
          }
        }
      }
    }
  }

  const levelBuckets = new Map<string, Map<number, string[]>>();
  for (const p of byCreated) {
    const c = getCluster(p.id);
    const key = String(c);
    if (!levelBuckets.has(key)) levelBuckets.set(key, new Map());
    const bucket = levelBuckets.get(key)!;
    const lvl = level.get(p.id) ?? 0;
    if (!bucket.has(lvl)) bucket.set(lvl, []);
    bucket.get(lvl)!.push(p.id);
  }

  const xPos = new Map<string, number>();
  const clusterWidths = new Map<string, number>();

  const sortedClusterKeys = [...levelBuckets.keys()].sort((a, b) => Number(a) - Number(b));

  for (const key of sortedClusterKeys) {
    const bucket = levelBuckets.get(key)!;
    const levels = [...bucket.keys()].sort((a, b) => a - b);
    let maxWidth = 0;

    for (const lvl of levels) {
      const ids = bucket.get(lvl)!;
      if (lvl === levels[0]) {
        ids.sort((a, b) => {
          const pa = people.find((p) => p.id === a)!;
          const pb = people.find((p) => p.id === b)!;
          return pa.createdAt - pb.createdAt;
        });
      } else {
        ids.sort((a, b) => {
          const pa = parents.get(a) ?? new Set();
          const pb = parents.get(b) ?? new Set();
          const avg = (s: Set<string>) => {
            const vals = [...s].map((id) => xPos.get(id) ?? 0);
            return vals.length ? vals.reduce((s2, v) => s2 + v, 0) / vals.length : 0;
          };
          return avg(pa) - avg(pb);
        });
      }
      const width = (ids.length - 1) * NODE_SPACING_X;
      maxWidth = Math.max(maxWidth, width);
      ids.forEach((id, i) => {
        xPos.set(id, i * NODE_SPACING_X - width / 2);
      });
    }
    clusterWidths.set(key, maxWidth);
  }

  let cursorX = 0;
  const clusterOffsetX = new Map<string, number>();
  for (const key of sortedClusterKeys) {
    const width = clusterWidths.get(key) ?? 0;
    clusterOffsetX.set(key, cursorX + width / 2);
    cursorX += width + CLUSTER_GAP;
  }

  let maxLevel = 0;
  let minX = Infinity;
  let maxX = -Infinity;
  for (const p of byCreated) {
    const c = getCluster(p.id);
    const lvl = level.get(p.id) ?? 0;
    maxLevel = Math.max(maxLevel, lvl);
    const offset = clusterOffsetX.get(String(c)) ?? 0;
    const x = (xPos.get(p.id) ?? 0) + offset;
    const y = lvl * LEVEL_SPACING_Y;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    nodes.set(p.id, { id: p.id, x, y, level: lvl, cluster: c });
  }

  const edges: LaidOutEdge[] = [];
  let seedCounter = 0;
  for (const r of relationships) {
    const a = nodes.get(r.personA);
    const b = nodes.get(r.personB);
    if (!a || !b) continue;
    edges.push({ id: r.id, type: r.type, note: r.note, a, b, seed: seedCounter++ });
  }

  const totalWidth = cursorX;
  const totalHeight = (maxLevel + 1) * LEVEL_SPACING_Y;

  return {
    nodes,
    edges,
    width: totalWidth,
    height: totalHeight,
    maxLevel,
    minX: Number.isFinite(minX) ? minX : 0,
    maxX: Number.isFinite(maxX) ? maxX : 0,
  };
}
