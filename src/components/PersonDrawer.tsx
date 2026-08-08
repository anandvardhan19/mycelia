import { AnimatePresence, motion } from "framer-motion";
import type { Person, Relationship } from "../types";
import { usePhotoUrl } from "../hooks/usePhotoUrl";
import { deletePerson, deleteRelationship } from "../db/repo";
import { RELATIONSHIP_TYPE_LABEL } from "../utils/relationshipOptions";
import { cohortFor } from "../utils/generations";

export default function PersonDrawer({
  person,
  people,
  relationships,
  onClose,
  onEdit,
  onAddRelative,
  onConnect,
  onSelectPerson,
}: {
  person?: Person;
  people: Person[];
  relationships: Relationship[];
  onClose: () => void;
  onEdit: (p: Person) => void;
  onAddRelative: (p: Person) => void;
  onConnect: (p: Person) => void;
  onSelectPerson: (id: string) => void;
}) {
  const photoUrl = usePhotoUrl(person?.photoBlob);
  const cohort = cohortFor(person?.born);

  const related = person
    ? relationships
        .filter((r) => r.personA === person.id || r.personB === person.id)
        .map((r) => {
          const otherId = r.personA === person.id ? r.personB : r.personA;
          const other = people.find((p) => p.id === otherId);
          const isParentOfOther = r.type !== "spouse" && r.type !== "sibling" && r.personA === person.id;
          const isChildOfOther = r.type !== "spouse" && r.type !== "sibling" && r.personB === person.id;
          let relLabel = RELATIONSHIP_TYPE_LABEL[r.type];
          if (isParentOfOther) relLabel = "Parent of";
          else if (isChildOfOther) relLabel = "Child of";
          else if (r.type === "spouse") relLabel = "Spouse of";
          else if (r.type === "sibling") relLabel = "Sibling of";
          return { rel: r, other, relLabel };
        })
        .filter((x) => x.other)
    : [];

  const handleDelete = async () => {
    if (!person) return;
    if (!confirm(`Remove ${person.name} from the tree? This cannot be undone.`)) return;
    await deletePerson(person.id);
    onClose();
  };

  return (
    <AnimatePresence>
      {person && (
        <motion.aside
          className="drawer"
          initial={{ x: 360, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 360, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
        >
          <button className="icon-btn drawer-close" onClick={onClose} aria-label="Close">
            ×
          </button>

          <div className="drawer-photo">
            {photoUrl ? (
              <img src={photoUrl} alt={person.name} />
            ) : (
              <div className="drawer-photo-fallback">{person.name.charAt(0).toUpperCase()}</div>
            )}
          </div>

          <h2>{person.name}</h2>
          <p className="drawer-dates">
            {person.born ?? "?"} — {person.died ?? "present"}
          </p>
          {cohort && <p className="drawer-cohort">{cohort.name}</p>}

          {person.bio && <p className="drawer-bio">{person.bio}</p>}

          {person.events.length > 0 && (
            <div className="timeline">
              <h3>Life events</h3>
              <ul>
                {person.events
                  .slice()
                  .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""))
                  .map((ev, i) => (
                    <li key={i}>
                      <span className="timeline-date">{ev.date}</span>
                      <span>{ev.label}</span>
                    </li>
                  ))}
              </ul>
            </div>
          )}

          <div className="relations">
            <h3>Relationships</h3>
            {related.length === 0 && <p className="hint">Not connected to anyone yet.</p>}
            <ul>
              {related.map(({ rel, other, relLabel }) => (
                <li key={rel.id}>
                  <button className="link-btn" onClick={() => onSelectPerson(other!.id)}>
                    {relLabel} {other!.name}
                  </button>
                  <button
                    className="icon-btn small"
                    aria-label="Remove relationship"
                    onClick={() => deleteRelationship(rel.id)}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="drawer-actions">
            <button className="primary-btn" onClick={() => onAddRelative(person)}>
              Add relative
            </button>
            <button className="ghost-btn" onClick={() => onConnect(person)}>
              Connect existing
            </button>
            <button className="ghost-btn" onClick={() => onEdit(person)}>
              Edit
            </button>
            <button className="danger-btn" onClick={handleDelete}>
              Remove person
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
