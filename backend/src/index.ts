import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs-extra';
import dotenv from 'dotenv';
import { PDFService } from './services/PDFService';
import { ExcelService } from './services/ExcelService';
import type { APIResponse, ParsedPDFData } from '../../shared/types';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Upload-Konfiguration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    fs.ensureDirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const filename = `${timestamp}-${file.originalname}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Nur PDF-Dateien sind erlaubt!'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB Limit
  }
});

// Services
const pdfService = new PDFService();
const excelService = new ExcelService();

// Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Backend läuft',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/upload-pdf', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Keine PDF-Datei hochgeladen'
      } as APIResponse<null>);
    }

    console.log(`Processing PDF: ${req.file.originalname}`);
    
    // PDF analysieren
    const startTime = Date.now();
    const parsedData = await pdfService.parsePDF(req.file.path);
    const processingTime = Date.now() - startTime;

    // Metadaten hinzufügen
    const result: ParsedPDFData = {
      ...parsedData,
      metadata: {
        fileName: req.file.originalname,
        fileSize: req.file.size,
        processingTime,
        totalItems: parsedData.sections.reduce((sum, section) => sum + section.items.length, 0),
        validBKPCodes: parsedData.sections.length
      }
    };

    // Temporäre Datei löschen
    await fs.remove(req.file.path);

    res.json({
      success: true,
      data: result,
      message: 'PDF erfolgreich verarbeitet'
    } as APIResponse<ParsedPDFData>);

  } catch (error) {
    console.error('PDF Processing Error:', error);
    
    // Cleanup bei Fehler
    if (req.file) {
      await fs.remove(req.file.path).catch(console.error);
    }

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unbekannter Fehler beim Verarbeiten der PDF'
    } as APIResponse<null>);
  }
});

app.post('/api/generate-excel', async (req, res) => {
  try {
    const { parsedData } = req.body;
    
    if (!parsedData) {
      return res.status(400).json({
        success: false,
        error: 'Keine Daten für Excel-Generierung'
      } as APIResponse<null>);
    }

    const excelBuffer = await excelService.generateExcel(parsedData);
    const filename = `BKP_Auswertung_${new Date().toISOString().split('T')[0]}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(excelBuffer);

  } catch (error) {
    console.error('Excel Generation Error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Generieren der Excel-Datei'
    } as APIResponse<null>);
  }
});

// Error Handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server Error:', error);
  res.status(500).json({
    success: false,
    error: 'Interner Server-Fehler'
  } as APIResponse<null>);
});

app.listen(PORT, () => {
  console.log(`🚀 Backend Server läuft auf http://localhost:${PORT}`);
  console.log(`📄 API Dokumentation: http://localhost:${PORT}/api/health`);
});