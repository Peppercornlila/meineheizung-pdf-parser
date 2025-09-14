import React, { useState, useRef } from 'react';
import { Upload, FileText, Download, CheckCircle, AlertCircle, Loader, BarChart3 } from 'lucide-react';
import axios from 'axios';
import type { ParsedPDFData, APIResponse } from '../../shared/types';

const API_BASE = 'http://localhost:3001/api';

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ParsedPDFData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setError(null);
      setResult(null);
    } else {
      setError('Bitte wählen Sie eine PDF-Datei aus.');
    }
  };

  const handleProcess = async () => {
    if (!file) return;
    
    setProcessing(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('pdf', file);
      
      const response = await axios.post<APIResponse<ParsedPDFData>>(
        `${API_BASE}/upload-pdf`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 30000, // 30 Sekunden Timeout
        }
      );
      
      if (response.data.success && response.data.data) {
        setResult(response.data.data);
      } else {
        setError(response.data.error || 'Unbekannter Fehler beim Verarbeiten der PDF');
      }
    } catch (err) {
      console.error('Upload Error:', err);
      if (axios.isAxiosError(err)) {
        if (err.code === 'ECONNABORTED') {
          setError('Timeout: Die Verarbeitung dauerte zu lange.');
        } else if (err.response?.data?.error) {
          setError(err.response.data.error);
        } else {
          setError(`Verbindungsfehler: ${err.message}`);
        }
      } else {
        setError('Unerwarteter Fehler beim Upload.');
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadExcel = async () => {
    if (!result) return;
    
    try {
      const response = await axios.post(
        `${API_BASE}/generate-excel`,
        { parsedData: result },
        {
          responseType: 'blob',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `BKP_Auswertung_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download Error:', err);
      setError('Fehler beim Generieren der Excel-Datei.');
    }
  };

  const resetForm = () => {
    setFile(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            PDF zu Excel Converter
          </h1>
          <p className="text-lg text-gray-600">
            Automatische Erkennung von Heizungsausschreibungen mit BKP-Codes
          </p>
        </div>

        {/* Upload Bereich */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".pdf"
            className="hidden"
          />
          
          {!file ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-400 transition-colors">
              <FileText className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">
                PDF-Datei hochladen
              </h3>
              <p className="text-gray-500 mb-6">
                Unterstützt werden Ausschreibungen mit BKP-Codes (max. 10MB)
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors text-lg font-medium"
              >
                <Upload className="inline h-5 w-5 mr-2" />
                Datei auswählen
              </button>
            </div>
          ) : (
            <div className="text-center space-y-6">
              <div className="flex items-center justify-center space-x-3">
                <FileText className="h-8 w-8 text-green-600" />
                <div className="text-left">
                  <p className="font-medium text-lg">{file.name}</p>
                  <p className="text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              
              <div className="flex space-x-4 justify-center">
                <button
                  onClick={handleProcess}
                  disabled={processing}
                  className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-lg font-medium"
                >
                  {processing ? (
                    <>
                      <Loader className="inline h-5 w-5 mr-2 animate-spin" />
                      Verarbeitung läuft...
                    </>
                  ) : (
                    'PDF verarbeiten'
                  )}
                </button>
                
                <button
                  onClick={resetForm}
                  disabled={processing}
                  className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 disabled:opacity-50 transition-colors"
                >
                  Neue Datei
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Fehler-Anzeige */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start">
            <AlertCircle className="h-5 w-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-red-800">Fehler aufgetreten</h4>
              <p className="text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Ergebnis-Anzeige */}
        {result && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center mb-6">
              <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
              <h3 className="text-2xl font-bold text-green-900">
                PDF erfolgreich verarbeitet
              </h3>
            </div>
            
            {/* Statistiken */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-3xl font-bold text-blue-600">{result.sections.length}</div>
                <div className="text-sm text-gray-600">BKP-Abschnitte</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-3xl font-bold text-green-600">{result.metadata.validBKPCodes}</div>
                <div className="text-sm text-gray-600">Gültige Codes</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-3xl font-bold text-purple-600">{result.metadata.totalItems}</div>
                <div className="text-sm text-gray-600">Artikel erkannt</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-3xl font-bold text-orange-600">{result.metadata.processingTime}ms</div>
                <div className="text-sm text-gray-600">Verarbeitungszeit</div>
              </div>
            </div>
            
            {/* BKP-Abschnitte Details */}
            <div className="mb-8">
              <h4 className="text-lg font-semibold mb-4 flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Erkannte BKP-Abschnitte
              </h4>
              <div className="space-y-3">
                {result.sections.map((section, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <span className="font-mono text-blue-600 font-semibold">{section.bkpCode}</span>
                      <span className="ml-3 text-gray-700">{section.category}</span>
                    </div>
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-medium">
                      {section.items.length} Artikel
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Download Button */}
            <div className="text-center">
              <button
                onClick={handleDownloadExcel}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors text-lg font-medium"
              >
                <Download className="inline h-5 w-5 mr-2" />
                Excel-Datei herunterladen
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;