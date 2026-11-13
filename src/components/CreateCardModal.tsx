import React, { useState, useEffect } from 'react';
import { CardType, User, CardLabel } from '../types';
import { getLiOrders, getBodegas, validateAndCreateCard, saveLiOrders, getStoredLabels } from '../services/dataStorage';
import { isSTLocation, getBodegaLocation } from '../data/bodegasCatalog';
import { normalizeProductCode, normalizeOrderNumber } from '../utils/productUtils';
import { parseLiCsv } from '../services/fileParser';
import { X, Check, AlertTriangle, Layers, UserCheck, Search, Info, Upload, Cloud } from 'lucide-react';

interface CreateCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  allUsers: User[];
  defaultPickerId?: string;
}

export const CreateCardModal: React.FC<CreateCardModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  allUsers,
  defaultPickerId,
}) => {
  const [cardType, setCardType] = useState<CardType>('OV');
  const [orderNumber, setOrderNumber] = useState('');
  const [selectedPickers, setSelectedPickers] = useState<string[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<string[]>(['ov_tag']);
  const [availableLabels, setAvailableLabels] = useState<CardLabel[]>([]);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success' | 'info'; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setAvailableLabels(getStoredLabels());
    }
  }, [isOpen]);

  // Live lookup states
  const [clientFound, setClientFound] = useState<string | null>(null);
  const [stProducts, setStProducts] = useState<{ code: string; desc: string; qty: number; bodega: string }[]>([]);
  const [hasOtherBodegas, setHasOtherBodegas] = useState(false);
  const [otherBodegasSummary, setOtherBodegasSummary] = useState<string[]>([]);

  // Pickers list (only pickeador role, plus master/asignador if needed, exclude Despacho!)
  const pickers = allUsers.filter(u => u.role === 'pickeador' && u.active);

  useEffect(() => {
    if (defaultPickerId) {
      setSelectedPickers([defaultPickerId]);
    } else if (pickers.length > 0 && selectedPickers.length === 0) {
      setSelectedPickers([pickers[0].id]);
    }
  }, [defaultPickerId, pickers]);

  // Adjust default labels when card type switches
  const handleTypeChange = (newType: CardType) => {
    setCardType(newType);
    setFeedback(null);
    if (newType === 'OV') {
      setSelectedLabels(prev => {
        const withoutTypeTags = prev.filter(l => l !== 'traslado');
        return withoutTypeTags.includes('ov_tag') ? withoutTypeTags : ['ov_tag', ...withoutTypeTags];
      });
    } else if (newType === 'TR') {
      setSelectedLabels(prev => {
        const withoutTypeTags = prev.filter(l => l !== 'ov_tag');
        return withoutTypeTags.includes('traslado') ? withoutTypeTags : ['traslado', ...withoutTypeTags];
      });
    } else {
      setSelectedLabels(prev => prev.filter(l => l !== 'ov_tag' && l !== 'traslado'));
    }
  };

  const [isSearchingServer, setIsSearchingServer] = useState(false);
  const [isSyncingOneDrive, setIsSyncingOneDrive] = useState(false);
  const [currentOrderLookup, setCurrentOrderLookup] = useState<{
    client: string;
    po?: string;
    fechaImp?: string;
    horaImp?: string;
    items: any[];
    transactions: any[];
  } | null>(null);

  // Perform live lookup on 9-digit order number
  useEffect(() => {
    // Immediately clear previous order lookup state so stale data is never retained
    setCurrentOrderLookup(null);
    setClientFound(null);
    setStProducts([]);
    setHasOtherBodegas(false);
    setOtherBodegasSummary([]);
    setFeedback(null);

    const clean = orderNumber.replace(/\D/g, '').slice(0, 9);
    if (clean.length < 9) {
      setIsSearchingServer(false);
      return;
    }

    const bodegas = getBodegas();

    const applyOrderItems = (clientName: string, items: any[]) => {
      setClientFound(clientName);
      const stItems: { code: string; desc: string; qty: number; bodega: string; location: string }[] = [];
      const nonStBodegas: string[] = [];
      const nonStItems: { code: string; desc: string; qty: number; bodega: string; location: string }[] = [];

      items.forEach(item => {
        const loc = getBodegaLocation(item.bodegaCode, bodegas);
        const itemObj = {
          code: normalizeProductCode(item.productCode),
          desc: item.description,
          qty: item.requestedQty,
          bodega: item.bodegaCode,
          location: loc,
        };
        if (loc === 'ST') {
          stItems.push(itemObj);
        } else {
          nonStItems.push(itemObj);
          nonStBodegas.push(`${item.bodegaCode} (${loc})`);
        }
      });

      if (nonStBodegas.length > 0) {
        setHasOtherBodegas(true);
        setOtherBodegasSummary(Array.from(new Set(nonStBodegas)));
        // Auto-add 'multi' tag if not present
        setSelectedLabels(prev => (prev.includes('multi') ? prev : [...prev, 'multi']));
      } else {
        setHasOtherBodegas(false);
        setOtherBodegasSummary([]);
      }

      if (stItems.length > 0) {
        setStProducts(stItems);
        setFeedback(null);
      } else if (items.length > 0) {
        // Order only has items in non-ST bodegas
        setStProducts([]);
        setFeedback({
          type: 'error',
          message: `🚫 La Orden #${clean} existe en OneDrive, pero NO contiene productos para la ubicación ST (Bodega Estándar/Stock). Solo contiene productos en bodega(s) ${Array.from(new Set(nonStBodegas)).join(', ')}. No se puede crear tarjeta de picking en este tablero.`,
        });
      } else {
        setStProducts([]);
        setFeedback({
          type: 'error',
          message: `La Orden #${clean} no contiene productos registrados.`,
        });
      }
    };

    // Fast indexed server search
    let active = true;
    setIsSearchingServer(true);

    const searchTimer = setTimeout(() => {
      fetch(`/api/onedrive/order/${clean}`)
        .then(res => res.json())
        .then(data => {
          if (!active) return;
          if (data.success && data.items && data.items.length > 0) {
            setCurrentOrderLookup({
              client: data.client,
              po: data.po,
              fechaImp: data.fechaImp,
              horaImp: data.horaImp,
              items: data.items,
              transactions: data.transactions || [],
            });
            applyOrderItems(data.client, data.items);
          } else {
            // Local fallback check
            const liRecords = getLiOrders();
            const matches = liRecords.filter(r => normalizeOrderNumber(r.orderNumber) === clean);
            if (matches.length > 0) {
              setCurrentOrderLookup({
                client: matches[0].client,
                items: matches,
                transactions: [],
              });
              applyOrderItems(matches[0].client, matches);
            } else {
              setCurrentOrderLookup(null);
              setClientFound(null);
              setStProducts([]);
              setHasOtherBodegas(false);
              if (cardType === 'OV') {
                setFeedback({
                  type: 'error',
                  message: `El número de Orden #${clean} no existe en el archivo _li de OneDrive.`,
                });
              } else {
                setFeedback({
                  type: 'info',
                  message: `Orden #${clean} no está en _li; se creará con referencia desde transacciones SAP.`,
                });
              }
            }
          }
        })
        .catch(() => {
          if (!active) return;
          const liRecords = getLiOrders();
          const matches = liRecords.filter(r => normalizeOrderNumber(r.orderNumber) === clean);
          if (matches.length > 0) {
            setCurrentOrderLookup({
              client: matches[0].client,
              items: matches,
              transactions: [],
            });
            applyOrderItems(matches[0].client, matches);
          } else {
            setCurrentOrderLookup(null);
            setClientFound(null);
            setStProducts([]);
            setHasOtherBodegas(false);
            if (cardType === 'OV') {
              setFeedback({
                type: 'error',
                message: `El número de Orden #${clean} no existe en el archivo _li de OneDrive.`,
              });
            }
          }
        })
        .finally(() => {
          if (active) setIsSearchingServer(false);
        });
    }, 150);

    return () => {
      active = false;
      clearTimeout(searchTimer);
    };
  }, [orderNumber, cardType]);

  const handleSyncOneDriveNow = async () => {
    setIsSyncingOneDrive(true);
    setFeedback({
      type: 'info',
      message: 'Conectando con carpeta de OneDrive y descargando archivos en el servidor...',
    });
    try {
      const res = await fetch('/api/onedrive/sync-folder', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: 'success',
          message: `¡OneDrive sincronizado (${data.liCount} órdenes procesadas)! Verificando orden...`,
        });
        // Retrigger lookup cleanly without overflowing localStorage
        const cur = orderNumber;
        setOrderNumber('');
        setTimeout(() => setOrderNumber(cur), 80);
      } else {
        setFeedback({
          type: 'error',
          message: `Error al sincronizar: ${data.error || 'No se pudo leer la carpeta'}`,
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `Error de conexión: ${err.message}`,
      });
    } finally {
      setIsSyncingOneDrive(false);
    }
  };

  const handleQuickLiUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const records = parseLiCsv(text);
      if (records.length > 0) {
        // Save safe slice to local storage
        saveLiOrders(records.slice(0, 100));
        setFeedback({
          type: 'success',
          message: `¡Archivo _li cargado exitosamente (${records.length} registros)! Reintentando búsqueda...`,
        });
        const cur = orderNumber;
        setOrderNumber('');
        setTimeout(() => setOrderNumber(cur), 80);
      } else {
        setFeedback({
          type: 'error',
          message: 'No se encontraron registros válidos en el archivo _li.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `Error al leer CSV: ${err.message}`,
      });
    }
  };

  const togglePicker = (pickerId: string) => {
    setSelectedPickers(prev =>
      prev.includes(pickerId) ? prev.filter(id => id !== pickerId) : [...prev, pickerId]
    );
  };

  const toggleLabel = (labelId: string) => {
    setSelectedLabels(prev =>
      prev.includes(labelId) ? prev.filter(id => id !== labelId) : [...prev, labelId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const clean = orderNumber.replace(/\D/g, '').slice(0, 9);
    if (clean.length !== 9) {
      setFeedback({
        type: 'error',
        message: 'Debe ingresar un número de orden de exactamente 9 dígitos.',
      });
      return;
    }

    if (selectedPickers.length === 0) {
      setFeedback({
        type: 'error',
        message: 'Debe seleccionar al menos un Pickeador para asignar la tarjeta.',
      });
      return;
    }

    const result = validateAndCreateCard({
      type: cardType,
      orderNumber: clean,
      assignedPickerIds: selectedPickers,
      labels: selectedLabels,
      customClient: clientFound || undefined,
      po: currentOrderLookup?.po,
      fechaImp: currentOrderLookup?.fechaImp,
      horaImp: currentOrderLookup?.horaImp,
      prefetchedItems: currentOrderLookup?.items,
      prefetchedTransactions: currentOrderLookup?.transactions,
    });

    if (result.success) {
      onSuccess();
      onClose();
    } else {
      setFeedback({
        type: 'error',
        message: result.message,
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Crear Nueva Tarjeta de Picking</h2>
            <p className="text-xs text-slate-500">
              Asigne órdenes OV, TR u OF con validación de catálogo y bodegas ST
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          {/* 1. Card Type Selector (Only 3 types: OV - Green, TR - Black, OF - Purple) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Tipo de Tarjeta (Solo 3 tipos)
            </label>
            <div className="grid grid-cols-3 gap-3">
              {/* OV */}
              <button
                type="button"
                onClick={() => handleTypeChange('OV')}
                className={`py-3 px-4 rounded-xl border-2 flex items-center justify-center gap-2 font-bold text-sm transition-all ${
                  cardType === 'OV'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full ${
                    cardType === 'OV' ? 'bg-emerald-600 ring-2 ring-emerald-300' : 'bg-emerald-500'
                  }`}
                />
                <span>1. OV (Verde)</span>
              </button>

              {/* TR */}
              <button
                type="button"
                onClick={() => handleTypeChange('TR')}
                className={`py-3 px-4 rounded-xl border-2 flex items-center justify-center gap-2 font-bold text-sm transition-all ${
                  cardType === 'TR'
                    ? 'border-slate-900 bg-slate-100 text-slate-900 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full ${
                    cardType === 'TR' ? 'bg-slate-900 ring-2 ring-slate-400' : 'bg-slate-800'
                  }`}
                />
                <span>2. TR (Negro)</span>
              </button>

              {/* OF */}
              <button
                type="button"
                onClick={() => handleTypeChange('OF')}
                className={`py-3 px-4 rounded-xl border-2 flex items-center justify-center gap-2 font-bold text-sm transition-all ${
                  cardType === 'OF'
                    ? 'border-purple-600 bg-purple-50 text-purple-900 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full ${
                    cardType === 'OF' ? 'bg-purple-600 ring-2 ring-purple-300' : 'bg-purple-500'
                  }`}
                />
                <span>3. OF (Morado)</span>
              </button>
            </div>
          </div>

          {/* 2. Order Number (9 digits) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Número de Orden (Exactamente 9 dígitos)
              </label>
              <span className="text-[11px] font-mono text-slate-500">
                {orderNumber.replace(/\D/g, '').length}/9 dígitos
              </span>
            </div>
            <div className="relative">
              <input
                type="text"
                maxLength={9}
                value={orderNumber}
                onChange={e => setOrderNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="Ej. 100482910"
                className="w-full px-4 py-2.5 font-mono text-base font-semibold tracking-wider rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <div className="absolute right-3 top-2.5">
                <Search className="w-5 h-5 text-slate-400" />
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
              <span>
                Búsqueda automática en archivo <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">_li</code> de OneDrive.
              </span>
              {isSearchingServer && (
                <span className="text-sky-600 font-semibold flex items-center gap-1 animate-pulse">
                  <Cloud className="w-3 h-3" />
                  Consultando OneDrive...
                </span>
              )}
            </div>
          </div>

          {/* Order Details Preview Box */}
          {clientFound && (
            <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                    Cliente Encontrado:
                  </span>
                  <div className="text-sm font-bold text-slate-900">{clientFound}</div>
                </div>
                <span className="bg-emerald-600 text-white font-mono text-[11px] font-bold px-2 py-0.5 rounded">
                  #{orderNumber}
                </span>
              </div>

              {/* Products found with ST location */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block mb-1">
                  Productos ST para Picking ({stProducts.length} código(s)):
                </span>
                <div className="space-y-1 max-h-28 overflow-y-auto">
                  {stProducts.map((p, i) => (
                    <div
                      key={i}
                      className="text-xs bg-white p-2 rounded-lg border border-emerald-100 flex items-center justify-between"
                    >
                      <div className="truncate mr-2">
                        <span className="font-mono font-bold text-slate-800">{p.code}</span>
                        <span className="text-slate-600 text-[11px] ml-1.5 truncate">
                          · {p.desc}
                        </span>
                      </div>
                      <span className="font-mono font-semibold text-emerald-700 shrink-0">
                        Cant: {p.qty} (Bodega {p.bodega})
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Non-ST Bodegas Alert */}
              {hasOtherBodegas && (
                <div className="p-2 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Orden Multi-Bodega:</strong> Contiene líneas en bodegas adicionales ({otherBodegasSummary.join(', ')}). Se asignará automáticamente la etiqueta <strong>multi</strong>.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Feedback message */}
          {feedback && (
            <div
              className={`p-3 rounded-xl text-xs flex flex-col gap-1.5 ${
                feedback.type === 'error'
                  ? 'bg-red-50 text-red-800 border border-red-200'
                  : feedback.type === 'info'
                  ? 'bg-blue-50 text-blue-800 border border-blue-200'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              }`}
            >
              <div className="flex items-start gap-2">
                {feedback.type === 'error' ? (
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                ) : (
                  <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                )}
                <span>{feedback.message}</span>
              </div>

              {feedback.type === 'error' && (
                <div className="mt-1 pt-2 border-t border-red-200/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={handleSyncOneDriveNow}
                    disabled={isSyncingOneDrive}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-[11px] font-bold rounded-lg shadow-2xs transition-colors"
                  >
                    <Cloud className={`w-3.5 h-3.5 ${isSyncingOneDrive ? 'animate-spin' : ''}`} />
                    <span>{isSyncingOneDrive ? 'Sincronizando OneDrive...' : '⚡ Sincronizar Carpeta OneDrive'}</span>
                  </button>
                  <label className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-red-50 text-red-800 text-[11px] font-bold rounded-lg border border-red-300 cursor-pointer shadow-2xs">
                    <Upload className="w-3 h-3" />
                    <span>O subir CSV manual</span>
                    <input
                      type="file"
                      accept=".csv,.txt"
                      onChange={handleQuickLiUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>
          )}

          {/* 3. Assign to Pickeadores (Multi-select) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Asignar a Pickeador(es) — Seleccione uno o más
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto">
              {pickers.map(picker => {
                const isSelected = selectedPickers.includes(picker.id);
                return (
                  <button
                    key={picker.id}
                    type="button"
                    onClick={() => togglePicker(picker.id)}
                    className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 font-semibold'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div
                        className={`w-6 h-6 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0 ${
                          picker.avatarColor || 'bg-slate-700'
                        }`}
                      >
                        {picker.name.charAt(0)}
                      </div>
                      <span className="text-xs truncate">{picker.name}</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Labels Selector (According to Image 1) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Etiquetas de la Tarjeta (Según Imagen 1)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {availableLabels.map(label => {
                const isSelected = selectedLabels.includes(label.id);
                return (
                  <button
                    key={label.id}
                    type="button"
                    onClick={() => toggleLabel(label.id)}
                    style={{
                      backgroundColor: label.bg,
                      color: label.text,
                    }}
                    className={`text-xs font-bold px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 shadow-2xs ${
                      isSelected
                        ? 'ring-2 ring-slate-900 ring-offset-1 scale-105'
                        : 'opacity-50 hover:opacity-90'
                    }`}
                  >
                    <span>{label.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                  </button>
                );
              })}
            </div>
          </div>
        </form>

        {/* Modal Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={
              isSearchingServer ||
              orderNumber.replace(/\D/g, '').length !== 9 ||
              selectedPickers.length === 0 ||
              (cardType === 'OV' && (!clientFound || stProducts.length === 0))
            }
            className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>{isSearchingServer ? 'Buscando Orden...' : 'Crear y Asignar Tarjeta'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
