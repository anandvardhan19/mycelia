import * as Y from "yjs";
import { WebrtcProvider } from "y-webrtc";
import { db } from "../db/db";
import { onChange, type ChangeEvent } from "./changeBus";
import { setStatus } from "./liveStatusStore";
import type { Person, Relationship } from "../types";

type PersonRecord = Omit<Person, "photoBlob">;
type RelRecord = Relationship;

const LOCAL_ORIGIN = "mycelia-local";

interface Session {
  doc: Y.Doc;
  provider: WebrtcProvider;
  peopleMap: Y.Map<PersonRecord>;
  relMap: Y.Map<RelRecord>;
  unsubscribeBus: () => void;
}

let session: Session | null = null;

const WORDS = [
  "moss", "root", "spore", "fern", "cell", "bark", "sap", "vein", "leaf", "seed",
  "bloom", "husk", "node", "graft", "loam", "bough", "twig", "frond", "thread",
  "weave", "grove", "dell", "glade", "hollow", "bramble", "lichen", "fungus", "tuber",
];

export function generateRoomCode(): string {
  const a = WORDS[Math.floor(Math.random() * WORDS.length)];
  const b = WORDS[Math.floor(Math.random() * WORDS.length)];
  const n = Math.floor(1000 + Math.random() * 9000);
  return `${a}-${b}-${n}`;
}

function stripPhoto(p: Person): PersonRecord {
  const { photoBlob: _photoBlob, ...rest } = p;
  return rest;
}

async function applyRemotePerson(id: string, rec: PersonRecord | undefined) {
  if (!rec) {
    await db.people.delete(id);
    return;
  }
  const existing = await db.people.get(id);
  await db.people.put({ ...rec, photoBlob: existing?.photoBlob });
}

async function applyRemoteRelationship(id: string, rec: RelRecord | undefined) {
  if (!rec) {
    await db.relationships.delete(id);
    return;
  }
  await db.relationships.put(rec);
}

async function mergeOnConnect(s: Session) {
  for (const [id, rec] of s.peopleMap.entries()) {
    await applyRemotePerson(id, rec);
  }
  for (const [id, rec] of s.relMap.entries()) {
    await applyRemoteRelationship(id, rec);
  }

  const [localPeople, localRels] = await Promise.all([db.people.toArray(), db.relationships.toArray()]);
  s.doc.transact(() => {
    for (const p of localPeople) {
      if (!s.peopleMap.has(p.id)) s.peopleMap.set(p.id, stripPhoto(p));
    }
    for (const r of localRels) {
      if (!s.relMap.has(r.id)) s.relMap.set(r.id, r);
    }
  }, LOCAL_ORIGIN);
}

function wireBusToDoc(s: Session): () => void {
  return onChange((event: ChangeEvent) => {
    s.doc.transact(() => {
      switch (event.kind) {
        case "person-upsert":
          s.peopleMap.set(event.person.id, stripPhoto(event.person));
          break;
        case "person-delete":
          s.peopleMap.delete(event.id);
          break;
        case "relationship-upsert":
          s.relMap.set(event.relationship.id, event.relationship);
          break;
        case "relationship-delete":
          s.relMap.delete(event.id);
          break;
      }
    }, LOCAL_ORIGIN);
  });
}

async function connect(roomCode: string): Promise<void> {
  if (session) await stopSession();

  const doc = new Y.Doc();
  const peopleMap = doc.getMap<PersonRecord>("people");
  const relMap = doc.getMap<RelRecord>("relationships");

  const provider = new WebrtcProvider(`mycelia-tree-${roomCode}`, doc, {
    password: roomCode,
    signaling: ["wss://y-webrtc-eu.fly.dev", "wss://signaling.yjs.dev"],
  });

  const s: Session = { doc, provider, peopleMap, relMap, unsubscribeBus: () => {} };
  session = s;

  setStatus({ active: true, roomCode, peerCount: 0, synced: false });

  provider.on("status", ({ connected }: { connected: boolean }) => {
    if (!connected) setStatus({ synced: false });
  });

  provider.on("peers", ({ webrtcPeers }: { webrtcPeers: string[] }) => {
    setStatus({ peerCount: webrtcPeers.length });
  });

  let mergedOnce = false;
  provider.on("synced", async ({ synced }: { synced: boolean }) => {
    if (synced && !mergedOnce) {
      mergedOnce = true;
      await mergeOnConnect(s);
    }
    setStatus({ synced });
  });

  peopleMap.observe((event, transaction) => {
    if (transaction.origin === LOCAL_ORIGIN) return;
    for (const [id, change] of event.changes.keys) {
      if (change.action === "delete") {
        void applyRemotePerson(id, undefined);
      } else {
        void applyRemotePerson(id, peopleMap.get(id));
      }
    }
  });

  relMap.observe((event, transaction) => {
    if (transaction.origin === LOCAL_ORIGIN) return;
    for (const [id, change] of event.changes.keys) {
      if (change.action === "delete") {
        void applyRemoteRelationship(id, undefined);
      } else {
        void applyRemoteRelationship(id, relMap.get(id));
      }
    }
  });

  s.unsubscribeBus = wireBusToDoc(s);
}

export async function startNewSession(): Promise<string> {
  const code = generateRoomCode();
  await connect(code);
  return code;
}

export async function joinSession(roomCode: string): Promise<void> {
  await connect(roomCode.trim().toLowerCase());
}

export async function stopSession(): Promise<void> {
  if (!session) return;
  const s = session;
  session = null;
  s.unsubscribeBus();
  s.provider.disconnect();
  s.provider.destroy();
  s.doc.destroy();
  setStatus({ active: false, roomCode: undefined, peerCount: 0, synced: false });
}
