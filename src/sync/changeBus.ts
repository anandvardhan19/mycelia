import type { Person, Relationship } from "../types";

export type ChangeEvent =
  | { kind: "person-upsert"; person: Person }
  | { kind: "person-delete"; id: string }
  | { kind: "relationship-upsert"; relationship: Relationship }
  | { kind: "relationship-delete"; id: string };

type Handler = (event: ChangeEvent) => void;

const handlers = new Set<Handler>();

export function emitChange(event: ChangeEvent): void {
  for (const h of handlers) h(event);
}

export function onChange(handler: Handler): () => void {
  handlers.add(handler);
  return () => handlers.delete(handler);
}
