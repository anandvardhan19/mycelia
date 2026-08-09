import { useRegisterSW } from "virtual:pwa-register/react";

export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      const check = () => registration.update().catch(() => {});
      setInterval(check, 60 * 60 * 1000);
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="toast update-toast">
      <p>A newer version of MYCELIA is ready.</p>
      <div className="update-toast-actions">
        <button className="primary-btn" onClick={() => updateServiceWorker(true)}>
          Reload
        </button>
        <button className="icon-btn" onClick={() => setNeedRefresh(false)} aria-label="Dismiss">
          ×
        </button>
      </div>
    </div>
  );
}
