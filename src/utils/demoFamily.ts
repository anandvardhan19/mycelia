import { createPerson, createRelationship } from "../db/repo";
import type { LifeEvent } from "../types";

interface DemoPerson {
  key: string;
  name: string;
  born: string;
  died?: string;
  bio?: string;
  events?: LifeEvent[];
}

const PEOPLE: DemoPerson[] = [
  {
    key: "josiah",
    name: "Josiah Ainsworth",
    born: "1872",
    died: "1944",
    bio: "Cooper by trade; kept the family ledger in a tin box that survived two house fires.",
    events: [{ label: "Emigrated from Yorkshire", date: "1894" }, { label: "Opened the cooperage", date: "1898" }],
  },
  {
    key: "agnes",
    name: "Agnes Ainsworth",
    born: "1875",
    died: "1951",
    bio: "Ran a boarding house near the harbor; famous locally for her seed cake.",
  },
  {
    key: "walter",
    name: "Walter Ainsworth",
    born: "1901",
    died: "1978",
    bio: "Second of five children. Worked the same docks his father supplied barrels to.",
    events: [{ label: "Married Edith", date: "1924" }],
  },
  { key: "edith", name: "Edith Ainsworth", born: "1904", died: "1982", bio: "Taught piano out of the front room for over thirty years." },
  {
    key: "harold",
    name: "Harold Ainsworth",
    born: "1929",
    died: "2011",
    bio: "Served in the merchant navy before settling down to run the family hardware shop.",
    events: [{ label: "Returned from service", date: "1951" }],
  },
  { key: "dorothy", name: "Dorothy Ainsworth", born: "1932", died: "2015", bio: "Kept the shop's books and, everyone agreed, actually ran the place." },
  {
    key: "raymond",
    name: "Raymond Ainsworth",
    born: "1957",
    bio: "First in the family to go to university. Still lives two streets from the old shop.",
    events: [{ label: "Graduated", date: "1979" }],
  },
  { key: "linda", name: "Linda Ainsworth", born: "1959", bio: "Retired schoolteacher; unofficial family historian." },
  {
    key: "michael",
    name: "Michael Ainsworth",
    born: "1978",
    bio: "Software engineer. Started digitizing Josiah's old ledger as a lockdown project.",
  },
  { key: "sarah", name: "Sarah Ainsworth", born: "1982", bio: "Runs a small ceramics studio; met Michael at a mutual friend's wedding." },
  {
    key: "emma",
    name: "Emma Ainsworth",
    born: "2008",
    bio: "Named the family group chat after Josiah's cooperage.",
    events: [{ label: "Started at the harbor museum, part-time", date: "2025" }],
  },
  { key: "noah", name: "Noah Ainsworth", born: "2015", bio: "Insists on being the one who scans old photos for the archive." },
];

const RELATIONSHIPS: [string, "spouse" | "parent-child" | "sibling", string, string?][] = [
  ["josiah", "spouse", "agnes"],
  ["josiah", "parent-child", "walter"],
  ["agnes", "parent-child", "walter"],

  ["walter", "spouse", "edith"],
  ["walter", "parent-child", "harold"],
  ["edith", "parent-child", "harold"],

  ["harold", "spouse", "dorothy"],
  ["harold", "parent-child", "raymond"],
  ["dorothy", "parent-child", "raymond"],

  ["raymond", "spouse", "linda"],
  ["raymond", "parent-child", "michael"],
  ["linda", "parent-child", "michael"],

  ["michael", "spouse", "sarah"],
  ["michael", "parent-child", "emma"],
  ["sarah", "parent-child", "emma"],
  ["michael", "parent-child", "noah"],
  ["sarah", "parent-child", "noah"],

  ["emma", "sibling", "noah"],
];

const UNLINKED: DemoPerson[] = [
  {
    key: "beatrice",
    name: "Beatrice Hollis",
    born: "1927",
    bio: "A name that keeps turning up in Agnes's letters — exact relation still unconfirmed.",
  },
];

export async function loadDemoFamily(): Promise<void> {
  const ids = new Map<string, string>();

  for (const person of [...PEOPLE, ...UNLINKED]) {
    const created = await createPerson({
      name: person.name,
      born: person.born,
      died: person.died,
      bio: person.bio,
      events: person.events,
    });
    ids.set(person.key, created.id);
  }

  for (const [aKey, type, bKey] of RELATIONSHIPS) {
    const a = ids.get(aKey);
    const b = ids.get(bKey);
    if (!a || !b) continue;
    await createRelationship(type, a, b);
  }
}
