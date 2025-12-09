import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { DesignModeProvider } from "./contexts/DesignModeContext";
import { CRMThemeProvider } from "./contexts/CRMThemeContext";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <DesignModeProvider>
      <CRMThemeProvider>
        <App />
      </CRMThemeProvider>
    </DesignModeProvider>
  </HelmetProvider>
);
