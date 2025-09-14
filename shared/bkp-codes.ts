// BKP-Codes Datenbank basierend auf der Schweizer BKP-Struktur

export const BKP_CODES = {
    // Hauptkategorie 24: Heizungs-, Lüftungs-, Klimaanlagen
    "24": "Heizungs-, Lüftungs-, Klimaanlagen",
    
    // 240er Bereich - Übergangsposition  
    "240": "Übergangsposition",
    "240.1": "Übergangsposition",
    
    // 241er Bereich - Energiezulieferung, Lagerung
    "241": "Energiezulieferung, Lagerung", 
    "241.1": "Zulieferung, Energieträger, Lagerung",
    "241.2": "Soleleitungen im Gebäude",
    "241.5": "Apparate und Armaturen",
    "241.6": "Transport und Montage",
    "241.9": "Dämmung Leitungen",
    "241.10": "Dämmung Sondenverteiler",
    
    // 242er Bereich - Wärmeerzeugung
    "242": "Wärmeerzeugung",
    "242.0": "Sole/Wasser-Wärmepumpe Heizen / Kühlen",
    "242.1": "Wärmeerzeugung",
    "242.2": "Armaturen",
    "242.3": "Heizungsleitungen im Technikraum", 
    "242.4": "Apparate und Armaturen",
    "242.5": "Transport und Montage",
    "242.6": "Dämmungen Leitungen",
    "242.7": "Demontagearbeiten Heizung",
    "242.8": "Thermostatventile Heizkörper",
    "242.9": "Wasseranschluss Wassererwärmer",
    
    // 243er Bereich - Wärmeverteilung
    "243": "Wärmeverteilung",
    "243.1": "Bodenheizung",
    "243.2": "Leitungen", 
    "243.4": "Transport und Montage",
    "243.5": "Dämmung Leitungen",
    "243.6": "Brandschutzdämmung Deckendurchführung",
    "243.7": "Stellantriebe",
    
    // 244er Bereich - Lüftungsanlagen
    "244": "Lüftungsanlagen",
    "244.1": "Wärme- und Wasserzähler",
    
    // 245er Bereich - Klimaanlagen
    "245": "Klimaanlagen",
    "245.1": "Bodendämmung",
    
    // Weitere relevante Codes
    "246": "Füllung mit demineralisiertem Wasser",
    "247": "Heizprovisorium, Bauaustrockung", 
    "250": "Revisionsunterlagen"
  };
  
  export const BKP_SHEET_MAPPING = {
    "240": "BKP 240 Übergangsposition",
    "241": "BKP 241 Energiegewinnung", 
    "242": "BKP 242 Wärmeerzeugung",
    "243": "BKP 243 Wärmeverteilung"
  };
  
  export const BKP_SUBCATEGORIES = {
    // Energiegewinnung Unterkategorien
    "241.1.0": "APPARATE",
    "241.1.1": "Rohrleitungen", 
    "241.1.2": "Armaturen, Instrumente",
    "241.1.5": "Transport und Montage",
    
    // Wärmeerzeugung Unterkategorien
    "242.1.0": "APPARATE",
    "242.1.1": "Rohrleitungen",
    "242.1.2": "Armaturen, Instrumente", 
    "242.1.3": "Regulierung",
    
    // Wärmeverteilung Unterkategorien
    "243.1.0": "APPARATE",
    "243.1.1": "Rohrleitungen",
    "243.1.2": "Armaturen, Instrumente",
    "243.1.3": "Regulierung"
  };
  
  // Hilfsfunktionen für BKP-Code Validierung
  export const validateBKPCode = (code: string): boolean => {
    return code in BKP_CODES;
  };
  
  export const getBKPMainCategory = (code: string): string => {
    const mainCode = code.split('.')[0];
    return mainCode;
  };
  
  export const getBKPSheetName = (code: string): string | undefined => {
    const mainCode = getBKPMainCategory(code);
    return BKP_SHEET_MAPPING[mainCode];
  };
  
  export const getSubCategory = (description: string): string => {
    const text = description.toLowerCase();
    
    if (text.includes('rohr') || text.includes('leitung')) {
      return 'Rohrleitungen';
    }
    if (text.includes('armatur') || text.includes('ventil') || text.includes('hahn')) {
      return 'Armaturen, Instrumente';
    }
    if (text.includes('pumpe') || text.includes('kessel') || text.includes('wärmepumpe')) {
      return 'APPARATE';
    }
    if (text.includes('montage') || text.includes('transport') || text.includes('inbetriebnahme')) {
      return 'Transport und Montage';
    }
    if (text.includes('dämmung') || text.includes('isolation')) {
      return 'Dämmungen';
    }
    
    return 'APPARATE'; // Standard-Fallback
  };