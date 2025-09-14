import fs from 'fs-extra';
import pdf from 'pdf-parse';
import { BKP_CODES, validateBKPCode } from '../../../shared/bkp-codes';
import type { BKPSection, ArticleItem } from '../../../shared/types';

export class PDFService {
  
  async parsePDF(filePath: string): Promise<{ sections: BKPSection[] }> {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const pdfData = await pdf(dataBuffer);
      const text = pdfData.text;
      
      console.log('PDF Text Length:', text.length);
      console.log('First 500 chars:', text.substring(0, 500));
      
      return this.extractBKPSections(text);
      
    } catch (error) {
      console.error('PDF Parsing Error:', error);
      throw new Error(`Fehler beim Lesen der PDF: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  }

  private extractBKPSections(text: string): { sections: BKPSection[] } {
    const sections: BKPSection[] = [];
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let currentSection: BKPSection | null = null;
    let i = 0;
    
    console.log(`Processing ${lines.length} lines from PDF...`);
    
    while (i < lines.length) {
      const line = lines[i].trim();
      
      if (!line) {
        i++;
        continue;
      }

      // Skip header lines and page information
      if (this.shouldSkipLine(line)) {
        i++;
        continue;
      }

      // Handle section headers (like "24 Heizung", "241 Wärmegewinnung", etc.)
      const bkpMatch = this.parseBKPHeader(line);
      if (bkpMatch) {
        // Finalize previous section
        if (currentSection) {
          sections.push(currentSection);
        }
        
        // Create new section with header item
        currentSection = {
          bkpCode: bkpMatch.code,
          category: bkpMatch.description,
          items: []
        };

        // Add the section header as a styled row
        currentSection.items.push({
          artikel: '', // Empty for section headers
          text: `${bkpMatch.code} ${bkpMatch.description}`,
          menge: '',
          me: '',
          preis: '',
          betrag: '',
          isSection: true // Flag for styling
        });
        
        console.log(`Found BKP Section: ${bkpMatch.code} - ${bkpMatch.description}`);
        i++;
        continue;
      }

      // Handle Total lines
      if (line.startsWith('Total ') && line.length < 80) {
        if (currentSection) {
          currentSection.items.push({
            artikel: '',
            text: line,
            menge: '',
            me: '',
            preis: '',
            betrag: '',
            isSection: true // Flag for styling
          });
          console.log(`  Added Total: ${line}`);
        }
        i++;
        continue;
      }

      // Skip table headers
      if (this.isTableHeader(line)) {
        i++;
        continue;
      }

      // Check for article number at the beginning of line
      const articleMatch = line.match(/^(\d{5,6}\.\d{2,3})\s+(.+)/);
      if (articleMatch && currentSection) {
        const articleNum = articleMatch[1];
        let description = articleMatch[2].trim();
        let quantity = '';
        let unit = '';

        // Look ahead for quantity and unit in next lines
        let j = i + 1;
        while (j < lines.length && j < i + 3) {
          const nextLine = lines[j].trim();
          
          // Check for quantity/unit pattern (e.g., "6 Stk", "15 m")
          const qtyMatch = nextLine.match(/^(\d+(?:\.\d+)?)\s+(Stk|m|mm|cm|kg|g|l|ml|Stück|Meter|%|Fr\.)\s*$/i);
          if (qtyMatch) {
            quantity = qtyMatch[1];
            unit = qtyMatch[2];
            i = j; // Skip the quantity line
            console.log(`    Found quantity: ${quantity} ${unit}`);
            break;
          }
          
          // Check for dimension info that should be added to description
          const dimensionMatch = nextLine.match(/^[\d\s×xX,.-]+(?:\s*mm|\s*cm|\s*m)?\s*$/);
          if (dimensionMatch && nextLine.length < 30) {
            description += ', ' + nextLine;
            i = j;
            console.log(`    Added dimensions: ${nextLine}`);
            break;
          }
          
          // Stop if we hit another article or section
          if (/^\d{5,6}\.\d{2,3}/.test(nextLine) || /^Total/.test(nextLine) || /^\d+\s+[A-Z]/.test(nextLine)) {
            break;
          }
          
          j++;
        }

        // Clean up description
        description = this.cleanDescription(description);

        currentSection.items.push({
          artikel: articleNum,
          text: description,
          menge: quantity,
          me: unit,
          preis: '',
          betrag: ''
        });

        console.log(`  Added Article: ${articleNum} - ${description.substring(0, 40)}...`);
        i++;
        continue;
      }

      // Handle lines that might contain multiple article numbers
      const multiArticleMatches = [...line.matchAll(/(\d{5,6}\.\d{2,3})/g)];
      
      if (multiArticleMatches.length > 1 && currentSection) {
        console.log(`  Found line with ${multiArticleMatches.length} articles: ${line.substring(0, 60)}...`);
        
        // Split line by article numbers and extract descriptions
        const segments = line.split(/\d{5,6}\.\d{2,3}/);
        
        multiArticleMatches.forEach((match, index) => {
          const articleNum = match[1];
          let description = '';
          
          // Try to get description from the segment after the article number
          if (index < segments.length - 1) {
            description = segments[index + 1].trim();
            // Clean up description - remove leading commas and extra spaces
            description = description.replace(/^[,\s]+/, '').replace(/\s+/g, ' ');
            
            // Limit description length and clean it up
            if (description.length > 100) {
              description = description.substring(0, 100).trim();
            }
          }
          
          description = this.cleanDescription(description);
          
          if (description.length > 5 && currentSection) {
            currentSection.items.push({
              artikel: articleNum,
              text: description,
              menge: '',
              me: '',
              preis: '',
              betrag: ''
            });
            console.log(`    Extracted: ${articleNum} - ${description.substring(0, 40)}...`);
          }
        });
        
        i++;
        continue;
      }

      // Handle standalone quantity lines that should be added to the last item
      const quantityMatch = line.match(/^(\d+(?:\.\d+)?)\s+(Stk|m|mm|cm|kg|g|l|ml|Stück|Meter|%|Fr\.)\s*$/i);
      if (quantityMatch && currentSection && currentSection.items.length > 0) {
        const lastItem = currentSection.items[currentSection.items.length - 1];
        if (lastItem && !lastItem.menge && !lastItem.isSection) {
          lastItem.menge = quantityMatch[1];
          lastItem.me = quantityMatch[2];
          console.log(`  Updated last item with quantity: ${quantityMatch[1]} ${quantityMatch[2]}`);
        }
        i++;
        continue;
      }

      // Handle standalone dimension lines
      const dimensionMatch = line.match(/^([\d\s×xX,.-]+(?:\s*mm|\s*cm|\s*m|\s*x\s*\d+|\s*×\s*\d+)?)\s*$/);
      if (dimensionMatch && currentSection && currentSection.items.length > 0) {
        const lastItem = currentSection.items[currentSection.items.length - 1];
        if (lastItem && lastItem.text && !lastItem.isSection) {
          lastItem.text += ', ' + dimensionMatch[1].trim();
          console.log(`  Added dimensions to last item: ${dimensionMatch[1].trim()}`);
        }
        i++;
        continue;
      }

      // Handle other descriptive text lines (append to current section as general text)
      if (currentSection && line.length > 10 && !this.isPageInfo(line)) {
        // Only add if it's not already covered by other patterns
        const cleanedLine = this.cleanDescription(line);
        if (cleanedLine.length > 5) {
          currentSection.items.push({
            artikel: '',
            text: cleanedLine,
            menge: '',
            me: '',
            preis: '',
            betrag: ''
          });
          console.log(`  Added general text: ${cleanedLine.substring(0, 40)}...`);
        }
      }
      
      i++;
    }
    
    // Finalize last section
    if (currentSection) {
      sections.push(currentSection);
    }
    
    console.log(`Total BKP Sections found: ${sections.length}`);
    sections.forEach(section => {
      const articleCount = section.items.filter(item => item.artikel && /\d{5,6}\.\d{2,3}/.test(item.artikel)).length;
      console.log(`  ${section.bkpCode}: ${section.items.length} items (${articleCount} articles)`);
    });
    
    return { sections };
  }

  private parseBKPHeader(line: string): { code: string, description: string } | null {
    // Matches patterns like "24 Heizung", "241.2 Soleleitungen im Gebäude"
    const match = line.match(/^(\d{1,3}(?:\.\d{1,2})?)\s+(.+)/);
    if (match && match[2].length > 2 && match[2].length < 60) {
      // Additional validation: description should contain letters
      if (/[A-Za-zÄÖÜäöüß]/.test(match[2])) {
        return {
          code: match[1],
          description: match[2].trim()
        };
      }
    }
    return null;
  }

  private cleanDescription(text: string): string {
    return text
      .replace(/\.{3,}/g, '') // Remove dotted lines
      .replace(/\s+/g, ' ')   // Normalize spaces
      .replace(/,$/, '')      // Remove trailing comma
      .trim();
  }

  private shouldSkipLine(line: string): boolean {
    return (
      line.toLowerCase().includes('übertrag') ||
      line.toLowerCase().includes('projekt-nr:') ||
      line.toLowerCase().includes('seite:') ||
      line.toLowerCase().includes('datum:') ||
      !!line.match(/^\.{3,}/) ||  // Starts with dots
      !!line.match(/\.{5,}/) ||   // Contains many dots
      line.toLowerCase().includes('kostenzusammenstellung') ||
      line.includes('Artikel Text Menge ME') ||
      line.includes('(CHF)') && line.length < 20
    );
  }

  private isTableHeader(line: string): boolean {
    const headerKeywords = ['artikel', 'text', 'menge', 'me', 'preis', 'betrag'];
    const lowercaseLine = line.toLowerCase();
    return headerKeywords.filter(keyword => lowercaseLine.includes(keyword)).length >= 3;
  }

  private isPageInfo(line: string): boolean {
    return (
      line.includes('Seite:') ||
      line.includes('Projekt-Nr:') ||
      line.includes('Datum:') ||
      line.length < 3
    );
  }

  // Legacy methods kept for compatibility (but improved)
  private parseArticleLine(line: string): ArticleItem | null {
    const productMatch = line.match(/^(\d{5,6}\.\d{2,3})\s+(.+)/);
    if (!productMatch) return null;
    
    const [, artikel, restText] = productMatch;
    const cleanText = this.cleanDescription(restText);
    const quantityData = this.extractQuantityFromText(cleanText);
    
    return {
      artikel,
      text: quantityData.text,
      menge: quantityData.menge,
      me: quantityData.me,
      preis: '',
      betrag: ''
    };
  }

  private parseTextWithQuantity(line: string): ArticleItem | null {
    const match = line.match(/(.+?)(\d+(?:[\.,]\d+)?)\s+(m|Stk|kg|l|%|Fr\.|CHF)\s*.*$/);
    if (!match) return null;
    
    const [, textPart, menge, me] = match;
    const cleanText = this.cleanDescription(textPart);
    
    return {
      text: cleanText,
      menge: menge.replace(',', '.'),
      me,
      preis: '',
      betrag: ''
    };
  }

  private parseTotal(line: string): ArticleItem | null {
    const totalMatch = line.match(/^Total\s+(\d{1,3}(?:\.\d{1,2})?)\s+(.+)/);
    if (totalMatch) {
      return {
        artikel: `Total ${totalMatch[1]}`,
        text: totalMatch[2],
        menge: '',
        me: '',
        preis: '',
        betrag: 'SUMME',
        isSection: true
      };
    }
    return null;
  }

  private extractQuantityFromText(text: string): { text: string, menge: string, me: string } {
    const quantityMatch = text.match(/(.+?)(\d+(?:[\.,]\d+)?)\s+(m|Stk|kg|l|%|Fr\.|CHF)\s*.*$/);
    
    if (quantityMatch) {
      return {
        text: this.cleanDescription(quantityMatch[1]),
        menge: quantityMatch[2].replace(',', '.'),
        me: quantityMatch[3]
      };
    }
    
    return {
      text: this.cleanDescription(text),
      menge: '',
      me: ''
    };
  }
}