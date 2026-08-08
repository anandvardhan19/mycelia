import { v4 as uuid } from "uuid";
import { db } from "./db";
import { emitChange } from "../sync/changeBus";
import type { LifeEvent, Person, Relationship, RelationshipType } from "../types";

const MAX_PHOTO_DIMENSION = 800;
const PHOTO_QUALITY = 0.82;

export async function compressPhoto(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_PHOTO_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/webp", PHOTO_QUALITY)
  );
  return blob ?? file;
}

export interface NewPersonInput {
  name: string;
  photoBlob?: Blob;
  born?: string;
  died?: string;
  bio?: string;
  events?: LifeEvent[];
}

export async function createPerson(input: NewPersonInput): Promise<Person> {
  const photoBlob = input.photoBlob ? await compressPhoto(input.photoBlob) : undefined;
  const person: Person = {
    id: uuid(),
    name: input.name.trim(),
    photoBlob,
    born: input.born?.trim() || undefined,
    died: input.died?.trim() || undefined,
    bio: input.bio?.trim() || undefined,
    events: input.events ?? [],
    createdAt: Date.now(),
  };
  await db.people.add(person);
  emitChange({ kind: "person-upsert", person });
  return person;
}

export async function updatePerson(id: string, patch: Partial<NewPersonInput>): Promise<void> {
  const update: Partial<Person> = { ...patch };
  if (patch.photoBlob) {
    update.photoBlob = await compressPhoto(patch.photoBlob);
  }
  await db.people.update(id, update);
  const updated = await db.people.get(id);
  if (updated) emitChange({ kind: "person-upsert", person: updated });
}

export async function deletePerson(id: string): Promise<void> {
  const removedRelationshipIds: string[] = [];
  await db.transaction("rw", db.people, db.relationships, async () => {
    await db.people.delete(id);
    const relatedA = await db.relationships.where("personA").equals(id).toArray();
    const relatedB = await db.relationships.where("personB").equals(id).toArray();
    removedRelationshipIds.push(...relatedA.map((r) => r.id), ...relatedB.map((r) => r.id));
    await db.relationships.where("personA").equals(id).delete();
    await db.relationships.where("personB").equals(id).delete();
  });
  for (const relId of removedRelationshipIds) emitChange({ kind: "relationship-delete", id: relId });
  emitChange({ kind: "person-delete", id });
}

export async function createRelationship(
  type: RelationshipType,
  personA: string,
  personB: string,
  note?: string
): Promise<Relationship> {
  const rel: Relationship = { id: uuid(), type, personA, personB, note };
  await db.relationships.add(rel);
  emitChange({ kind: "relationship-upsert", relationship: rel });
  return rel;
}

export async function deleteRelationship(id: string): Promise<void> {
  await db.relationships.delete(id);
  emitChange({ kind: "relationship-delete", id });
}

export async function getAllPeople(): Promise<Person[]> {
  return db.people.toArray();
}

export async function getAllRelationships(): Promise<Relationship[]> {
  return db.relationships.toArray();
}

export function getUnlinkedPeople(people: Person[], relationships: Relationship[]): Person[] {
  const linked = new Set<string>();
  for (const r of relationships) {
    linked.add(r.personA);
    linked.add(r.personB);
  }
  return people.filter((p) => !linked.has(p.id));
}

export function photoToObjectUrl(blob?: Blob): string | undefined {
  if (!blob) return undefined;
  return URL.createObjectURL(blob);
}
