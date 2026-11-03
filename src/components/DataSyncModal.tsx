import React, { useState } from 'react';
import {
  getBodegas,
  getCards,
  getLiOrders,
  getTransactions,
  resetToInitialState,
  saveBodegas,
  saveLiOrders,
  saveTransactions,
  syncCardsWithTransactions,
} from '../services/dataStorage';
import { Card } from '../types';
import {
  parseBodegasCsv,
  parseExcelOrCsvTransactions,
  parseLiCsv,
} from '../services/fileParser';
import {
  Cloud,
  ExternalLink,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Database,
  X,
  FileText,
} from 'lucide-react';

interface DataSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataRefreshed: () => void;
}

export const DataSyncModal: React.FC<DataSyncModalProps> = ({
  isOpen,
  onClose,
  onDataRefreshed,
}) => {
  const oneDriveUrl =
    'https://1drv.ms/f/c/a97927f4218d75aa/IgCbdjPW2zZxQaUGss9bS2uwAcCLWIYQb6IgbAJmCI0lvZw?e=LmSKmD';

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [showPasteBox, setShowPasteBox] = useState(false);
  const [directFileUrl, setDirectFileUrl] = useState('');
  const [syncingUrl, setSyncingUrl] = useState(false);
  const [folderSyncing, setFolderSyncing] = useState(false);
  const [folderFilesFound, setFolderFilesFound] = useState<string[]>([]);

  if (!isOpen) return null;

  const currentLi = getLiOrders();
  const currentTxs = getTransactions();
  const currentBodegas = getBodegas();

  // Engine: resolveOneDriveFolderContext via backend API
  const handleSyncFolderAutomated = async () => {
    setFolderSyncing(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/onedrive/sync-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderUrl: oneDriveUrl }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al conectar con la carpeta de OneDrive');
      }

      setFolderFilesFound(data.filesFound || []);

      // Refresh active cards against server transactions in batch
      const activeCards = getCards();
      const orderNumbers = Array.from(new Set(activeCards.map((c: Card) => c.orderNumber)));
      if (orderNumbers.length > 0) {
        try {
          const batchRes = await fetch('/api/onedrive/batch-transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderNumbers }),
          });
          const batchData = await batchRes.json();
          if (batchData.success && batchData.transactions?.length > 0) {
            const existingTxs = getTransactions();
            const mergedTxs = [
              ...batchData.transactions,
              ...existingTxs.filter((e: any) => !batchData.transactions.some((t: any) => t.id === e.id)),
            ];
            saveTransactions(mergedTxs);
          }
        } catch (e) {
          console.warn('Could not batch-sync transactions:', e);
        }
      }

      const syncResult = syncCardsWithTransactions();
      setFeedback({
        type: 'success',
        message: `¡Sincronización automática de carpeta completada con éxito! Archivos procesados: ${data.filesFound.join(', ')}. Base de datos en servidor: ${data.liCount} líneas de _li y ${data.trCount} transacciones de _tr y Productividad.`,
      });
      onDataRefreshed();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `Fallo al sincronizar carpeta: ${err.message}`,
      });
    } finally {
      setFolderSyncing(false);
    }
  };

  const handleSyncFromDirectUrl = async () => {
    if (!directFileUrl.trim()) return;
    setSyncingUrl(true);
    setFeedback(null);
    try {
      let targetUrl = directFileUrl.trim();
      if (!targetUrl.includes('download=1')) {
        targetUrl += targetUrl.includes('?') ? '&download=1' : '?download=1';
      }

      const res = await fetch(targetUrl);
      if (!res.ok) {
        throw new Error(`Microsoft OneDrive respondió con código ${res.status}.`);
      }

      const text = await res.text();
      const records = parseLiCsv(text);
      if (records.length === 0) {
        throw new Error('No se detectaron registros válidos en el archivo descargado.');
      }

      const existing = getLiOrders();
      const merged = [...records, ...existing.filter(e => !records.some(r => r.orderNumber === e.orderNumber && r.productCode === e.productCode))];
      saveLiOrders(merged);
      syncCardsWithTransactions();
      setFeedback({
        type: 'success',
        message: `¡Descarga exitosa! Se sincronizaron ${records.length} registros desde el enlace de OneDrive.`,
      });
      setDirectFileUrl('');
      onDataRefreshed();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `No se pudo descargar automáticamente: ${err.message}. Para carpetas completas, use el botón "Abrir en OneDrive" para descargar el archivo y arrastrarlo aquí.`,
      });
    } finally {
      setSyncingUrl(false);
    }
  };

  const handlePasteLiSubmit = () => {
    if (!pasteText.trim()) return;
    try {
      const records = parseLiCsv(pasteText);
      if (records.length === 0) {
        setFeedback({
          type: 'error',
          message: 'No se detectaron filas válidas de órdenes en el texto pegado. Verifique que contenga columnas Orden, Cliente, Producto.',
        });
      } else {
        const existing = getLiOrders();
        const merged = [...records, ...existing.filter(e => !records.some(r => r.orderNumber === e.orderNumber && r.productCode === e.productCode))];
        saveLiOrders(merged);
        setFeedback({
          type: 'success',
          message: `¡Se incorporaron exitosamente ${records.length} líneas de producto desde el texto pegado!`,
        });
        setPasteText('');
        setShowPasteBox(false);
        syncCardsWithTransactions();
        onDataRefreshed();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: `Error al procesar texto: ${err.message}` });
    }
  };

  // Handle uploading _li CSV file
  const handleLiFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      const text = await file.text();
      const records = parseLiCsv(text);
      if (records.length === 0) {
        setFeedback({
          type: 'error',
          message: 'No se encontraron registros válidos en el archivo _li. Verifique las columnas.',
        });
      } else {
        saveLiOrders(records);
        setFeedback({
          type: 'success',
          message: `Se cargaron exitosamente ${records.length} registros del archivo _li (${file.name}).`,
        });
        syncCardsWithTransactions();
        onDataRefreshed();
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `Error al leer archivo _li: ${err.message || 'Formato inválido'}`,
      });
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  // Handle uploading _tr or Productividad Excel / CSV file
  const handleTransactionsFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: '_tr' | 'productividad'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      const buffer = await file.arrayBuffer();
      const newTxs = parseExcelOrCsvTransactions(buffer, file.name, type);

      if (newTxs.length === 0) {
        setFeedback({
          type: 'error',
          message: `No se pudieron extraer transacciones de ${file.name}. Asegúrese de que sea formato Excel (.xlsx) o CSV.`,
        });
      } else {
        const existing = getTransactions();
        // Merge or replace
        const combined = [...newTxs, ...existing.filter(e => !newTxs.some(n => n.id === e.id))];
        saveTransactions(combined);

        const syncResult = syncCardsWithTransactions();
        setFeedback({
          type: 'success',
          message: `Cargadas ${newTxs.length} transacciones de ${file.name}. Tablero sincronizado (${syncResult.updatedCount} actualizadas, ${syncResult.movedToDespachoCount} enviadas a Despacho, ${syncResult.completedCount} finalizadas).`,
        });
        onDataRefreshed();
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `Error al procesar archivo Excel: ${err.message || 'Error de lectura'}`,
      });
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  // Handle uploading bodegas CSV
  const handleBodegasUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      const text = await file.text();
      const records = parseBodegasCsv(text);
      if (records.length === 0) {
        setFeedback({
          type: 'error',
          message: 'No se encontraron registros de bodegas en el CSV.',
        });
      } else {
        saveBodegas(records);
        setFeedback({
          type: 'success',
          message: `Catálogo de bodegas actualizado con ${records.length} registros.`,
        });
        onDataRefreshed();
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `Error al leer CSV de bodegas: ${err.message}`,
      });
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  // Run full sync calculation
  const handleRunFullSync = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const result = syncCardsWithTransactions();
      setFeedback({
        type: 'success',
        message: `Sincronización completa: ${result.updatedCount} tarjetas actualizadas, ${result.movedToDespachoCount} copiadas a Despacho, ${result.completedCount} finalizadas y eliminadas del tablero.`,
      });
      setIsProcessing(false);
      onDataRefreshed();
    }, 300);
  };

  // Reset to sample initial state
  const handleResetData = () => {
    if (confirm('¿Desea restablecer los datos de muestra originales oficiales?')) {
      resetToInitialState();
      setFeedback({
        type: 'info',
        message: 'Datos restablecidos al estado inicial oficial.',
      });
      onDataRefreshed();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Integración de Datos y Carpeta OneDrive
              </h2>
              <p className="text-xs text-slate-500">
                Sincronización con archivos _li (CSV), _tr (Excel), Productividad (Excel) y Bodegas (CSV)
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

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-xs">
          {/* OneDrive link banner with Automated Folder Sync */}
          <div className="p-4 bg-gradient-to-r from-sky-50 to-indigo-50/60 rounded-xl border border-sky-200/90 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 font-bold text-sky-950 text-xs">
                  <Cloud className="w-4 h-4 text-sky-600 shrink-0" />
                  <span>Carpeta OneDrive Vinculada (resolveOneDriveFolderContext):</span>
                </div>
                <p className="text-slate-600 text-[11px] font-mono truncate max-w-lg mt-0.5" title={oneDriveUrl}>
                  {oneDriveUrl}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={oneDriveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-lg border border-slate-300 shadow-2xs transition-colors flex items-center gap-1.5"
                >
                  <span>Abrir en Web</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  type="button"
                  onClick={handleSyncFolderAutomated}
                  disabled={folderSyncing}
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${folderSyncing ? 'animate-spin' : ''}`} />
                  <span>{folderSyncing ? 'Sincronizando Carpeta...' : 'Sincronizar Carpeta Automáticamente'}</span>
                </button>
              </div>
            </div>

            {folderFilesFound.length > 0 && (
              <div className="pt-2 border-t border-sky-200/60 text-[11px] text-sky-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>
                  Archivos procesados de OneDrive: <strong>{folderFilesFound.join(', ')}</strong>
                </span>
              </div>
            )}
          </div>

          {/* Sync via direct file link */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-slate-800 text-xs">
                Sincronizar por Enlace Directo de Archivo (OneDrive)
              </span>
              <span className="text-[10px] text-slate-500">
                Enlace de archivo con permiso "Cualquiera con el vínculo"
              </span>
            </div>
            <div className="flex gap-2">
              <input
                type="url"
                value={directFileUrl}
                onChange={e => setDirectFileUrl(e.target.value)}
                placeholder="Pegue enlace de compartir del archivo (ej. https://1drv.ms/u/c/...)"
                className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
              />
              <button
                type="button"
                onClick={handleSyncFromDirectUrl}
                disabled={syncingUrl || !directFileUrl.trim()}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold rounded-lg text-xs transition-colors shrink-0"
              >
                {syncingUrl ? 'Descargando...' : 'Descargar y Sincronizar'}
              </button>
            </div>
          </div>

          {/* Feedback alert */}
          {feedback && (
            <div
              className={`p-3 rounded-xl flex items-start gap-2 ${
                feedback.type === 'error'
                  ? 'bg-red-50 text-red-800 border border-red-200'
                  : feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-blue-50 text-blue-800 border border-blue-200'
              }`}
            >
              {feedback.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Current system data metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-[10px] font-bold uppercase text-slate-500 mb-1">Órdenes en _li</div>
              <div className="text-xl font-bold font-mono text-slate-900 tabular-nums">
                {currentLi.length}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Líneas de producto</div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-[10px] font-bold uppercase text-slate-500 mb-1">Transacciones _tr / Prod</div>
              <div className="text-xl font-bold font-mono text-slate-900 tabular-nums">
                {currentTxs.length}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Movimientos registrados</div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-[10px] font-bold uppercase text-slate-500 mb-1">Catálogo Bodegas</div>
              <div className="text-xl font-bold font-mono text-slate-900 tabular-nums">
                {currentBodegas.length}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Almacenes y ubicaciones</div>
            </div>
          </div>

          {/* Upload Dropzones */}
          <div>
            <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-1.5">
              <Upload className="w-4 h-4 text-slate-600" />
              <span>Cargar Archivos desde OneDrive / Computadora</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* 1. Archivo _li (CSV) */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-emerald-300 transition-colors">
                <div className="flex items-center gap-2 mb-1.5 font-bold text-slate-900">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>Archivo *_li.csv</span>
                </div>
                <p className="text-[11px] text-slate-500 mb-2.5">
                  Contiene Orden #, Cliente, Producto, Descripción, Cant. pedida. y Bodega.
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold rounded-lg border border-emerald-200 cursor-pointer shadow-2xs">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Seleccionar CSV _li</span>
                    <input
                      type="file"
                      accept=".csv,.txt"
                      onChange={handleLiFileUpload}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPasteBox(!showPasteBox)}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs"
                  >
                    {showPasteBox ? 'Ocultar pegar' : 'Pegar texto directo'}
                  </button>
                </div>

                {showPasteBox && (
                  <div className="mt-2.5 p-2 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                    <textarea
                      rows={3}
                      value={pasteText}
                      onChange={e => setPasteText(e.target.value)}
                      placeholder="Pegue aquí filas copiadas de Excel o CSV de _li (ej. 200407844  ALPHA CONS  0700120968 ...)"
                      className="w-full p-2 bg-white rounded border border-slate-300 font-mono text-[11px]"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handlePasteLiSubmit}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-xs"
                      >
                        Procesar y Guardar Líneas
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Archivo _tr (Excel o CSV) */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-blue-300 transition-colors">
                <div className="flex items-center gap-2 mb-1.5 font-bold text-slate-900">
                  <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                  <span>Archivo *_tr (.xlsx / .csv)</span>
                </div>
                <p className="text-[11px] text-slate-500 mb-2.5">
                  Excel con transacciones PI, DL, PIREQ, REQDEL, PIPROD, TRPROD y Cant. Delta.
                </p>
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 font-semibold rounded-lg border border-blue-200 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Seleccionar Excel _tr</span>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={e => handleTransactionsFileUpload(e, '_tr')}
                    className="hidden"
                  />
                </label>
              </div>

              {/* 3. Archivo Productividad (Excel o CSV) */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-purple-300 transition-colors">
                <div className="flex items-center gap-2 mb-1.5 font-bold text-slate-900">
                  <FileSpreadsheet className="w-4 h-4 text-purple-600" />
                  <span>Archivo Productividad (.xlsx)</span>
                </div>
                <p className="text-[11px] text-slate-500 mb-2.5">
                  Excel con columnas homólogas (Producto #, Fuente ubicación, Cant. delta).
                </p>
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 font-semibold rounded-lg border border-purple-200 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Seleccionar Productividad</span>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={e => handleTransactionsFileUpload(e, 'productividad')}
                    className="hidden"
                  />
                </label>
              </div>

              {/* 4. Archivo Bodegas (CSV) */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-amber-300 transition-colors">
                <div className="flex items-center gap-2 mb-1.5 font-bold text-slate-900">
                  <Database className="w-4 h-4 text-amber-600" />
                  <span>Catálogo bodegas.csv</span>
                </div>
                <p className="text-[11px] text-slate-500 mb-2.5">
                  Mapeo de Código de almacén a Ubicación (ST, FB, CSH, AV, SM).
                </p>
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold rounded-lg border border-amber-200 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Actualizar bodegas.csv</span>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleBodegasUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleResetData}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline"
          >
            Restablecer Datos de Muestra Oficiales
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRunFullSync}
              disabled={isProcessing}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
              <span>Procesar Transacciones y Actualizar Tablero</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
