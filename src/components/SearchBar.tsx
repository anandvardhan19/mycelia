export default function SearchBar({
  value,
  onChange,
  matchCount,
}: {
  value: string;
  onChange: (v: string) => void;
  matchCount: number;
}) {
  return (
    <div className="search-bar">
      <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
        <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <input
        placeholder="Search by name…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && <span className="search-count">{matchCount}</span>}
    </div>
  );
}
