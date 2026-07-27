import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// Self-hosted so the app makes no external font request and still sets offline.
import "@fontsource-variable/fraunces/full.css";
import "@fontsource-variable/ibm-plex-sans";
import "@fontsource-variable/jetbrains-mono";
import App from "./App";
import { registerServiceWorker } from "./lib/register-service-worker";
import "./styles.css";

registerServiceWorker();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
