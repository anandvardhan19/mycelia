import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/db";
import { getUnlinkedPeople } from "../db/repo";
import type { Person, Relationship } from "../types";

export function useTreeData(): {
  people: Person[];
  relationships: Relationship[];
  unlinked: Person[];
  loading: boolean;
} {
  const people = useLiveQuery(() => db.people.toArray(), [], undefined);
  const relationships = useLiveQuery(() => db.relationships.toArray(), [], undefined);

  const loading = people === undefined || relationships === undefined;
  const p = people ?? [];
  const r = relationships ?? [];

  return {
    people: p,
    relationships: r,
    unlinked: getUnlinkedPeople(p, r),
    loading,
  };
}
