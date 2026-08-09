import type { ReactNode } from "react";
import type { ThemePreference } from "../hooks/useTheme";

const OPTIONS: { value: ThemePreference; label: string; icon: ReactNode }[] = [
  {
    value: "light",
    label: "Light theme",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="2" />
        <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M12 2v2.5" />
          <path d="M12 19.5V22" />
          <path d="M4.2 4.2l1.8 1.8" />
          <path d="M18 18l1.8 1.8" />
          <path d="M2 12h2.5" />
          <path d="M19.5 12H22" />
          <path d="M4.2 19.8l1.8-1.8" />
          <path d="M18 6l1.8-1.8" />
        </g>
      </svg>
    ),
  },
  {
    value: "system",
    label: "Match system",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="4" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
        <path d="M8 20h8M12 16v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    value: "dark",
    label: "Dark theme",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path
          d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

export default function ThemeToggle({
  theme,
  onChange,
}: {
  theme: ThemePreference;
  onChange: (t: ThemePreference) => void;
}) {
  return (
    <div className="theme-toggle" role="radiogroup" aria-label="Theme">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          role="radio"
          aria-checked={theme === opt.value}
          aria-label={opt.label}
          title={opt.label}
          className={`theme-toggle-btn${theme === opt.value ? " active" : ""}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.icon}
        </button>
      ))}
    </div>
  );
}
