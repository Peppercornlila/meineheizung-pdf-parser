// Shared TypeScript types für Frontend und Backend

// Shared TypeScript types für Frontend und Backend

export interface ArticleItem {
  artikel?: string;           // Artikelnummer (z.B. "80010.70")
  text: string;              // Beschreibung
  menge: string;             // Menge (z.B. "4")
  me: string;                // Mengeneinheit (z.B. "Stk", "m")
  preis: string;             // Einzelpreis
  betrag: string;            // Gesamtbetrag
  isSection?: boolean;       // Neu: Flag für Abschnittstittel (graue Hinterlegung)
}

export interface BKPSection {
  bkpCode: string;           // z.B. "241.2", "242.0"
  category: string;          // z.B. "Soleleitungen im Gebäude"
  items: ArticleItem[];      // Array von Artikeln in dieser Kategorie
}
  
  export interface ParsedPDFData {
    sections: BKPSection[];
    metadata: {
      fileName: string;
      fileSize: number;
      processingTime: number;
      totalItems: number;
      validBKPCodes: number;
    };
  }
  
  export interface BKPGroup {
    name: string;              // z.B. "BKP 241 Energiegewinnung"
    items: (ArticleItem & { 
      bkpCode: string; 
      category: string; 
      subCategory?: string; 
    })[];
  }
  
  export interface ExcelOutput {
    bkpGroups: Record<string, BKPGroup>;
    totalItems: number;
    templateStructure: {
      sheets: number;
      columns: string[];
    };
  }
  
  export interface APIResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
  }