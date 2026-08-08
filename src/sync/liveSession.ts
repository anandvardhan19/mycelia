export { getStatus, subscribe, type LiveStatus } from "./liveStatusStore";

export async function startNewSession(): Promise<string> {
  const engine = await import("./liveSessionEngine");
  return engine.startNewSession();
}

export async function joinSession(roomCode: string): Promise<void> {
  const engine = await import("./liveSessionEngine");
  return engine.joinSession(roomCode);
}

export async function stopSession(): Promise<void> {
  const engine = await import("./liveSessionEngine");
  return engine.stopSession();
}
