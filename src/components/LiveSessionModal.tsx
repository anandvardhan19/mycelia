import { useState } from "react";
import Modal from "./Modal";
import { useLiveSession } from "../hooks/useLiveSession";
import { joinSession, startNewSession, stopSession } from "../sync/liveSession";

export default function LiveSessionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const status = useLiveSession();
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const handleStart = async () => {
    setBusy(true);
    setError(undefined);
    try {
      await startNewSession();
    } catch {
      setError("Couldn't start a live session. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setBusy(true);
    setError(undefined);
    try {
      await joinSession(joinCode);
    } catch {
      setError("Couldn't join that session. Double-check the code.");
    } finally {
      setBusy(false);
    }
  };

  const handleLeave = async () => {
    setBusy(true);
    try {
      await stopSession();
    } finally {
      setBusy(false);
    }
  };

  const copyCode = async () => {
    if (!status.roomCode) return;
    try {
      await navigator.clipboard.writeText(status.roomCode);
    } catch {
      // clipboard unavailable — code is already visible to copy by hand
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Live session">
      {!status.active ? (
        <div className="live-session-panel">
          <p className="hint">
            Grow the tree together in real time — no server, just a direct connection between your
            devices while this session is open. Only names, dates, bios, and relationships sync;
            photos stay on the device that added them.
          </p>

          <button className="primary-btn" onClick={handleStart} disabled={busy}>
            {busy ? "Starting…" : "Start a live session"}
          </button>

          <div className="live-session-divider">or join one</div>

          <form className="person-form" onSubmit={handleJoin}>
            <label className="field">
              <span>Session code</span>
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="moss-root-4821"
                autoCapitalize="off"
                autoCorrect="off"
              />
            </label>
            <div className="modal-actions">
              <button type="submit" className="primary-btn" disabled={!joinCode.trim() || busy}>
                Join session
              </button>
            </div>
          </form>

          {error && <p className="error-text">{error}</p>}
        </div>
      ) : (
        <div className="live-session-panel">
          <div className="live-session-status">
            <span className={`live-dot${status.synced ? " synced" : ""}`} />
            <span>
              {status.synced
                ? status.peerCount > 0
                  ? `Live — synced with ${status.peerCount} ${status.peerCount === 1 ? "device" : "devices"}`
                  : "Live — waiting for someone to join"
                : "Connecting…"}
            </span>
          </div>

          <p className="hint">Share this code with family so they can join the same session:</p>
          <div className="room-code-row">
            <code className="room-code">{status.roomCode}</code>
            <button className="ghost-btn" onClick={copyCode}>
              Copy
            </button>
          </div>

          <p className="hint">
            Changes either of you make — new people, edits, connections — appear on both devices
            while this stays open. Closing the app ends the session; reconnect any time with the
            same code.
          </p>

          <div className="modal-actions">
            <button className="danger-btn" onClick={handleLeave} disabled={busy}>
              End live session
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
