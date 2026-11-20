// Single service-worker registrar. Never registers in dev, iframes, or Lovable previews.
function isRefusedHost(host: string) {
  const first = host.split(".")[0] ?? "";
  const lovableish = /\.(lovable\.app|gpt-eng\.com|gptengineer\.run)$/.test(host);
  if (lovableish && /^(?:id-preview|preview)(?:-[a-z0-9]+)?--.+$/.test(first)) return true;
  if (lovableish && /^project--[a-z0-9-]+-dev$/.test(first)) return true;
  return (
    host === "lovableproject.com" ||
    host.endsWith(".lovableproject.com") ||
    host === "lovableproject-dev.com" ||
    host.endsWith(".lovableproject-dev.com") ||
    host === "beta.lovable.dev" ||
    host.endsWith(".beta.lovable.dev")
  );
}

async function unregisterAppWorkers() {
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    regs
      .filter((r) => (r.active ?? r.installing ?? r.waiting)?.scriptURL.endsWith("/sw.js"))
      .map((r) => r.unregister()),
  );
}

export function registerAppServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  const host = window.location.hostname.toLowerCase();
  let inIframe = true;
  try {
    inIframe = window.self !== window.top;
  } catch {
    inIframe = true;
  }
  const off = new URLSearchParams(window.location.search).get("sw") === "off";
  if (!import.meta.env.PROD || inIframe || off || isRefusedHost(host)) {
    void unregisterAppWorkers();
    return;
  }
  void navigator.serviceWorker.register("/sw.js").then(async () => {
    // Save the start page right away so the app opens offline even after just one visit.
    await navigator.serviceWorker.ready;
    if ("caches" in window) {
      const c = await caches.open("pages");
      await c.add("/").catch(() => {});
    }
  });
}
