import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

interface CustomScriptManagerProps {
  headScripts?: string | null;
  bodyScripts?: string | null;
}

export const CustomScriptManager = ({ headScripts, bodyScripts }: CustomScriptManagerProps) => {
  useEffect(() => {
    // Inject body scripts directly into the DOM
    if (bodyScripts) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = bodyScripts.trim();
      
      // Insert scripts at the beginning of body
      const bodyElement = document.body;
      const scripts = tempDiv.querySelectorAll('script, noscript');
      
      scripts.forEach((script) => {
        if (script.tagName === 'SCRIPT') {
          const newScript = document.createElement('script');
          const scriptElement = script as HTMLScriptElement;
          
          // Copy attributes
          Array.from(scriptElement.attributes).forEach(attr => {
            newScript.setAttribute(attr.name, attr.value);
          });
          
          // Copy content
          if (scriptElement.src) {
            newScript.src = scriptElement.src;
          } else {
            newScript.textContent = scriptElement.textContent;
          }
          
          // Insert at the beginning of body
          bodyElement.insertBefore(newScript, bodyElement.firstChild);
        } else if (script.tagName === 'NOSCRIPT') {
          // Insert noscript directly
          bodyElement.insertBefore(script.cloneNode(true), bodyElement.firstChild);
        }
      });
    }
  }, [bodyScripts]);

  return (
    <Helmet>
      {headScripts && (
        <script type="text/javascript">
          {headScripts}
        </script>
      )}
    </Helmet>
  );
};
