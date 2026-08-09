import { useState } from "react";
import QRCode from "qrcode";
import Modal from "./Modal";
import type { Person, Relationship } from "../types";
import {
  analyzeImport,
  applyImport,
  buildExportBundle,
  downloadBundle,
  getConnectedCluster,
  readFileAsText,
  shareBundle,
  type ConflictResolution,
  type ImportPreview,
} from "../utils/exportImport";
import { renderTreeCardSvg, svgToPngBlob } from "../utils/treeCard";

type Tab = "export" | "import";

export default function ExportImportModal({
  open,
  onClose,
  people,
  relationships,
  focusPersonId,
}: {
  open: boolean;
  onClose: () => void;
  people: Person[];
  relationships: Relationship[];
  focusPersonId?: string;
}) {
  const [tab, setTab] = useState<Tab>("export");
  const [scope, setScope] = useState<"all" | "branch">("all");
  const [busy, setBusy] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | undefined>(undefined);
  const [cardBusy, setCardBusy] = useState(false);
  const [cardPreview, setCardPreview] = useState<string | undefined>(undefined);
  const [cardPngBlob, setCardPngBlob] = useState<Blob | undefined>(undefined);
  const [cardError, setCardError] = useState<string | undefined>(undefined);

  const [preview, setPreview] = useState<ImportPreview | undefined>(undefined);
  const [resolutions, setResolutions] = useState<Map<string, ConflictResolution>>(new Map());
  const [importResult, setImportResult] = useState<{ addedPeople: number; addedRelationships: number } | undefined>();
  const [importError, setImportError] = useState<string | undefined>();

  const handleClose = () => {
    setPreview(undefined);
    setImportResult(undefined);
    setImportError(undefined);
    setQrUrl(undefined);
    if (cardPreview) URL.revokeObjectURL(cardPreview);
    setCardPreview(undefined);
    setCardPngBlob(undefined);
    setCardError(undefined);
    setTab("export");
    onClose();
  };

  const doExport = async (share: boolean) => {
    setBusy(true);
    try {
      const scopeIds =
        scope === "branch" && focusPersonId
          ? getConnectedCluster(focusPersonId, people, relationships)
          : undefined;
      const bundle = await buildExportBundle(people, relationships, scopeIds);
      const filename = `mycelia-tree-${new Date().toISOString().slice(0, 10)}.json`;
      if (share) {
        const shared = await shareBundle(bundle, filename);
        if (!shared) downloadBundle(bundle, filename);
      } else {
        downloadBundle(bundle, filename);
      }
    } finally {
      setBusy(false);
    }
  };

  const doQr = async () => {
    if (!focusPersonId) return;
    const person = people.find((p) => p.id === focusPersonId);
    if (!person) return;
    setBusy(true);
    try {
      const card = {
        name: person.name,
        born: person.born,
        died: person.died,
        bio: person.bio,
      };
      const url = await QRCode.toDataURL(JSON.stringify(card), { margin: 1, width: 260 });
      setQrUrl(url);
    } finally {
      setBusy(false);
    }
  };

  const doCard = async () => {
    setCardBusy(true);
    setCardError(undefined);
    try {
      const scopeIds =
        scope === "branch" && focusPersonId
          ? getConnectedCluster(focusPersonId, people, relationships)
          : undefined;
      const scopedPeople = scopeIds ? people.filter((p) => scopeIds.has(p.id)) : people;
      const scopedPeopleIds = new Set(scopedPeople.map((p) => p.id));
      const scopedRelationships = relationships.filter(
        (r) => scopedPeopleIds.has(r.personA) && scopedPeopleIds.has(r.personB)
      );
      const { svg, width, height } = await renderTreeCardSvg(
        scopedPeople,
        scopedRelationships,
        scope === "branch" ? "A branch of the family tree" : "The family tree"
      );
      const blob = await svgToPngBlob(svg, width, height);
      setCardPngBlob(blob);
      setCardPreview(URL.createObjectURL(blob));
    } catch {
      setCardError("Couldn't render the card. Try again, or use the .json export instead.");
    } finally {
      setCardBusy(false);
    }
  };

  const downloadCard = () => {
    if (!cardPngBlob) return;
    const url = URL.createObjectURL(cardPngBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mycelia-tree-${new Date().toISOString().slice(0, 10)}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  const shareCard = async () => {
    if (!cardPngBlob) return;
    const filename = `mycelia-tree-${new Date().toISOString().slice(0, 10)}.png`;
    const file = new File([cardPngBlob], filename, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "MYCELIA family tree" });
        return;
      } catch {
        // fall through to download
      }
    }
    downloadCard();
  };

  const handleFile = async (file: File) => {
    setImportError(undefined);
    setImportResult(undefined);
    try {
      const text = await readFileAsText(file);
      const bundle = JSON.parse(text);
      if (!bundle || bundle.version !== 1 || !Array.isArray(bundle.people)) {
        setImportError("This doesn't look like a MYCELIA export file.");
        return;
      }
      const analyzed = analyzeImport(bundle, people);
      setPreview(analyzed);
      setResolutions(new Map(analyzed.conflicts.map((c) => [c.incoming.id, "keep-both" as ConflictResolution])));
    } catch {
      setImportError("Couldn't read that file. Make sure it's a MYCELIA .json export.");
    }
  };

  const confirmImport = async () => {
    if (!preview) return;
    setBusy(true);
    try {
      const result = await applyImport(preview, resolutions);
      setImportResult(result);
      setPreview(undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Share your tree" wide>
      <div className="tabs">
        <button className={tab === "export" ? "tab active" : "tab"} onClick={() => setTab("export")}>
          Export
        </button>
        <button className={tab === "import" ? "tab active" : "tab"} onClick={() => setTab("import")}>
          Import
        </button>
      </div>

      {tab === "export" && (
        <div className="export-panel">
          <p className="hint">
            Send the whole tree, or just the branch connected to the person you have open. The
            recipient opens MYCELIA and imports the file.
          </p>
          <div className="field">
            <label className="radio-row">
              <input
                type="radio"
                checked={scope === "all"}
                onChange={() => setScope("all")}
                name="scope"
              />
              Whole tree ({people.length} people)
            </label>
            <label className="radio-row">
              <input
                type="radio"
                checked={scope === "branch"}
                onChange={() => setScope("branch")}
                disabled={!focusPersonId}
                name="scope"
              />
              Just this person's connected branch
              {!focusPersonId && <span className="hint"> — open a person first</span>}
            </label>
          </div>
          <div className="modal-actions">
            <button className="ghost-btn" onClick={() => doExport(false)} disabled={busy}>
              Download .json
            </button>
            <button className="primary-btn" onClick={() => doExport(true)} disabled={busy}>
              Share…
            </button>
          </div>

          <div className="card-section">
            <h3>Share as a picture</h3>
            <p className="hint">
              A single image of the tree — nodes, connections, names and dates — for posting or
              messaging where a .json file wouldn't make sense.
            </p>
            <button className="ghost-btn" onClick={doCard} disabled={cardBusy || people.length === 0}>
              {cardBusy ? "Drawing the tree…" : "Generate image card"}
            </button>
            {cardError && <p className="error-text">{cardError}</p>}
            {cardPreview && (
              <>
                <img className="card-preview" src={cardPreview} alt="Family tree card preview" />
                <div className="modal-actions">
                  <button className="ghost-btn" onClick={downloadCard}>
                    Download .png
                  </button>
                  <button className="primary-btn" onClick={shareCard}>
                    Share…
                  </button>
                </div>
              </>
            )}
          </div>

          {focusPersonId && (
            <div className="qr-section">
              <h3>Quick share: QR code</h3>
              <p className="hint">Encodes just this person's card — name, dates, bio — for a fast in-person share.</p>
              <button className="ghost-btn" onClick={doQr} disabled={busy}>
                Generate QR
              </button>
              {qrUrl && <img className="qr-image" src={qrUrl} alt="QR code for person card" />}
            </div>
          )}
        </div>
      )}

      {tab === "import" && (
        <div className="import-panel">
          {!preview && !importResult && (
            <>
              <p className="hint">Choose a MYCELIA .json file shared with you.</p>
              <input
                type="file"
                accept="application/json"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              {importError && <p className="error-text">{importError}</p>}
            </>
          )}

          {preview && (
            <div>
              <p className="hint">
                {preview.freshCount} new {preview.freshCount === 1 ? "person" : "people"},{" "}
                {preview.autoMatched.length} already in your tree
                {preview.conflicts.length > 0 && `, ${preview.conflicts.length} possible duplicates to review`}.
              </p>

              {preview.conflicts.length > 0 && (
                <div className="conflict-list">
                  {preview.conflicts.map((c) => (
                    <div className="conflict-row" key={c.incoming.id}>
                      <div className="conflict-names">
                        <strong>{c.incoming.name}</strong>
                        <span className="hint">
                          matches existing "{c.existing.name}" ({c.existing.born ?? "?"})
                        </span>
                      </div>
                      <select
                        value={resolutions.get(c.incoming.id) ?? "keep-both"}
                        onChange={(e) =>
                          setResolutions((prev) => {
                            const next = new Map(prev);
                            next.set(c.incoming.id, e.target.value as ConflictResolution);
                            return next;
                          })
                        }
                      >
                        <option value="keep-mine">Keep mine</option>
                        <option value="keep-theirs">Keep theirs</option>
                        <option value="keep-both">Keep both</option>
                      </select>
                    </div>
                  ))}
                </div>
              )}

              <div className="modal-actions">
                <button className="ghost-btn" onClick={() => setPreview(undefined)}>
                  Cancel
                </button>
                <button className="primary-btn" onClick={confirmImport} disabled={busy}>
                  {busy ? "Merging…" : "Import"}
                </button>
              </div>
            </div>
          )}

          {importResult && (
            <div>
              <p>
                Added {importResult.addedPeople} {importResult.addedPeople === 1 ? "person" : "people"} and{" "}
                {importResult.addedRelationships} relationship
                {importResult.addedRelationships === 1 ? "" : "s"}.
              </p>
              <div className="modal-actions">
                <button className="primary-btn" onClick={handleClose}>
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
