import { useEffect, useMemo, useState } from "react";
import { useTreeData } from "./hooks/useTreeData";
import { requestPersistentStorage } from "./db/db";
import TreeCanvas from "./components/TreeCanvas";
import UnlinkedTray from "./components/UnlinkedTray";
import PersonDrawer from "./components/PersonDrawer";
import AddPersonModal from "./components/AddPersonModal";
import ConnectModal from "./components/ConnectModal";
import ExportImportModal from "./components/ExportImportModal";
import LiveSessionModal from "./components/LiveSessionModal";
import SearchBar from "./components/SearchBar";
import ThemeToggle from "./components/ThemeToggle";
import UpdatePrompt from "./components/UpdatePrompt";
import { useLiveSession } from "./hooks/useLiveSession";
import { useTheme } from "./hooks/useTheme";
import type { Person } from "./types";
import "./app.css";

export default function App() {
  const { people, relationships, unlinked, loading } = useTreeData();

  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [trayCollapsed, setTrayCollapsed] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 720
  );
  const [search, setSearch] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [addPreset, setAddPreset] = useState<string | undefined>(undefined);
  const [editingPerson, setEditingPerson] = useState<Person | undefined>(undefined);

  const [connectOpen, setConnectOpen] = useState(false);
  const [connectFrom, setConnectFrom] = useState<Person | undefined>(undefined);

  const [shareOpen, setShareOpen] = useState(false);
  const [liveOpen, setLiveOpen] = useState(false);
  const liveStatus = useLiveSession();
  const { theme, setTheme } = useTheme();

  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [storageNotice, setStorageNotice] = useState(false);

  useEffect(() => {
    requestPersistentStorage().then(() => {
      if (!sessionStorage.getItem("mycelia-storage-notice-shown")) {
        setStorageNotice(true);
        sessionStorage.setItem("mycelia-storage-notice-shown", "1");
      }
    });
  }, []);

  const selectedPerson = people.find((p) => p.id === selectedId);

  const highlightIds = useMemo(() => {
    if (!search.trim()) return undefined;
    const q = search.trim().toLowerCase();
    return new Set(people.filter((p) => p.name.toLowerCase().includes(q)).map((p) => p.id));
  }, [search, people]);

  const matchCount = highlightIds?.size ?? 0;

  const markNew = (id: string) => {
    setNewIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setNewIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 1400);
  };

  const openAddPerson = (presetLink?: string) => {
    setEditingPerson(undefined);
    setAddPreset(presetLink);
    setAddOpen(true);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("action") === "add") {
      openAddPerson();
      params.delete("action");
      const rest = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (rest ? `?${rest}` : ""));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openEditPerson = (p: Person) => {
    setEditingPerson(p);
    setAddPreset(undefined);
    setAddOpen(true);
  };

  const openConnect = (p: Person) => {
    setConnectFrom(p);
    setConnectOpen(true);
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <img src="/icons/icon.svg" width="30" height="30" alt="" className="brand-mark" />
          <h1>MYCELIA</h1>
        </div>
        <SearchBar value={search} onChange={setSearch} matchCount={matchCount} />
        <div className="header-actions">
          <button className="ghost-btn live-btn" onClick={() => setLiveOpen(true)}>
            {liveStatus.active && <span className={`live-dot${liveStatus.synced ? " synced" : ""}`} />}
            {liveStatus.active ? "Live" : "Go live"}
          </button>
          <button className="ghost-btn" onClick={() => setShareOpen(true)}>
            Share
          </button>
          <button className="primary-btn" onClick={() => openAddPerson()} aria-label="Add person">
            <span className="btn-label-full">+ Add person</span>
            <span className="btn-label-short">+</span>
          </button>
        </div>
      </header>

      <main className="app-main">
        <div className="canvas-area">
          {loading ? (
            <div className="empty-canvas">
              <p>Loading your tree…</p>
            </div>
          ) : (
            <TreeCanvas
              people={people}
              relationships={relationships}
              selectedId={selectedId}
              onSelect={setSelectedId}
              highlightIds={highlightIds}
              newIds={newIds}
            />
          )}
        </div>

        <UnlinkedTray
          people={unlinked}
          onConnect={openConnect}
          collapsed={trayCollapsed}
          onToggle={() => setTrayCollapsed((c) => !c)}
        />

        <PersonDrawer
          person={selectedPerson}
          people={people}
          relationships={relationships}
          onClose={() => setSelectedId(undefined)}
          onEdit={openEditPerson}
          onAddRelative={(p) => openAddPerson(p.id)}
          onConnect={openConnect}
          onSelectPerson={setSelectedId}
        />
      </main>

      <footer className="app-footer">
        <span>
          {people.length} {people.length === 1 ? "person" : "people"} · {relationships.length}{" "}
          {relationships.length === 1 ? "relationship" : "relationships"}
        </span>
        <ThemeToggle theme={theme} onChange={setTheme} />
        <span className="app-footer-tag">
          {liveStatus.active
            ? `live · ${liveStatus.peerCount} connected`
            : "kept on this device"}
        </span>
      </footer>

      <AddPersonModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        people={people}
        presetLinkPersonId={addPreset}
        editingPerson={editingPerson}
        onCreated={(id) => {
          setAddOpen(false);
          setSelectedId(id);
          if (!editingPerson) markNew(id);
        }}
      />

      <ConnectModal
        open={connectOpen}
        onClose={() => setConnectOpen(false)}
        fromPerson={connectFrom}
        people={people}
        onConnected={() => setConnectOpen(false)}
      />

      <ExportImportModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        people={people}
        relationships={relationships}
        focusPersonId={selectedId}
      />

      <LiveSessionModal open={liveOpen} onClose={() => setLiveOpen(false)} />

      <UpdatePrompt />

      {storageNotice && (
        <div className="toast">
          <p>
            MYCELIA keeps everything on this device only. We've asked the browser to protect that
            data from being cleared automatically under storage pressure.
          </p>
          <button className="icon-btn" onClick={() => setStorageNotice(false)} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}
    </div>
  );
}
