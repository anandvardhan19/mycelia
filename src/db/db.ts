import Dexie, { type Table } from "dexie";
import type { Person, Relationship, TreeMeta } from "../types";

class MyceliaDB extends Dexie {
  people!: Table<Person, string>;
  relationships!: Table<Relationship, string>;
  meta!: Table<TreeMeta, string>;

  constructor() {
    super("mycelia");
    this.version(1).stores({
      people: "id, name, createdAt",
      relationships: "id, personA, personB, type",
      meta: "id",
    });
  }
}

export const db = new MyceliaDB();

export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  const already = await navigator.storage.persisted?.();
  if (already) return true;
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
