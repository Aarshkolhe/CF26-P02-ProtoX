import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import { IdentityProvider } from "./context/IdentityContext.tsx";
import { ToastProvider } from "./context/ToastContext.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <IdentityProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </IdentityProvider>
    </BrowserRouter>
  </StrictMode>,
);
