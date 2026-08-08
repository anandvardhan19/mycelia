import { useState } from "react";
import Modal from "./Modal";
import type { Person } from "../types";
import { createRelationship } from "../db/repo";
import { RELATIONSHIP_OPTIONS } from "../utils/relationshipOptions";

export default function ConnectModal({
  open,
  onClose,
  fromPerson,
  people,
  onConnected,
}: {
  open: boolean;
  onClose: () => void;
  fromPerson?: Person;
  people: Person[];
  onConnected: () => void;
}) {
  const [otherId, setOtherId] = useState("");
  const [relOption, setRelOption] = useState("child-of");
  const [saving, setSaving] = useState(false);

  const candidates = people.filter((p) => p.id !== fromPerson?.id);

  const handleClose = () => {
    setOtherId("");
    setRelOption("child-of");
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromPerson || !otherId || saving) return;
    setSaving(true);
    try {
      const opt = RELATIONSHIP_OPTIONS.find((o) => o.key === relOption)!;
      const personA = opt.swap ? otherId : fromPerson.id;
      const personB = opt.swap ? fromPerson.id : otherId;
      await createRelationship(opt.type, personA, personB);
      onConnected();
      handleClose();
    } finally {
      setSaving(false);
    }
  };

  if (!fromPerson) return null;

  return (
    <Modal open={open} onClose={handleClose} title={`Connect ${fromPerson.name}`}>
      <form className="person-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>To</span>
          <select value={otherId} onChange={(e) => setOtherId(e.target.value)} required>
            <option value="">Choose a person…</option>
            {candidates.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Relationship</span>
          <select value={relOption} onChange={(e) => setRelOption(e.target.value)}>
            {RELATIONSHIP_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <div className="modal-actions">
          <button type="button" className="ghost-btn" onClick={handleClose}>
            Cancel
          </button>
          <button type="submit" className="primary-btn" disabled={!otherId || saving}>
            {saving ? "Grafting…" : "Graft connection"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
