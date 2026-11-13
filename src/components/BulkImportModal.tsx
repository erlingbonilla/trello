import React, { useState } from 'react';
import { User } from '../types';
import { X, Upload, FileText, CheckCircle2, AlertTriangle, Users, Layers, Download } from 'lucide-react';
import { pullBoardStateFromServer } from '../services/dataStorage';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  allUsers: User[];
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  allUsers,
}) => {
  const [csvText, setCsvText] = useState('');
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
    details?: string[];
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<Array<{ orderNumber: string; type: string; username: string }>>([]);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      setCsvText(text);
      processPreview(text);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `Error al leer archivo: ${err.message}`,
      });
    } finally {
      e.target.value = '';
    }
  };

  const processPreview = (text: string) => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) {
      setParsedPreview([]);
      setFeedback(null);
      return;
    }

    const items: Array<{ orderNumber: string; type: string; username: string }> = [];
    const startIndex = lines[0].toLowerCase().includes('numero') || lines[0].toLowerCase().includes('orden') ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      // Support semicolon or comma or tab
      const delimiter = line.includes(';') ? ';' : line.includes('\t') ? '\t' : ',';
      const parts = line.split(delimiter).map(p => p.trim());
      if (parts.length >= 3) {
        items.push({
          orderNumber: parts[0],
          type: parts[1].toUpperCase(),
          username: parts[2],
        });
      } else if (parts.length === 2) {
        // Assume Order + User, default OV
        items.push({
          orderNumber: parts[0],
          type: 'OV',
          username: parts[1],
        });
      }
    }

    setParsedPreview(items);
    if (items.length > 0) {
      setFeedback({
        type: 'info',
        message: `Se detectaron ${items.length} filas válidas en el texto/archivo CSV.`,
      });
    } else {
      setFeedback({
        type: 'error',
        message: 'No se detectaron columnas con formato: Numero;Tipo;Usuario (o Numero,Tipo,Usuario)',
      });
    }
  };

  const handleTextChange = (val: string) => {
    setCsvText(val);
    processPreview(val);
  };

  const handleSubmit = async () => {
    if (parsedPreview.length === 0) {
      setFeedback({
        type: 'error',
        message: 'Cargue un archivo CSV o pegue texto con el formato Numero;Tipo;Usuario.',
      });
      return;
    }

    setIsProcessing(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/board/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: parsedPreview,
          users: allUsers.map(u => ({ id: u.id, username: u.username, name: u.name })),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Error en el servidor al importar tarjetas');
      }

      await pullBoardStateFromServer();
      onSuccess();

      const detailMsg = data.skippedCount > 0
        ? `¡Importación completada! Se crearon ${data.importedCount} tarjetas en el tablero. ${data.skippedCount} órdenes no se pudieron crear (ej. sin productos ST en OneDrive).`
        : `¡Importación exitosa! Se crearon ${data.importedCount} tarjetas y se asignaron en el tablero de acuerdo al archivo CSV.`;

      const reasons = (data.skippedOrders || []).map((s: any) => `Orden #${s.order}: ${s.reason}`);

      setFeedback({
        type: 'success',
        message: detailMsg,
        details: reasons,
      });

      // Only auto-close if there were no skipped orders so user can review any warnings
      if (!data.skippedCount) {
        setTimeout(() => {
          onClose();
        }, 2500);
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `Fallo al importar: ${err.message}`,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadSample = () => {
    const sample = `Numero;Tipo;Usuario\n200408636;OV;MARCO\n200408689;OV;MARCO\n200408707;OV;MARCO\n200408695;OV;HUGO\n200408269;OV;Gerardo\n200408677;OV;MIGUEL\n200408680;OV;JOSE\n200407765;OV;RICARDO\n200064490;TR;RICARDO\n`;
    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'plantilla_tarjetas_masivas.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Importación Masiva de Tarjetas (CSV)
              </h2>
              <p className="text-xs text-slate-500">
                Cargue órdenes en lote asignadas directamente a pickeadores
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto text-xs">
          {/* Format Guide & Download Sample Button */}
          <div className="p-3.5 bg-indigo-50/70 rounded-xl border border-indigo-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <span className="font-bold text-indigo-950 text-xs block mb-0.5">
                Formato requerido: <code className="bg-white px-1.5 py-0.5 rounded border border-indigo-200 font-mono text-[11px]">Numero;Tipo;Usuario</code>
              </span>
              <p className="text-[11px] text-indigo-900/80">
                Acepta archivos CSV delimitados por punto y coma (;) o comas (,). Ejemplo: <span className="font-mono">200408636;OV;MARCO</span>
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadSample}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-indigo-50 text-indigo-700 font-bold rounded-lg border border-indigo-300 shadow-2xs shrink-0 text-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar Plantilla CSV</span>
            </button>
          </div>

          {/* Action Zone: Upload file or Paste */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between">
              <div>
                <span className="font-bold text-slate-800 text-xs block mb-1">
                  1. Subir archivo CSV de Trello
                </span>
                <p className="text-[11px] text-slate-500 mb-3">
                  Seleccione el archivo exportado o generado desde su computadora.
                </p>
              </div>
              <label className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm cursor-pointer transition-colors text-xs">
                <Upload className="w-3.5 h-3.5" />
                <span>Seleccionar archivo CSV</span>
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-800 text-xs block mb-1">
                2. O Pegar texto directamente
              </span>
              <p className="text-[11px] text-slate-500 mb-2">
                Pegue filas copiadas de Excel o Trello.
              </p>
              <textarea
                rows={3}
                value={csvText}
                onChange={e => handleTextChange(e.target.value)}
                placeholder="200408636;OV;MARCOS&#10;200408689;OV;MARCOS&#10;200408695;OV;HUGO..."
                className="w-full p-2 bg-white rounded-lg border border-slate-300 font-mono text-[11px] focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Feedback banner */}
          {feedback && (
            <div
              className={`p-3 rounded-xl flex flex-col gap-1.5 text-xs ${
                feedback.type === 'error'
                  ? 'bg-red-50 text-red-800 border border-red-200'
                  : feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-blue-50 text-blue-800 border border-blue-200'
              }`}
            >
              <div className="flex items-center gap-2 font-medium">
                {feedback.type === 'error' ? (
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                )}
                <span>{feedback.message}</span>
              </div>
              {feedback.details && feedback.details.length > 0 && (
                <div className="mt-1 pt-1.5 border-t border-slate-200/60 max-h-24 overflow-y-auto space-y-0.5 text-[11px] font-mono">
                  {feedback.details.map((d, i) => (
                    <div key={i}>• {d}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Preview Table of rows detected */}
          {parsedPreview.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Vista Previa de Filas a Crear ({parsedPreview.length})</span>
                <span className="text-[11px] text-slate-500 font-normal">
                  Se cruzarán con productos ST y movimientos WMS
                </span>
              </div>
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Orden #</th>
                      <th className="py-2 px-3">Tipo</th>
                      <th className="py-2 px-3">Usuario Asignado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {parsedPreview.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-1.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-1.5 px-3 font-mono font-bold text-slate-900">
                          {item.orderNumber}
                        </td>
                        <td className="py-1.5 px-3">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              item.type === 'TR'
                                ? 'bg-slate-800 text-white'
                                : item.type === 'OF'
                                ? 'bg-purple-700 text-white'
                                : 'bg-emerald-600 text-white'
                            }`}
                          >
                            {item.type}
                          </span>
                        </td>
                        <td className="py-1.5 px-3 font-medium text-slate-700">
                          {item.username}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-200 rounded-lg text-xs transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isProcessing || parsedPreview.length === 0}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-lg shadow-sm text-xs transition-colors flex items-center gap-1.5"
          >
            <Upload className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
            <span>
              {isProcessing
                ? 'Importando y Cruzando con WMS...'
                : `Importar ${parsedPreview.length} Tarjetas al Tablero`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
