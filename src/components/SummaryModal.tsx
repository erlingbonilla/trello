import React from 'react';
import { Card, User } from '../types';
import { X, Layers, UserCheck, TrendingUp, BarChart3, Truck } from 'lucide-react';

interface SummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  cards: Card[];
  allUsers: User[];
}

export const SummaryModal: React.FC<SummaryModalProps> = ({
  isOpen,
  onClose,
  cards,
  allUsers,
}) => {
  if (!isOpen) return null;

  // Active cards on the board (picking & despacho)
  const pickingCards = cards.filter(c => c.status === 'picking');
  const despachoCards = cards.filter(c => c.status === 'despacho');

  const totalOV = cards.filter(c => c.type === 'OV').length;
  const totalTR = cards.filter(c => c.type === 'TR').length;
  const totalOF = cards.filter(c => c.type === 'OF').length;
  const totalCards = cards.length;

  const pickers = allUsers.filter(u => u.role === 'pickeador' && u.active);

  // Compute breakdown per picker
  const pickerStats = pickers.map(picker => {
    const assigned = pickingCards.filter(c => c.assignedPickerIds.includes(picker.id));
    const ov = assigned.filter(c => c.type === 'OV').length;
    const tr = assigned.filter(c => c.type === 'TR').length;
    const of = assigned.filter(c => c.type === 'OF').length;
    const total = assigned.length;
    const loadPct = totalCards > 0 ? Math.round((total / totalCards) * 100) : 0;

    return {
      picker,
      ov,
      tr,
      of,
      total,
      loadPct,
    };
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Tabla Resumen de Órdenes y Carga de Pickers
              </h2>
              <p className="text-xs text-slate-500">
                Resumen ejecutivo para Asignador y Master en tiempo real
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
        <div className="p-6 space-y-6">
          {/* Top 4 Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* OV */}
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>Órdenes OV</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-950 tabular-nums">
                {totalOV}
              </div>
              <div className="text-[11px] text-emerald-700 mt-1">
                Órdenes de Venta activas
              </div>
            </div>

            {/* TR */}
            <div className="p-4 rounded-xl bg-slate-100 border border-slate-300">
              <div className="text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>Traslados TR</span>
                <span className="w-2.5 h-2.5 rounded-full bg-slate-900" />
              </div>
              <div className="text-2xl font-bold font-mono text-slate-950 tabular-nums">
                {totalTR}
              </div>
              <div className="text-[11px] text-slate-600 mt-1">
                Traslados entre bodegas
              </div>
            </div>

            {/* OF */}
            <div className="p-4 rounded-xl bg-purple-50 border border-purple-200">
              <div className="text-[11px] font-bold text-purple-800 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>Fabricación OF</span>
                <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
              </div>
              <div className="text-2xl font-bold font-mono text-purple-950 tabular-nums">
                {totalOF}
              </div>
              <div className="text-[11px] text-purple-700 mt-1">
                Órdenes de producción
              </div>
            </div>

            {/* Despacho */}
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
              <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>En Despacho</span>
                <Truck className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <div className="text-2xl font-bold font-mono text-amber-950 tabular-nums">
                {despachoCards.length}
              </div>
              <div className="text-[11px] text-amber-700 mt-1">
                Copiadas para despacho
              </div>
            </div>
          </div>

          {/* Table Breakdown per Picker */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center justify-between">
              <span>Distribución por Pickeador</span>
              <span className="text-xs text-slate-500 font-normal">
                Total en tablero: <strong className="font-mono text-slate-800">{totalCards}</strong> tarjetas
              </span>
            </h3>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Pickeador</th>
                    <th className="py-3 px-3 text-center text-emerald-700">OV</th>
                    <th className="py-3 px-3 text-center text-slate-900">TR</th>
                    <th className="py-3 px-3 text-center text-purple-700">OF</th>
                    <th className="py-3 px-4 text-center font-bold">Total Asignadas</th>
                    <th className="py-3 px-4 text-left">Carga de Trabajo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pickerStats.map(stat => (
                    <tr key={stat.picker.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0 ${
                            stat.picker.avatarColor || 'bg-slate-700'
                          }`}
                        >
                          {stat.picker.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{stat.picker.name}</div>
                          <div className="text-[10px] text-slate-500">Pickeador</div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-emerald-700 tabular-nums text-sm">
                        {stat.ov}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-900 tabular-nums text-sm">
                        {stat.tr}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-purple-700 tabular-nums text-sm">
                        {stat.of}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-900 tabular-nums text-sm">
                        <span className="bg-slate-100 px-2.5 py-1 rounded-md">
                          {stat.total}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="w-full max-w-[140px]">
                          <div className="flex justify-between text-[10px] font-mono mb-1 text-slate-600">
                            <span>{stat.loadPct}%</span>
                            <span>{stat.total === 0 ? 'Disponible' : `${stat.total} activas`}</span>
                          </div>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-indigo-600 transition-all duration-300"
                              style={{ width: `${Math.min(100, stat.loadPct)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cerrar Resumen
          </button>
        </div>
      </div>
    </div>
  );
};
