export type RelationshipType =
  | "parent-child"
  | "spouse"
  | "sibling"
  | "adoptive-parent-child"
  | "step-parent-child";

export interface LifeEvent {
  label: string;
  date?: string;
}

export interface Person {
  id: string;
  name: string;
  photoBlob?: Blob;
  born?: string;
  died?: string;
  bio?: string;
  events: LifeEvent[];
  createdAt: number;
}

export interface Relationship {
  id: string;
  type: RelationshipType;
  personA: string;
  personB: string;
  note?: string;
}

export interface TreeMeta {
  id: "singleton";
  rootPersonId?: string;
}

export interface ExportBundle {
  version: 1;
  exportedAt: string;
  people: (Omit<Person, "photoBlob"> & { photoDataUrl?: string })[];
  relationships: Relationship[];
}
