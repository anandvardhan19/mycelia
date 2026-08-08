export interface LiveStatus {
  active: boolean;
  roomCode?: string;
  peerCount: number;
  synced: boolean;
}

let status: LiveStatus = { active: false, peerCount: 0, synced: false };
const listeners = new Set<(s: LiveStatus) => void>();

export function getStatus(): LiveStatus {
  return status;
}

export function setStatus(patch: Partial<LiveStatus>): void {
  status = { ...status, ...patch };
  for (const l of listeners) l(status);
}

export function subscribe(listener: (s: LiveStatus) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
