import type { RelationshipType } from "../types";

export interface RelationshipOption {
  key: string;
  label: string;
  type: RelationshipType;
  swap: boolean; // if true, personA = "other" side; if false, personA = "this" side
}

export const RELATIONSHIP_OPTIONS: RelationshipOption[] = [
  { key: "parent-of", label: "Parent of", type: "parent-child", swap: false },
  { key: "child-of", label: "Child of", type: "parent-child", swap: true },
  { key: "spouse-of", label: "Spouse of", type: "spouse", swap: false },
  { key: "sibling-of", label: "Sibling of", type: "sibling", swap: false },
  { key: "adoptive-parent-of", label: "Adoptive parent of", type: "adoptive-parent-child", swap: false },
  { key: "adoptive-child-of", label: "Adopted child of", type: "adoptive-parent-child", swap: true },
  { key: "step-parent-of", label: "Step-parent of", type: "step-parent-child", swap: false },
  { key: "step-child-of", label: "Step-child of", type: "step-parent-child", swap: true },
];

export const RELATIONSHIP_TYPE_LABEL: Record<RelationshipType, string> = {
  "parent-child": "Parent / child",
  "adoptive-parent-child": "Adoptive parent / child",
  "step-parent-child": "Step-parent / step-child",
  spouse: "Spouse",
  sibling: "Sibling",
};
