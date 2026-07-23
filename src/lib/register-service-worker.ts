export function registerServiceWorker(): void {
  if (!("serviceWorker" in navigator) || import.meta.env.DEV) return;
  window.addEventListener("load", () => {
    const serviceWorkerUrl = new URL("sw.js", window.location.href);
    void navigator.serviceWorker.register(serviceWorkerUrl, {
      scope: new URL("./", window.location.href).pathname,
    });
  });
}
