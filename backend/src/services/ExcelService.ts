import ExcelJS from 'exceljs';
import type { ParsedPDFData, BKPSection, ArticleItem } from '../../../shared/types';

export class ExcelService {

  async generateExcel(parsedData: ParsedPDFData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    
    // Erstelle ein einziges Hauptsheet (wie im manuellen Beispiel)
    this.createMainSheet(workbook, parsedData.sections);
    
    // Erstelle Übersichts-Sheet mit BKP-Totals
    this.createSummarySheet(workbook, parsedData);
    
    return await workbook.xlsx.writeBuffer() as Buffer;
  }

  private createMainSheet(workbook: ExcelJS.Workbook, sections: BKPSection[]) {
    const worksheet = workbook.addWorksheet('Haupttabelle');
    
    // Projekt-Header
    worksheet.addRow(['Projekt-Nr.: H24-1215yk', '', 'Datum', '', new Date().toLocaleDateString('de-CH')]);
    worksheet.addRow(['Projekt-Titel: PDF zu Excel Konvertierung']);
    worksheet.addRow([]);
    worksheet.addRow([]);
    worksheet.addRow([]);
    
    // Alle Artikel aus allen Sektionen in ein Sheet
    sections.forEach(section => {
      section.items.forEach(item => {
        // BKP-Header (ohne Artikelnummer)
        if (item.text.match(/^\d{2,3}(\.\d{1,2})?\s+/)) {
          const row = worksheet.addRow(['', item.text, '', '', '', '']);
          this.styleBKPHeader(row);
        }
        // Tabellen-Header
        else if (item.text.toLowerCase().includes('artikel') && 
                 item.text.toLowerCase().includes('text')) {
          const headerRow = worksheet.addRow(['Artikel', 'Text', 'Menge', 'ME', 'Preis', 'Betrag']);
          this.styleTableHeader(headerRow);
          worksheet.addRow(['', '', '', '', 'CHF', 'CHF']);
        }
        // Total-Zeilen
        else if (item.artikel && item.artikel.startsWith('Total')) {
          const row = worksheet.addRow([item.artikel, item.text, '', '', '', 'FORMEL']);
          this.styleTotalRow(row);
        }
        // Artikel mit Produktnummer
        else if (item.artikel && !item.text.match(/^\d{2,3}(\.\d{1,2})?\s+/)) {
          const row = worksheet.addRow([
            item.artikel,
            item.text,
            item.menge,
            item.me,
            item.preis || '',
            item.betrag || ''
          ]);
          
          // Mehrzeilige Texte ermöglichen
          if (item.text.length > 50) {
            row.getCell(2).alignment = { wrapText: true };
            row.height = Math.max(20, Math.min(60, Math.ceil(item.text.length / 50) * 15));
          }
        }
        // Text ohne Produktnummer (Spalte A leer)
        else if (item.text && !item.artikel) {
          const row = worksheet.addRow([
            '',
            item.text,
            item.menge,
            item.me,
            item.preis || '',
            item.betrag || ''
          ]);
          
          // Mehrzeilige Texte
          if (item.text.length > 50) {
            row.getCell(2).alignment = { wrapText: true };
            row.height = Math.max(20, Math.min(60, Math.ceil(item.text.length / 50) * 15));
          }
        }
      });
    });
    
    // Spaltenbreiten setzen
    worksheet.getColumn(1).width = 12;  // Artikel
    worksheet.getColumn(2).width = 60;  // Text (breit für lange Beschreibungen)
    worksheet.getColumn(3).width = 10;  // Menge
    worksheet.getColumn(4).width = 8;   // ME
    worksheet.getColumn(5).width = 12;  // Preis
    worksheet.getColumn(6).width = 12;  // Betrag
  }

  private createSummarySheet(workbook: ExcelJS.Workbook, parsedData: ParsedPDFData) {
    const worksheet = workbook.addWorksheet('Übersicht');
    
    // Header
    worksheet.addRow(['PDF zu Excel Konvertierung - Übersicht']);
    worksheet.addRow([]);
    worksheet.addRow(['Datei:', parsedData.metadata.fileName]);
    worksheet.addRow(['Dateigröße:', `${(parsedData.metadata.fileSize / 1024).toFixed(1)} KB`]);
    worksheet.addRow(['Verarbeitungszeit:', `${parsedData.metadata.processingTime}ms`]);
    worksheet.addRow(['Datum:', new Date().toLocaleDateString('de-CH')]);
    worksheet.addRow([]);
    
    // BKP-Totals (wie im manuellen Beispiel)
    worksheet.addRow(['BKP-Kategorien:']);
    const headerRow = worksheet.addRow(['BKP-Code', 'Kategorie', 'Betrag CHF']);
    headerRow.eachCell(cell => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6E6FA' }
      };
    });
    
    // Berechne BKP-Totals
    const bkpTotals = this.calculateBKPTotals(parsedData.sections);
    
    bkpTotals.forEach(total => {
      worksheet.addRow([
        total.bkpCode,
        total.category,
        total.amount
      ]);
    });
    
    // Grand Total
    worksheet.addRow([]);
    const grandTotal = bkpTotals.reduce((sum, total) => sum + total.amount, 0);
    const totalRow = worksheet.addRow(['TOTAL', '', grandTotal]);
    totalRow.eachCell(cell => {
      cell.font = { bold: true };
    });
    
    // Spaltenbreiten
    worksheet.getColumn(1).width = 15;
    worksheet.getColumn(2).width = 40;
    worksheet.getColumn(3).width = 15;
  }

  private calculateBKPTotals(sections: BKPSection[]): Array<{bkpCode: string, category: string, amount: number}> {
    return sections.map(section => ({
      bkpCode: section.bkpCode,
      category: section.category,
      amount: 0 // TODO: Berechnung der tatsächlichen Beträge
    }));
  }

  private styleBKPHeader(row: ExcelJS.Row) {
    row.eachCell(cell => {
      cell.font = { bold: true, size: 12 };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD9D9D9' }
      };
    });
  }

  private styleTableHeader(row: ExcelJS.Row) {
    row.eachCell(cell => {
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'center' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6E6FA' }
      };
    });
  }

  private styleTotalRow(row: ExcelJS.Row) {
    row.eachCell(cell => {
      cell.font = { bold: true, italic: true };
    });
    
    // Summenformel für Betrag-Spalte
    const betragCell = row.getCell(6);
    betragCell.font = { bold: true };
    // TODO: Implementiere Summenformel basierend auf BKP-Bereich
  }
}