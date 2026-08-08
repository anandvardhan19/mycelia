import type { Person } from "../types";
import { usePhotoUrl } from "../hooks/usePhotoUrl";

function TrayChip({ person, onClick }: { person: Person; onClick: () => void }) {
  const photoUrl = usePhotoUrl(person.photoBlob);
  return (
    <button className="tray-chip" onClick={onClick} title={`Connect ${person.name}`}>
      <span className="tray-chip-avatar">
        {photoUrl ? <img src={photoUrl} alt="" /> : person.name.charAt(0).toUpperCase()}
      </span>
      <span className="tray-chip-name">{person.name}</span>
    </button>
  );
}

export default function UnlinkedTray({
  people,
  onConnect,
  collapsed,
  onToggle,
}: {
  people: Person[];
  onConnect: (p: Person) => void;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <aside className={`unlinked-tray${collapsed ? " collapsed" : ""}`}>
      <button className="tray-toggle" onClick={onToggle}>
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <ellipse cx="12" cy="13" rx="9" ry="7" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <ellipse cx="12" cy="12" rx="9" ry="7" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
        <span>Unlinked relatives{people.length > 0 ? ` (${people.length})` : ""}</span>
      </button>
      {!collapsed && (
        <div className="tray-body scroll-thin">
          <p className="hint">Discovered but not yet connected. Tap one to graft it into the tree.</p>
          {people.length === 0 ? (
            <p className="hint tray-empty">Nothing waiting here — everyone's connected.</p>
          ) : (
            <div className="tray-dish">
              {people.map((p) => (
                <TrayChip key={p.id} person={p} onClick={() => onConnect(p)} />
              ))}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
