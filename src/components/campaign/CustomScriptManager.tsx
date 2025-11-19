import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';

interface CustomScriptManagerProps {
  headScripts?: string;
  bodyScripts?: string;
}

export const CustomScriptManager = ({ headScripts, bodyScripts }: CustomScriptManagerProps) => {
  useEffect(() => {
    // Inject body scripts
    if (bodyScripts && bodyScripts.trim()) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = bodyScripts;
      
      // Insert scripts/noscripts at the beginning of body
      const bodyElement = document.body;
      while (tempDiv.firstChild) {
        bodyElement.insertBefore(tempDiv.firstChild, bodyElement.firstChild);
      }
    }
  }, [bodyScripts]);

  if (!headScripts || !headScripts.trim()) {
    return null;
  }

  return (
    <Helmet>
      {headScripts.split('</script>').map((scriptContent, index) => {
        if (!scriptContent.trim()) return null;
        
        const scriptMatch = scriptContent.match(/<script[^>]*>([\s\S]*)/i);
        if (scriptMatch) {
          const attributes = scriptContent.match(/<script([^>]*)>/i)?.[1] || '';
          const content = scriptMatch[1];
          
          // Parse attributes
          const typeMatch = attributes.match(/type=["']([^"']*)["']/i);
          const asyncMatch = attributes.match(/async/i);
          
          return (
            <script
              key={`head-script-${index}`}
              type={typeMatch ? typeMatch[1] : 'text/javascript'}
              async={!!asyncMatch}
              dangerouslySetInnerHTML={{ __html: content }}
            />
          );
        }
        return null;
      })}
    </Helmet>
  );
};
