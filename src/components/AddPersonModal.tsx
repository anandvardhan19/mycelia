import { useEffect, useState } from "react";
import Modal from "./Modal";
import type { LifeEvent, Person } from "../types";
import { createPerson, createRelationship, updatePerson } from "../db/repo";
import { RELATIONSHIP_OPTIONS } from "../utils/relationshipOptions";

export default function AddPersonModal({
  open,
  onClose,
  people,
  presetLinkPersonId,
  editingPerson,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  people: Person[];
  presetLinkPersonId?: string;
  editingPerson?: Person;
  onCreated: (personId: string) => void;
}) {
  const [name, setName] = useState("");
  const [born, setBorn] = useState("");
  const [died, setDied] = useState("");
  const [bio, setBio] = useState("");
  const [photoFile, setPhotoFile] = useState<File | undefined>(undefined);
  const [events, setEvents] = useState<LifeEvent[]>([]);
  const [linkPersonId, setLinkPersonId] = useState<string>(presetLinkPersonId ?? "");
  const [relOption, setRelOption] = useState<string>("child-of");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editingPerson) {
      setName(editingPerson.name);
      setBorn(editingPerson.born ?? "");
      setDied(editingPerson.died ?? "");
      setBio(editingPerson.bio ?? "");
      setEvents(editingPerson.events ?? []);
      setPhotoFile(undefined);
      setLinkPersonId("");
    } else {
      setLinkPersonId(presetLinkPersonId ?? "");
    }
  }, [open, editingPerson, presetLinkPersonId]);

  const reset = () => {
    setName("");
    setBorn("");
    setDied("");
    setBio("");
    setPhotoFile(undefined);
    setEvents([]);
    setLinkPersonId(presetLinkPersonId ?? "");
    setRelOption("child-of");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      if (editingPerson) {
        await updatePerson(editingPerson.id, {
          name,
          born,
          died,
          bio,
          photoBlob: photoFile,
          events: events.filter((ev) => ev.label.trim()),
        });
        onCreated(editingPerson.id);
        reset();
        return;
      }
      const person = await createPerson({
        name,
        born,
        died,
        bio,
        photoBlob: photoFile,
        events: events.filter((ev) => ev.label.trim()),
      });
      if (linkPersonId) {
        const opt = RELATIONSHIP_OPTIONS.find((o) => o.key === relOption)!;
        const personA = opt.swap ? linkPersonId : person.id;
        const personB = opt.swap ? person.id : linkPersonId;
        await createRelationship(opt.type, personA, personB);
      }
      onCreated(person.id);
      reset();
    } finally {
      setSaving(false);
    }
  };

  const addEvent = () => setEvents((ev) => [...ev, { label: "", date: "" }]);
  const updateEvent = (i: number, patch: Partial<LifeEvent>) =>
    setEvents((ev) => ev.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  const removeEvent = (i: number) => setEvents((ev) => ev.filter((_, idx) => idx !== i));

  return (
    <Modal open={open} onClose={handleClose} title={editingPerson ? "Edit person" : "Add a person"}>
      <form className="person-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Name *</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </label>

        <div className="field-row">
          <label className="field">
            <span>Born</span>
            <input value={born} onChange={(e) => setBorn(e.target.value)} placeholder="1952 or 1952-04-02" />
          </label>
          <label className="field">
            <span>Died</span>
            <input value={died} onChange={(e) => setDied(e.target.value)} placeholder="leave blank if living" />
          </label>
        </div>

        <label className="field">
          <span>Photo</span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setPhotoFile(e.target.files?.[0])}
          />
        </label>

        <label className="field">
          <span>Bio</span>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} />
        </label>

        <div className="field">
          <span>Life events</span>
          {events.map((ev, i) => (
            <div className="event-row" key={i}>
              <input
                placeholder="Event"
                value={ev.label}
                onChange={(e) => updateEvent(i, { label: e.target.value })}
              />
              <input
                placeholder="Date"
                value={ev.date ?? ""}
                onChange={(e) => updateEvent(i, { date: e.target.value })}
              />
              <button type="button" className="icon-btn" onClick={() => removeEvent(i)} aria-label="Remove event">
                ×
              </button>
            </div>
          ))}
          <button type="button" className="link-btn" onClick={addEvent}>
            + Add event
          </button>
        </div>

        {!editingPerson && people.length > 0 && (
          <div className="field-row">
            <label className="field">
              <span>Connect to (optional)</span>
              <select value={linkPersonId} onChange={(e) => setLinkPersonId(e.target.value)}>
                <option value="">Leave unlinked</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            {linkPersonId && (
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
            )}
          </div>
        )}

        <div className="modal-actions">
          <button type="button" className="ghost-btn" onClick={handleClose}>
            Cancel
          </button>
          <button type="submit" className="primary-btn" disabled={!name.trim() || saving}>
            {saving ? "Growing…" : editingPerson ? "Save changes" : "Add person"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
