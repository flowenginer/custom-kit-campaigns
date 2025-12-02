/**
 * Abbreviates product names for compact display in Kanban cards.
 * This is VISUAL ONLY - does not modify database values.
 */
export const abbreviateProductName = (fullName: string | null | undefined): string => {
  if (!fullName) return '';
  
  let abbreviated = fullName;
  
  // Segment abbreviations (longer phrases first to avoid partial matches)
  const segmentMap: Record<string, string> = {
    'Energia Solar': 'EN SOL',
    'En Solar': 'EN SOL',
    'Construção Civil': 'CONST',
    'Construcao Civil': 'CONST',
    'Beach Tennis': 'BT',
    'Canoa Havaiana': 'CH',
    'Adventure': 'ADV',
    'Automotivo': 'AUTO',
    'Agro': 'AGRO',
    'Pesca': 'PESC',
    'Haras': 'HAR',
    'Telecom': 'TLC',
    'Refrigeração': 'REFR',
    'Refrigeracao': 'REFR',
    'Trilha': 'TRL',
    'Turismo': 'TUR',
    'Futevôlei': 'FTV',
    'Futevolei': 'FTV',
  };
  
  // Shirt type abbreviations (longer phrases first - MLZ before ML)
  const typeMap: Record<string, string> = {
    'Manga Longa Zíper': 'MLZ',
    'Manga Longa Ziper': 'MLZ',
    'Manga Longa': 'ML',
    'Manga Curta': 'MC',
    'Regata': 'REG',
    'Zíper': 'ZIP',
    'Ziper': 'ZIP',
  };
  
  // Apply segment abbreviations (case-insensitive)
  Object.entries(segmentMap).forEach(([full, abbr]) => {
    const regex = new RegExp(full, 'gi');
    abbreviated = abbreviated.replace(regex, abbr);
  });
  
  // Apply type abbreviations (case-insensitive)
  Object.entries(typeMap).forEach(([full, abbr]) => {
    const regex = new RegExp(full, 'gi');
    abbreviated = abbreviated.replace(regex, abbr);
  });
  
  // Abbreviate "Modelo" to "Mod"
  abbreviated = abbreviated.replace(/Modelo\s*/gi, 'Mod ');
  
  // Clean up extra spaces
  abbreviated = abbreviated.replace(/\s+/g, ' ').trim();
  
  return abbreviated;
};
