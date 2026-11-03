import React from 'react';
import { Card, User } from '../types';
import { getTransactions } from '../services/dataStorage';
import { getLabelById } from '../data/labels';
import { getTimeElapsed } from '../utils/timeAgo';
import { X, CheckCircle2, Clock, Activity, BarChart2, Radio } from 'lucide-react';

interface CardDetailModalProps {
  card: Card | null;
  isOpen: boolean;
  onClose: () => void;
  onCardUpdated: () => void;
  currentUser: User;
  allUsers: User[];
}

export const CardDetailModal: React.FC<CardDetailModalProps> = ({
  card,
  isOpen,
  onClose,
  allUsers,
}) => {
  if (!isOpen || !card) return null;

  const isDespacho = card.status === 'despacho';
  const assignedPickers = allUsers.filter(u => card.assignedPickerIds.includes(u.id));

  // Find all transactions associated with this order from WMS / OneDrive
  const allTxs = getTransactions();
  const orderTxs = allTxs.filter(t => t.orderNumber === card.orderNumber);

  // Type styling
  const typeBadgeClass = {
    OV: 'bg-emerald-600 text-white',
    TR: 'bg-slate-900 text-white',
    OF: 'bg-purple-700 text-white',
  }[card.type];

  // Codes finished calculation
  const totalCodes = card.items.length;
  const finishedCodes = card.items.filter(i => (isDespacho ? i.isDispatched : i.isFinished)).length;
  const pendingCodes = totalCodes - finishedCodes;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded tracking-wide uppercase ${typeBadgeClass}`}>
                {card.type}
              </span>
              <span className="font-mono text-base font-black text-slate-900">
                #{card.orderNumber}
              </span>
              <span className="text-[11px] bg-slate-200 text-slate-700 font-mono px-2 py-0.5 rounded">
                Ref: {card.type === 'OV' ? 'SO' : card.type === 'TR' ? 'ITR' : 'WO'}{card.orderNumber}
              </span>
              {isDespacho && (
                <span className="text-[11px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded">
                  En Despacho
                </span>
              )}
            </div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 line-clamp-1">{card.client}</h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-mono">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Creada: {new Date(card.createdAt).toLocaleTimeString()} ({getTimeElapsed(card.createdAt)})
              </span>
              <span>·</span>
              <span className="flex items-center gap-1 font-semibold text-slate-800">
                Progreso: {finishedCodes}/{totalCodes} códigos ({pendingCodes} pendientes)
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {/* Labels & Assignees */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-600">Etiquetas:</span>
              <div className="flex flex-wrap gap-1">
                {card.labels.map(labelId => {
                  const label = getLabelById(labelId);
                  if (!label) return null;
                  return (
                    <span
                      key={label.id}
                      style={{ backgroundColor: label.bg, color: label.text }}
                      className="px-2 py-0.5 rounded text-[10px] font-bold shadow-2xs"
                    >
                      {label.name}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-600">Asignado a:</span>
              <div className="flex items-center gap-1.5">
                {assignedPickers.map(p => (
                  <span
                    key={p.id}
                    className="flex items-center gap-1 bg-white border border-slate-200 px-2 py-0.5 rounded-full font-medium text-slate-700"
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${p.avatarColor || 'bg-slate-700'}`}
                    />
                    {p.name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Live Sync WMS Notice */}
          <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-900">
            <Radio className="w-4 h-4 text-emerald-600 shrink-0 animate-pulse" />
            <div className="flex-1">
              <span className="font-bold">Monitoreo de avance WMS: </span>
              <span className="text-emerald-800">
                Los avances se descuentan automáticamente de los reportes del WMS en OneDrive. La tarjeta se retirará sola al completarse el 100%.
              </span>
            </div>
          </div>

          {/* Products Table */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <BarChart2 className="w-4 h-4 text-slate-600" />
                <span>Productos y Avance por Código ({card.items.length})</span>
              </h3>
              <span className="text-[11px] font-mono font-medium text-slate-500">
                Filtrado: Bodegas ST
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-2xs">
              <table className="w-full text-left text-xs min-w-[580px]">
                <thead className="bg-slate-100/80 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Código</th>
                    <th className="py-2.5 px-3">Descripción</th>
                    <th className="py-2.5 px-2 text-center">Bodega</th>
                    <th className="py-2.5 px-2 text-right">Cant. Solicitada</th>
                    <th className="py-2.5 px-2 text-right">Pickeado WMS</th>
                    <th className="py-2.5 px-2 text-right">Saldo Pendiente</th>
                    <th className="py-2.5 px-2 text-right">Despachado</th>
                    <th className="py-2.5 px-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {card.items.map(item => {
                    const isDone = isDespacho ? item.isDispatched : item.isFinished;
                    const picked = item.pickedQty || 0;
                    const remaining = Math.max(0, item.requestedQty - picked);
                    const pct = Math.min(100, Math.round((picked / (item.requestedQty || 1)) * 100));

                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-slate-50 transition-colors ${
                          isDone ? 'bg-emerald-50/40' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                          {item.productCode}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 max-w-xs truncate" title={item.description}>
                          {item.description}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono whitespace-nowrap">
                          <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[11px]">
                            {item.bodegaCode} ({item.location})
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono tabular-nums font-bold text-slate-900">
                          {item.requestedQty}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono tabular-nums">
                          <span
                            className={
                              item.isFinished
                                ? 'text-emerald-700 font-bold'
                                : 'text-blue-700 font-semibold'
                            }
                          >
                            {picked} ({pct}%)
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono tabular-nums">
                          <span
                            className={
                              remaining === 0
                                ? 'text-emerald-700 font-bold'
                                : 'text-amber-700 font-bold'
                            }
                          >
                            {remaining}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono tabular-nums">
                          <span
                            className={
                              item.isDispatched
                                ? 'text-emerald-700 font-bold'
                                : 'text-slate-600'
                            }
                          >
                            {item.dispatchedQty || 0}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          {isDone ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3" />
                              Listo (0)
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-[11px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full">
                              Pendiente ({remaining})
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* WMS Transactions Logged in OneDrive */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-indigo-600" />
                <span>Movimientos WMS Detectados en OneDrive ({orderTxs.length})</span>
              </h3>
              <span className="text-[11px] text-slate-500 font-mono">
                Fuentes: _tr + Productividad
              </span>
            </div>

            {orderTxs.length === 0 ? (
              <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                Aún no se registran movimientos en el WMS para esta orden. Al registrarse en OneDrive el progreso se actualizará solo.
              </p>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-semibold sticky top-0">
                    <tr>
                      <th className="py-2 px-3">Fecha/Hora</th>
                      <th className="py-2 px-3">Operador WMS</th>
                      <th className="py-2 px-2">Tipo</th>
                      <th className="py-2 px-3">Producto</th>
                      <th className="py-2 px-2 text-right">Cant. Delta</th>
                      <th className="py-2 px-3">Bodega/Ubic</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {orderTxs.map(t => (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 text-slate-500 whitespace-nowrap">{t.dateTime}</td>
                        <td className="py-2 px-3 font-sans font-medium text-slate-800">
                          {t.employeeName}
                        </td>
                        <td className="py-2 px-2">
                          <span
                            className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                              t.transactionType === 'PI' || t.transactionType === 'PIREQ' || t.transactionType === 'PIPROD'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {t.transactionType}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-800">{t.productCode}</td>
                        <td className="py-2 px-2 text-right font-bold tabular-nums">
                          <span className={t.cantDelta < 0 ? 'text-red-600' : 'text-emerald-600'}>
                            {t.cantDelta}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-500 whitespace-nowrap">
                          {t.bodega} / {t.ubicacion}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors shadow-2xs"
          >
            Cerrar Monitor
          </button>
        </div>
      </div>
    </div>
  );
};
