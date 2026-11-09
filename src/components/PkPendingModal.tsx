import React, { useState, useEffect } from 'react';
import { X, Search, PackageCheck, Layers, PlusCircle, RefreshCw, Warehouse, UserPlus } from 'lucide-react';
import { User } from '../types';
import { INITIAL_BODEGAS } from '../data/bodegasCatalog';

interface PkPendingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  allUsers: User[];
  onCreateCardFromPk: (orderNumber: string, type: 'OV' | 'TR' | 'OF', pickerIds: string[]) => void;
}

export const PkPendingModal: React.FC<PkPendingModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  allUsers,
  onCreateCardFromPk,
}) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    currentMonth: string;
    fileName: string;
    totalPkOrders: number;
    unassignedCount: number;
    unassignedOrders: any[];
  }>({
    currentMonth: '',
    fileName: '',
    totalPkOrders: 0,
    unassignedCount: 0,
    unassignedOrders: [],
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBodega, setSelectedBodega] = useState<string>('all');
  const [wmsFilter, setWmsFilter] = useState<'all' | 'sin_iniciar' | 'pickeado'>('all');
  const [selectedPickersMap, setSelectedPickersMap] = useState<Record<string, string[]>>({});
  const [assigningOrderNum, setAssigningOrderNum] = useState<string | null>(null);

  const fetchPkUnassigned = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/onedrive/pk-unassigned');
      if (res.ok) {
        const json = await res.json();
        if (json && json.success) {
          setData({
            currentMonth: json.currentMonth || '',
            fileName: json.fileName || '',
            totalPkOrders: json.totalPkOrders || 0,
            unassignedCount: json.unassignedCount || 0,
            unassignedOrders: json.unassignedOrders || [],
          });
        }
      }
    } catch (e) {
      console.error('Error cargando órdenes pendientes _pk:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPkUnassigned();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const pickers = allUsers.filter(u => u.role === 'pickeador' || u.role === 'master' || u.role === 'asignador');

  const sinIniciarCount = data.unassignedOrders.filter(o => o.wmsStatus === 'sin_iniciar').length;
  const pickeadoCount = data.unassignedOrders.filter(o => o.wmsStatus === 'pickeado').length;

  // Filter orders by search term, selected bodega & WMS status
  const filteredOrders = data.unassignedOrders.filter(ord => {
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch =
      term === '' ||
      ord.orderNumber.toLowerCase().includes(term) ||
      (ord.po && String(ord.po).toLowerCase().includes(term)) ||
      ord.client.toLowerCase().includes(term) ||
      (ord.items || []).some(
        (it: any) =>
          it.productCode.toLowerCase().includes(term) ||
          it.description.toLowerCase().includes(term)
      );

    const matchesBodega = selectedBodega === 'all' || ord.bodegaCode === selectedBodega;

    const matchesWms =
      wmsFilter === 'all' ||
      (wmsFilter === 'sin_iniciar' && ord.wmsStatus === 'sin_iniciar') ||
      (wmsFilter === 'pickeado' && ord.wmsStatus === 'pickeado');

    return matchesSearch && matchesBodega && matchesWms;
  });

  // Group by Bodega
  const uniqueBodegaCodes = Array.from(new Set(data.unassignedOrders.map(o => o.bodegaCode).filter(Boolean)));

  const getBodegaName = (code: string) => {
    const entry = INITIAL_BODEGAS.find(b => b.code === code || b.name === code);
    return entry ? `${entry.name} (${entry.code})` : `Bodega ${code}`;
  };

  const handleTogglePicker = (orderNum: string, pickerId: string) => {
    setSelectedPickersMap(prev => {
      const current = prev[orderNum] || [pickers[0]?.id || 'picker_miguel'];
      const exists = current.includes(pickerId);
      let updated: string[];
      if (exists) {
        updated = current.filter(id => id !== pickerId);
      } else {
        updated = [...current, pickerId];
      }
      return { ...prev, [orderNum]: updated };
    });
  };

  const handleCreateCard = (orderNum: string) => {
    const chosenPickers = selectedPickersMap[orderNum] || [pickers[0]?.id || 'picker_miguel'];
    if (chosenPickers.length === 0) {
      alert('Por favor seleccione al menos un pickeador para asignar la tarjeta.');
      return;
    }
    setAssigningOrderNum(orderNum);
    onCreateCardFromPk(orderNum, 'OV', chosenPickers);
    setTimeout(() => {
      setAssigningOrderNum(null);
      fetchPkUnassigned();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600/40 rounded-xl border border-indigo-400/30">
              <PackageCheck className="w-6 h-6 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Órdenes ST Pendientes de Asignar
                </h3>
                {data.fileName && (
                  <span className="text-[11px] font-mono font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 px-2 py-0.5 rounded-full">
                    {data.fileName}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Cotejo automático con el archivo <span className="font-semibold text-white">_pk</span> del mes actual. Solo muestra órdenes con productos en bodegas ST no presentes en el tablero ni finalizadas en WMS.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchPkUnassigned}
              disabled={loading}
              className="p-2 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors"
              title="Refrescar datos de OneDrive"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin text-indigo-300' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats Banner & Filters */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span className="text-slate-500">Total en _pk mes:</span>
              <span className="font-mono font-bold text-slate-900">{data.totalPkOrders} órdenes</span>
            </div>

            {/* WMS Segmented Filter Tabs */}
            <div className="flex items-center bg-slate-200/80 p-0.5 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setWmsFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  wmsFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todas ({data.unassignedOrders.length})
              </button>
              <button
                type="button"
                onClick={() => setWmsFilter('sin_iniciar')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  wmsFilter === 'sin_iniciar'
                    ? 'bg-amber-600 text-white shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sin Iniciar Pickeo ({sinIniciarCount})
              </button>
              <button
                type="button"
                onClick={() => setWmsFilter('pickeado')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  wmsFilter === 'pickeado'
                    ? 'bg-blue-600 text-white shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pickeadas en WMS ({pickeadoCount})
              </button>
            </div>
          </div>

          {/* Controls: Search & Bodega filter */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {/* Bodega Selector */}
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs">
              <Warehouse className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedBodega}
                onChange={e => setSelectedBodega(e.target.value)}
                className="bg-transparent text-slate-700 font-semibold focus:outline-hidden"
              >
                <option value="all">Todas las Bodegas ST ({uniqueBodegaCodes.length})</option>
                {uniqueBodegaCodes.map(code => (
                  <option key={code} value={code}>
                    {getBodegaName(code)}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Filtrar por orden, PO / CORR, cliente..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1 bg-white border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Content Body: List of Unassigned Orders */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-100/50">
          {loading ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
              <p className="text-sm font-semibold">Cotejando órdenes con _pk y WMS...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-2xs my-4">
              <PackageCheck className="w-12 h-12 text-emerald-500 mx-auto mb-2 opacity-80" />
              <h4 className="text-base font-bold text-slate-800">¡Todas las órdenes ST están asignadas o procesadas!</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                No hay órdenes pendientes en el archivo <span className="font-mono font-bold text-slate-700">{data.fileName || '_pk'}</span> que cumplan con los filtros seleccionados.
              </p>
            </div>
          ) : (
            filteredOrders.map(ord => {
              const currentSelectedPickers = selectedPickersMap[ord.orderNumber] || [pickers[0]?.id || 'picker_miguel'];
              const isProcessing = assigningOrderNum === ord.orderNumber;

              return (
                <div
                  key={ord.orderNumber}
                  className="bg-white rounded-xl p-4 border border-slate-200 hover:border-slate-300 shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="bg-emerald-600 text-white font-black text-[10px] uppercase px-2 py-0.5 rounded shadow-2xs">
                        {ord.type || 'OV'}
                      </span>
                      <span className="font-mono text-base font-black text-slate-900">
                        #{ord.orderNumber}
                      </span>
                      {ord.po && (
                        <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono font-bold text-[10.5px] px-2 py-0.5 rounded-md" title="Correlativo PO del archivo _pk">
                          PO: {ord.po}
                        </span>
                      )}
                      {ord.wmsStatus === 'pickeado' ? (
                        <span className="bg-blue-50 text-blue-800 border border-blue-200 font-bold text-[10.5px] px-2 py-0.5 rounded-md flex items-center gap-1" title="Esta orden ya registra pickeo en WMS pero no ha sido despachada">
                          <span>✓ Pickeado en WMS {ord.pickedEmployeeName ? `(${ord.pickedEmployeeName})` : ''}</span>
                        </span>
                      ) : (
                        <span className="bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[10.5px] px-2 py-0.5 rounded-md flex items-center gap-1">
                          <span>Pendiente de Picking</span>
                        </span>
                      )}
                      <span className="bg-slate-100 text-slate-700 border border-slate-200 font-bold text-[10.5px] px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Warehouse className="w-3 h-3 text-slate-500" />
                        <span>Bodega: {getBodegaName(ord.bodegaCode)}</span>
                      </span>
                    </div>

                    <h5 className="font-semibold text-xs text-slate-800 truncate" title={ord.client}>
                      {ord.client}
                    </h5>

                    {/* Items List Preview */}
                    <div className="bg-slate-50 rounded-lg p-2 border border-slate-100 text-[11px] space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Productos en ubicación ST ({ord.items?.length || 0}):
                      </span>
                      {ord.items?.map((it: any) => (
                        <div key={it.id} className="flex items-center justify-between gap-2 text-slate-700">
                          <span className="font-mono font-bold text-slate-900 truncate max-w-[180px]">
                            {it.productCode}
                          </span>
                          <span className="truncate flex-1 text-slate-600">{it.description}</span>
                          <span className="font-mono font-bold bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded shrink-0">
                            {it.requestedQty} u.
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions & Picker Assignment */}
                  <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-stretch sm:items-center gap-3 shrink-0 pt-2 border-t md:border-t-0 md:pt-0 border-slate-100">
                    {/* Picker Selector Checkboxes */}
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                        <UserPlus className="w-3 h-3" />
                        Asignar Pickeador:
                      </span>
                      <div className="flex flex-wrap gap-1 max-w-[220px]">
                        {pickers.map(p => {
                          const isChecked = currentSelectedPickers.includes(p.id);
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => handleTogglePicker(ord.orderNumber, p.id)}
                              className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-colors ${
                                isChecked
                                  ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs'
                                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                              }`}
                            >
                              {p.name.split(' ')[0]}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Create Card Button */}
                    <button
                      onClick={() => handleCreateCard(ord.orderNumber)}
                      disabled={isProcessing}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors shrink-0 disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <PlusCircle className="w-4 h-4" />
                      )}
                      <span>Crear Tarjeta</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-white flex items-center justify-between text-xs text-slate-500">
          <span>
            Mostrando <strong className="text-slate-800">{filteredOrders.length}</strong> de <strong className="text-slate-800">{data.unassignedOrders.length}</strong> órdenes ST pendientes sin asignar.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
