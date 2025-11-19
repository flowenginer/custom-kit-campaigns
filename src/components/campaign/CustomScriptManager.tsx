import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';

interface CustomScriptManagerProps {
  headScripts?: string;
  bodyScripts?: string;
}

export const CustomScriptManager = ({ headScripts, bodyScripts }: CustomScriptManagerProps) => {
  console.log('🔧 CustomScriptManager renderizado:', { 
    hasHeadScripts: !!headScripts?.trim(), 
    hasBodyScripts: !!bodyScripts?.trim() 
  });

  useEffect(() => {
    // Inject body scripts
    if (bodyScripts && bodyScripts.trim()) {
      console.log('💉 Injetando body scripts:', bodyScripts.substring(0, 100));
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = bodyScripts;
      
      // Insert scripts/noscripts at the beginning of body
      const bodyElement = document.body;
      while (tempDiv.firstChild) {
        bodyElement.insertBefore(tempDiv.firstChild, bodyElement.firstChild);
      }
      console.log('✅ Body scripts injetados com sucesso');
    }
  }, [bodyScripts]);

  if (!headScripts || !headScripts.trim()) {
    console.log('⚠️ Nenhum head script para renderizar');
    return null;
  }

  console.log('✅ Renderizando head scripts via Helmet');

  // Parsing robusto de múltiplos scripts usando regex
  const scriptRegex = /<script([^>]*)>([\s\S]*?)<\/script>/gi;
  const scripts: Array<{ attributes: string; content: string }> = [];
  let match;

  while ((match = scriptRegex.exec(headScripts)) !== null) {
    scripts.push({
      attributes: match[1] || '',
      content: match[2] || ''
    });
  }

  console.log('✅ Renderizando head scripts via Helmet:', scripts.length, 'scripts encontrados');

  return (
    <Helmet>
      {scripts.map((script, index) => {
        try {
          const typeMatch = script.attributes.match(/type=["']([^"']*)["']/i);
          const asyncMatch = script.attributes.match(/async/i);
          
          return (
            <script
              key={`head-script-${index}`}
              type={typeMatch ? typeMatch[1] : 'text/javascript'}
              async={!!asyncMatch}
              dangerouslySetInnerHTML={{ __html: script.content }}
            />
          );
        } catch (error) {
          console.error(`❌ Erro ao processar script ${index}:`, error);
          return null;
        }
      })}
    </Helmet>
  );
};
