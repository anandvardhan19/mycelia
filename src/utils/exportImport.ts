import { v4 as uuid } from "uuid";
import { db } from "../db/db";
import { emitChange } from "../sync/changeBus";
import type { ExportBundle, Person, Relationship, RelationshipType } from "../types";
import { blobToDataUrl, dataUrlToBlob } from "./blobData";

export function getConnectedCluster(
  personId: string,
  people: Person[],
  relationships: Relationship[]
): Set<string> {
  const adjacency = new Map<string, Set<string>>();
  for (const p of people) adjacency.set(p.id, new Set());
  for (const r of relationships) {
    adjacency.get(r.personA)?.add(r.personB);
    adjacency.get(r.personB)?.add(r.personA);
  }
  const visited = new Set<string>([personId]);
  const queue = [personId];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const n of adjacency.get(cur) ?? []) {
      if (!visited.has(n)) {
        visited.add(n);
        queue.push(n);
      }
    }
  }
  return visited;
}

export async function buildExportBundle(
  people: Person[],
  relationships: Relationship[],
  scopeIds?: Set<string>
): Promise<ExportBundle> {
  const scopedPeople = scopeIds ? people.filter((p) => scopeIds.has(p.id)) : people;
  const scopedPeopleIds = new Set(scopedPeople.map((p) => p.id));
  const scopedRelationships = relationships.filter(
    (r) => scopedPeopleIds.has(r.personA) && scopedPeopleIds.has(r.personB)
  );

  const peopleOut = await Promise.all(
    scopedPeople.map(async (p) => {
      const { photoBlob, ...rest } = p;
      const photoDataUrl = photoBlob ? await blobToDataUrl(photoBlob) : undefined;
      return { ...rest, photoDataUrl };
    })
  );

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    people: peopleOut,
    relationships: scopedRelationships,
  };
}

export function downloadBundle(bundle: ExportBundle, filename: string) {
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export async function shareBundle(bundle: ExportBundle, filename: string): Promise<boolean> {
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
  const file = new File([blob], filename, { type: "application/json" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "MYCELIA family tree" });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

export interface ImportConflict {
  incoming: ExportBundle["people"][number];
  existing: Person;
}

export interface ImportPreview {
  bundle: ExportBundle;
  autoMatched: string[];
  freshCount: number;
  conflicts: ImportConflict[];
}

function birthYear(dateStr?: string): string | undefined {
  if (!dateStr) return undefined;
  const m = dateStr.match(/\d{4}/);
  return m?.[0];
}

export function analyzeImport(bundle: ExportBundle, existingPeople: Person[]): ImportPreview {
  const existingById = new Map(existingPeople.map((p) => [p.id, p]));
  const autoMatched: string[] = [];
  const conflicts: ImportConflict[] = [];
  let freshCount = 0;

  for (const incoming of bundle.people) {
    if (existingById.has(incoming.id)) {
      autoMatched.push(incoming.id);
      continue;
    }
    const match = existingPeople.find(
      (p) =>
        p.name.trim().toLowerCase() === incoming.name.trim().toLowerCase() &&
        birthYear(p.born) === birthYear(incoming.born) &&
        birthYear(incoming.born) !== undefined
    );
    if (match) {
      conflicts.push({ incoming, existing: match });
    } else {
      freshCount++;
    }
  }

  return { bundle, autoMatched, freshCount, conflicts };
}

export type ConflictResolution = "keep-mine" | "keep-theirs" | "keep-both";

export async function applyImport(
  preview: ImportPreview,
  resolutions: Map<string, ConflictResolution>
): Promise<{ addedPeople: number; addedRelationships: number }> {
  const idMap = new Map<string, string>();
  for (const id of preview.autoMatched) idMap.set(id, id);

  const conflictById = new Map(preview.conflicts.map((c) => [c.incoming.id, c]));

  let addedPeople = 0;

  for (const incoming of preview.bundle.people) {
    if (idMap.has(incoming.id)) continue;

    const conflict = conflictById.get(incoming.id);
    if (conflict) {
      const resolution = resolutions.get(incoming.id) ?? "keep-both";
      if (resolution === "keep-mine") {
        idMap.set(incoming.id, conflict.existing.id);
        continue;
      }
      if (resolution === "keep-theirs") {
        const photoBlob = incoming.photoDataUrl ? await dataUrlToBlob(incoming.photoDataUrl) : undefined;
        await db.people.update(conflict.existing.id, {
          name: incoming.name,
          born: incoming.born,
          died: incoming.died,
          bio: incoming.bio,
          events: incoming.events,
          ...(photoBlob ? { photoBlob } : {}),
        });
        idMap.set(incoming.id, conflict.existing.id);
        const updated = await db.people.get(conflict.existing.id);
        if (updated) emitChange({ kind: "person-upsert", person: updated });
        continue;
      }
      const newId = uuid();
      const photoBlob = incoming.photoDataUrl ? await dataUrlToBlob(incoming.photoDataUrl) : undefined;
      const newPerson: Person = {
        id: newId,
        name: incoming.name,
        born: incoming.born,
        died: incoming.died,
        bio: incoming.bio,
        events: incoming.events,
        photoBlob,
        createdAt: incoming.createdAt ?? Date.now(),
      };
      await db.people.add(newPerson);
      emitChange({ kind: "person-upsert", person: newPerson });
      idMap.set(incoming.id, newId);
      addedPeople++;
      continue;
    }

    const existingIds = new Set((await db.people.toArray()).map((p) => p.id));
    const finalId = existingIds.has(incoming.id) ? uuid() : incoming.id;
    const photoBlob = incoming.photoDataUrl ? await dataUrlToBlob(incoming.photoDataUrl) : undefined;
    const newPerson: Person = {
      id: finalId,
      name: incoming.name,
      born: incoming.born,
      died: incoming.died,
      bio: incoming.bio,
      events: incoming.events,
      photoBlob,
      createdAt: incoming.createdAt ?? Date.now(),
    };
    await db.people.add(newPerson);
    emitChange({ kind: "person-upsert", person: newPerson });
    idMap.set(incoming.id, finalId);
    addedPeople++;
  }

  const existingRelationships = await db.relationships.toArray();
  const relKey = (type: RelationshipType, a: string, b: string) =>
    [type, ...[a, b].sort()].join("::");
  const existingRelKeys = new Set(
    existingRelationships.map((r) => relKey(r.type, r.personA, r.personB))
  );

  let addedRelationships = 0;
  for (const rel of preview.bundle.relationships) {
    const a = idMap.get(rel.personA);
    const b = idMap.get(rel.personB);
    if (!a || !b) continue;
    const key = relKey(rel.type, a, b);
    if (existingRelKeys.has(key)) continue;
    existingRelKeys.add(key);
    const newRel: Relationship = { id: uuid(), type: rel.type, personA: a, personB: b, note: rel.note };
    await db.relationships.add(newRel);
    emitChange({ kind: "relationship-upsert", relationship: newRel });
    addedRelationships++;
  }

  return { addedPeople, addedRelationships };
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}
