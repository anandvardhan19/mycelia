import type { Person, Relationship } from "../types";

export interface LaidOutNode {
  id: string;
  x: number;
  y: number;
  level: number;
  cluster: number;
}

/** Pairwise connector: spouses, or siblings with no recorded shared parent. */
export interface LaidOutEdge {
  id: string;
  type: Relationship["type"];
  note?: string;
  a: LaidOutNode;
  b: LaidOutNode;
  seed: number;
}

/** A parent-child family group: one or two parents, a marriage line, and a sibling bus down to children. */
export interface FamilyBus {
  id: string;
  parentIds: string[];
  childIds: string[];
  parentPositions: { id: string; x: number; y: number }[];
  childPositions: { id: string; x: number; y: number }[];
  types: Relationship["type"][];
  seed: number;
}

export interface TreeLayout {
  nodes: Map<string, LaidOutNode>;
  edges: LaidOutEdge[];
  families: FamilyBus[];
  width: number;
  height: number;
  maxLevel: number;
  minX: number;
  maxX: number;
}

const NODE_SPACING_X = 190;
const COUPLE_GAP = 150;
export const LEVEL_SPACING_Y = 220;
const CLUSTER_GAP = 260;

const PARENT_TYPES = new Set<Relationship["type"]>([
  "parent-child",
  "adoptive-parent-child",
  "step-parent-child",
]);

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

const EMPTY_LAYOUT: TreeLayout = {
  nodes: new Map(),
  edges: [],
  families: [],
  width: 0,
  height: 0,
  maxLevel: 0,
  minX: 0,
  maxX: 0,
};

export function computeLayout(people: Person[], relationships: Relationship[]): TreeLayout {
  if (people.length === 0) return EMPTY_LAYOUT;
  try {
    const layout = computeLayoutInner(people, relationships);
    if (layout.nodes.size !== people.length) throw new Error("layout dropped nodes");
    for (const n of layout.nodes.values()) {
      if (!Number.isFinite(n.x) || !Number.isFinite(n.y)) throw new Error("non-finite coordinate");
    }
    return layout;
  } catch {
    return fallbackGridLayout(people);
  }
}

/** Last-resort layout that can never produce NaN or throw — guarantees the canvas is never blank. */
function fallbackGridLayout(people: Person[]): TreeLayout {
  const nodes = new Map<string, LaidOutNode>();
  const perRow = Math.max(1, Math.ceil(Math.sqrt(people.length)));
  people.forEach((p, i) => {
    const col = i % perRow;
    const row = Math.floor(i / perRow);
    nodes.set(p.id, { id: p.id, x: col * NODE_SPACING_X, y: row * LEVEL_SPACING_Y, level: row, cluster: 0 });
  });
  const rows = Math.ceil(people.length / perRow);
  return {
    nodes,
    edges: [],
    families: [],
    width: perRow * NODE_SPACING_X,
    height: rows * LEVEL_SPACING_Y,
    maxLevel: Math.max(0, rows - 1),
    minX: 0,
    maxX: (perRow - 1) * NODE_SPACING_X,
  };
}

function computeLayoutInner(people: Person[], relationships: Relationship[]): TreeLayout {
  const personIds = new Set(people.map((p) => p.id));
  const peopleById = new Map(people.map((p) => [p.id, p]));
  const byCreated = [...people].sort((a, b) => a.createdAt - b.createdAt);

  const parentsOf = new Map<string, Set<string>>();
  const spouseOf = new Map<string, Set<string>>();
  for (const p of people) {
    parentsOf.set(p.id, new Set());
    spouseOf.set(p.id, new Set());
  }

  const validRels = relationships.filter(
    (r) => personIds.has(r.personA) && personIds.has(r.personB) && r.personA !== r.personB
  );

  for (const r of validRels) {
    if (PARENT_TYPES.has(r.type)) {
      parentsOf.get(r.personB)!.add(r.personA);
    } else if (r.type === "spouse") {
      spouseOf.get(r.personA)!.add(r.personB);
      spouseOf.get(r.personB)!.add(r.personA);
    }
  }

  // Connected components (all relationship types) — separates unrelated branches spatially.
  const clusterUF = new UnionFind();
  for (const p of people) clusterUF.find(p.id);
  for (const r of validRels) clusterUF.union(r.personA, r.personB);

  // Peer groups (spouse + sibling) — members must share one generation row.
  const peerUF = new UnionFind();
  for (const p of people) peerUF.find(p.id);
  for (const r of validRels) {
    if (r.type === "spouse" || r.type === "sibling") peerUF.union(r.personA, r.personB);
  }
  const groupOf = new Map<string, string>();
  for (const p of people) groupOf.set(p.id, peerUF.find(p.id));

  // Generation level per peer-group via topological longest-path (cycle-safe).
  const allGroups = new Set(groupOf.values());
  const groupChildren = new Map<string, Set<string>>();
  const groupIndegree = new Map<string, number>();
  for (const g of allGroups) {
    groupChildren.set(g, new Set());
    groupIndegree.set(g, 0);
  }
  for (const r of validRels) {
    if (!PARENT_TYPES.has(r.type)) continue;
    const gp = groupOf.get(r.personA)!;
    const gc = groupOf.get(r.personB)!;
    if (gp === gc) continue;
    const set = groupChildren.get(gp)!;
    if (!set.has(gc)) {
      set.add(gc);
      groupIndegree.set(gc, (groupIndegree.get(gc) ?? 0) + 1);
    }
  }
  const groupMinCreated = new Map<string, number>();
  for (const p of people) {
    const g = groupOf.get(p.id)!;
    groupMinCreated.set(g, Math.min(groupMinCreated.get(g) ?? Infinity, p.createdAt));
  }

  const groupLevel = new Map<string, number>();
  const indegreeRemaining = new Map(groupIndegree);
  const queue = [...allGroups]
    .filter((g) => (groupIndegree.get(g) ?? 0) === 0)
    .sort((a, b) => groupMinCreated.get(a)! - groupMinCreated.get(b)!);
  const processed = new Set<string>();
  let qi = 0;
  let guard = 0;
  const guardLimit = allGroups.size * 4 + 10;
  while (qi < queue.length && guard < guardLimit) {
    guard++;
    const g = queue[qi++];
    if (processed.has(g)) continue;
    processed.add(g);
    if (!groupLevel.has(g)) groupLevel.set(g, 0);
    for (const child of groupChildren.get(g) ?? []) {
      const candidate = (groupLevel.get(g) ?? 0) + 1;
      if ((groupLevel.get(child) ?? -1) < candidate) groupLevel.set(child, candidate);
      const remaining = (indegreeRemaining.get(child) ?? 0) - 1;
      indegreeRemaining.set(child, remaining);
      if (remaining <= 0 && !processed.has(child)) queue.push(child);
    }
  }
  // Any groups left unprocessed indicate a relationship cycle in the data; break it deterministically.
  const leftover = [...allGroups]
    .filter((g) => !processed.has(g))
    .sort((a, b) => groupMinCreated.get(a)! - groupMinCreated.get(b)!);
  let cycleLevel = 1 + [...groupLevel.values()].reduce((m, v) => Math.max(m, v), 0);
  for (const g of leftover) {
    groupLevel.set(g, cycleLevel++);
  }

  const level = new Map<string, number>();
  for (const p of people) level.set(p.id, groupLevel.get(groupOf.get(p.id)!) ?? 0);

  // Family units: children grouped by their exact set of recorded parents.
  interface FamilyUnitInternal {
    parentIds: string[];
    childIds: string[];
    types: Relationship["type"][];
  }
  const relTypeForPair = new Map<string, Relationship["type"]>();
  for (const r of validRels) {
    if (PARENT_TYPES.has(r.type)) relTypeForPair.set(`${r.personA}|${r.personB}`, r.type);
  }
  const familyByKey = new Map<string, FamilyUnitInternal>();
  for (const p of byCreated) {
    const parentIds = [...(parentsOf.get(p.id) ?? [])].sort();
    if (parentIds.length === 0) continue;
    const key = parentIds.join("|");
    if (!familyByKey.has(key)) familyByKey.set(key, { parentIds, childIds: [], types: [] });
    familyByKey.get(key)!.childIds.push(p.id);
  }
  for (const fam of familyByKey.values()) {
    for (const c of fam.childIds) {
      for (const par of fam.parentIds) {
        const t = relTypeForPair.get(`${par}|${c}`);
        if (t) fam.types.push(t);
      }
    }
  }

  // Cluster ordering (stable, by earliest-created member).
  const clusterRootOf = new Map<string, string>();
  for (const p of people) clusterRootOf.set(p.id, clusterUF.find(p.id));
  const clusterMinCreated = new Map<string, number>();
  for (const p of people) {
    const root = clusterRootOf.get(p.id)!;
    clusterMinCreated.set(root, Math.min(clusterMinCreated.get(root) ?? Infinity, p.createdAt));
  }
  const sortedClusterRoots = [...clusterMinCreated.keys()].sort(
    (a, b) => clusterMinCreated.get(a)! - clusterMinCreated.get(b)!
  );
  const clusterIndexOf = new Map<string, number>();
  sortedClusterRoots.forEach((root, i) => clusterIndexOf.set(root, i));
  const clusterOf = (id: string) => clusterIndexOf.get(clusterRootOf.get(id)!) ?? 0;

  // Pair up spouses for horizontal placement (a person with multiple spouse edges is paired with just one).
  const pairedWith = new Map<string, string>();
  {
    const usedInPair = new Set<string>();
    for (const p of byCreated) {
      if (usedInPair.has(p.id)) continue;
      const candidates = [...(spouseOf.get(p.id) ?? [])]
        .filter((s) => !usedInPair.has(s))
        .sort((a, b) => (peopleById.get(a)?.createdAt ?? 0) - (peopleById.get(b)?.createdAt ?? 0));
      if (candidates.length > 0) {
        const partner = candidates[0];
        pairedWith.set(p.id, partner);
        pairedWith.set(partner, p.id);
        usedInPair.add(p.id);
        usedInPair.add(partner);
      }
    }
  }

  // Horizontal placement: per cluster, per level (low to high), place couples/solos left-to-right,
  // centered under their parents' average position where known, never overlapping a prior unit.
  const xPos = new Map<string, number>();
  const clusterLocalMinX = new Map<number, number>();
  const clusterLocalMaxX = new Map<number, number>();

  for (const root of sortedClusterRoots) {
    const cIdx = clusterIndexOf.get(root)!;
    const clusterPeople = byCreated.filter((p) => clusterRootOf.get(p.id) === root);
    const levelsInCluster = [...new Set(clusterPeople.map((p) => level.get(p.id)!))].sort((a, b) => a - b);

    let localMin = Infinity;
    let localMax = -Infinity;

    for (const lvl of levelsInCluster) {
      const peopleAtLevel = clusterPeople.filter((p) => level.get(p.id) === lvl).map((p) => p.id);
      const consumed = new Set<string>();
      const units: { members: string[]; desired: number; minCreated: number }[] = [];

      for (const id of peopleAtLevel) {
        if (consumed.has(id)) continue;
        const partner = pairedWith.get(id);
        let members: string[];
        if (partner && peopleAtLevel.includes(partner) && !consumed.has(partner)) {
          members = [id, partner].sort(
            (a, b) => (peopleById.get(a)!.createdAt ?? 0) - (peopleById.get(b)!.createdAt ?? 0)
          );
        } else {
          members = [id];
        }
        members.forEach((m) => consumed.add(m));

        let sum = 0;
        let count = 0;
        for (const m of members) {
          for (const par of parentsOf.get(m) ?? []) {
            if (xPos.has(par)) {
              sum += xPos.get(par)!;
              count++;
            }
          }
        }
        const desired = count > 0 ? sum / count : Number.NaN;
        const minCreated = Math.min(...members.map((m) => peopleById.get(m)!.createdAt));
        units.push({ members, desired, minCreated });
      }

      units.sort((a, b) => {
        const aKnown = Number.isFinite(a.desired);
        const bKnown = Number.isFinite(b.desired);
        if (aKnown && bKnown) return a.desired - b.desired || a.minCreated - b.minCreated;
        if (aKnown !== bKnown) return aKnown ? -1 : 1;
        return a.minCreated - b.minCreated;
      });

      let cursorRight = -Infinity;
      for (const unit of units) {
        const half = unit.members.length === 2 ? COUPLE_GAP / 2 + 40 : 40;
        const naturalCenter = Number.isFinite(unit.desired) ? unit.desired : cursorRight === -Infinity ? 0 : cursorRight + NODE_SPACING_X / 2 + half;
        const center =
          cursorRight === -Infinity
            ? naturalCenter
            : Math.max(naturalCenter, cursorRight + NODE_SPACING_X / 2 + half);

        if (unit.members.length === 2) {
          xPos.set(unit.members[0], center - COUPLE_GAP / 2);
          xPos.set(unit.members[1], center + COUPLE_GAP / 2);
        } else {
          xPos.set(unit.members[0], center);
        }
        cursorRight = center + half;
        localMin = Math.min(localMin, center - half);
        localMax = Math.max(localMax, center + half);
      }
    }

    clusterLocalMinX.set(cIdx, Number.isFinite(localMin) ? localMin : 0);
    clusterLocalMaxX.set(cIdx, Number.isFinite(localMax) ? localMax : 0);
  }

  let cursorGlobal = 0;
  const clusterGlobalOffset = new Map<number, number>();
  for (const root of sortedClusterRoots) {
    const cIdx = clusterIndexOf.get(root)!;
    const localMin = clusterLocalMinX.get(cIdx) ?? 0;
    const localMax = clusterLocalMaxX.get(cIdx) ?? 0;
    clusterGlobalOffset.set(cIdx, cursorGlobal - localMin);
    cursorGlobal += localMax - localMin + CLUSTER_GAP;
  }

  const nodes = new Map<string, LaidOutNode>();
  let maxLevel = 0;
  let minX = Infinity;
  let maxX = -Infinity;
  for (const p of people) {
    const cIdx = clusterOf(p.id);
    const lvl = level.get(p.id) ?? 0;
    maxLevel = Math.max(maxLevel, lvl);
    const rawX = xPos.get(p.id) ?? 0;
    const x = rawX + (clusterGlobalOffset.get(cIdx) ?? 0);
    const y = lvl * LEVEL_SPACING_Y;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    nodes.set(p.id, { id: p.id, x, y, level: lvl, cluster: cIdx });
  }

  const hasSharedParent = (a: string, b: string) => {
    const pa = parentsOf.get(a) ?? new Set();
    const pb = parentsOf.get(b) ?? new Set();
    for (const x of pa) if (pb.has(x)) return true;
    return false;
  };

  const edges: LaidOutEdge[] = [];
  let seedCounter = 0;
  const seenSpousePairs = new Set<string>();
  for (const r of validRels) {
    if (r.type === "spouse") {
      const key = [r.personA, r.personB].sort().join("|");
      if (seenSpousePairs.has(key) || familyByKey.has(key)) continue;
      seenSpousePairs.add(key);
      const a = nodes.get(r.personA);
      const b = nodes.get(r.personB);
      if (a && b) edges.push({ id: r.id, type: r.type, note: r.note, a, b, seed: seedCounter++ });
    } else if (r.type === "sibling" && !hasSharedParent(r.personA, r.personB)) {
      const a = nodes.get(r.personA);
      const b = nodes.get(r.personB);
      if (a && b) edges.push({ id: r.id, type: r.type, note: r.note, a, b, seed: seedCounter++ });
    }
  }

  const families: FamilyBus[] = [];
  let famSeed = 0;
  for (const [key, fam] of familyByKey) {
    const parentPositions = fam.parentIds
      .map((id) => nodes.get(id))
      .filter((n): n is LaidOutNode => !!n)
      .map((n) => ({ id: n.id, x: n.x, y: n.y }));
    const childPositions = fam.childIds
      .map((id) => nodes.get(id))
      .filter((n): n is LaidOutNode => !!n)
      .map((n) => ({ id: n.id, x: n.x, y: n.y }));
    if (parentPositions.length === 0 || childPositions.length === 0) continue;
    families.push({
      id: key,
      parentIds: fam.parentIds,
      childIds: fam.childIds,
      parentPositions,
      childPositions,
      types: fam.types,
      seed: famSeed++,
    });
  }

  return {
    nodes,
    edges,
    families,
    width: cursorGlobal,
    height: (maxLevel + 1) * LEVEL_SPACING_Y,
    maxLevel,
    minX: Number.isFinite(minX) ? minX : 0,
    maxX: Number.isFinite(maxX) ? maxX : 0,
  };
}
