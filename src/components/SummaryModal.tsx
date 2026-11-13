import React, { useState } from 'react';
import { Card, User } from '../types';
import { X, BarChart3, Truck, Calendar, ChevronDown, ChevronRight, Printer, ExternalLink } from 'lucide-react';

interface SummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  cards: Card[];
  allUsers: User[];
  onSelectCard?: (card: Card) => void;
}

function getCardDateStr(card: Card): { dateStr: string; sortKey: number; isFromPk: boolean } {
  if (card.fechaImp) {
    const clean = card.fechaImp.trim();
    const dmy = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (dmy) {
      const dd = dmy[1].padStart(2, '0');
      const mm = dmy[2].padStart(2, '0');
      const yyyy = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3];
      return {
        dateStr: `${dd}/${mm}/${yyyy}`,
        sortKey: Number(`${yyyy}${mm}${dd}`),
        isFromPk: true,
      };
    }
    return { dateStr: clean, sortKey: 99999999, isFromPk: true };
  }

  const dt = new Date(card.createdAt);
  if (!isNaN(dt.getTime())) {
    const dd = String(dt.getDate()).padStart(2, '0');
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const yyyy = String(dt.getFullYear());
    return {
      dateStr: `${dd}/${mm}/${yyyy}`,
      sortKey: Number(`${yyyy}${mm}${dd}`),
      isFromPk: false,
    };
  }

  return { dateStr: 'Sin fecha', sortKey: 99999999, isFromPk: false };
}

export const SummaryModal: React.FC<SummaryModalProps> = ({
  isOpen,
  onClose,
  cards,
  allUsers,
  onSelectCard,
}) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  if (!isOpen) return null;

  // Active open cards on the board (picking & despacho)
  const openCards = cards.filter(c => c.status !== 'completed');
  const pickingCards = openCards.filter(c => c.status === 'picking');
  const despachoCards = openCards.filter(c => c.status === 'despacho');

  const totalOV = openCards.filter(c => c.type === 'OV').length;
  const totalTR = openCards.filter(c => c.type === 'TR').length;
  const totalOF = openCards.filter(c => c.type === 'OF').length;
  const totalCards = openCards.length;

  const pickers = allUsers.filter(u => u.role === 'pickeador' && u.active);
  const userNameMap = new Map(allUsers.map(u => [u.id, u.name]));

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

  // Compute breakdown of OPEN cards by Date (skip dates with 0 open cards)
  const now = new Date();
  const todayStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

  const dateMap = new Map<
    string,
    {
      dateStr: string;
      sortKey: number;
      cards: Card[];
    }
  >();

  openCards.forEach(c => {
    const { dateStr, sortKey } = getCardDateStr(c);
    if (!dateMap.has(dateStr)) {
      dateMap.set(dateStr, { dateStr, sortKey, cards: [] });
    }
    dateMap.get(dateStr)!.cards.push(c);
  });

  const dateStats = Array.from(dateMap.values())
    .filter(entry => entry.cards.length > 0)
    .sort((a, b) => a.sortKey - b.sortKey)
    .map(entry => {
      const ovCards = entry.cards
        .filter(c => c.type === 'OV')
        .sort((a, b) => (a.horaImp || '99:99').localeCompare(b.horaImp || '99:99') || a.orderNumber.localeCompare(b.orderNumber));
      const ov = ovCards.length;
      const tr = entry.cards.filter(c => c.type === 'TR').length;
      const of = entry.cards.filter(c => c.type === 'OF').length;
      const total = entry.cards.length;
      const pickingCount = entry.cards.filter(c => c.status === 'picking').length;
      const despachoCount = entry.cards.filter(c => c.status === 'despacho').length;
      const loadPct = totalCards > 0 ? Math.round((total / totalCards) * 100) : 0;

      return {
        dateStr: entry.dateStr,
        isToday: entry.dateStr === todayStr,
        ov,
        tr,
        of,
        total,
        pickingCount,
        despachoCount,
        loadPct,
        ovCards,
        allCards: entry.cards,
      };
    });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
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

        {/* Scrollable Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
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

          {/* Table 1: Breakdown per Picker */}
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

          {/* Table 2: Open Cards by Date (click row to inspect pending OV orders) */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center justify-between flex-wrap gap-2">
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <span>Tarjetas Abiertas por Fecha (Imp. / Creación)</span>
              </span>
              <span className="text-xs text-slate-500 font-normal">
                Haga clic en una fecha para ver las <strong className="text-emerald-700">OV pendientes</strong>
              </span>
            </h3>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              {dateStats.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 bg-slate-50">
                  No hay tarjetas abiertas actualmente en el tablero.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Fecha</th>
                      <th className="py-3 px-3 text-center text-emerald-700">OV</th>
                      <th className="py-3 px-3 text-center text-slate-900">TR</th>
                      <th className="py-3 px-3 text-center text-purple-700">OF</th>
                      <th className="py-3 px-4 text-center font-bold">Total Abiertas</th>
                      <th className="py-3 px-4 text-left">Proporción y Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dateStats.map(stat => {
                      const isExpanded = selectedDate === stat.dateStr;

                      return (
                        <React.Fragment key={stat.dateStr}>
                          <tr
                            onClick={() => setSelectedDate(isExpanded ? null : stat.dateStr)}
                            className={`cursor-pointer transition-colors ${
                              isExpanded ? 'bg-indigo-50/70' : 'hover:bg-slate-50'
                            }`}
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-indigo-600 shrink-0" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                                )}
                                <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center shrink-0">
                                  <Calendar className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                  <div className="font-mono font-bold text-slate-900 flex items-center gap-1.5">
                                    <span>{stat.dateStr}</span>
                                    {stat.isToday && (
                                      <span className="text-[9.5px] font-sans font-bold uppercase bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
                                        Hoy
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-slate-500">
                                    {stat.ov > 0
                                      ? `${stat.ov} ${stat.ov === 1 ? 'OV pendiente' : 'OV pendientes'} (clic para ver)`
                                      : 'Clic para ver detalle'}
                                  </div>
                                </div>
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
                              <span className="bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                                {stat.total}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="w-full max-w-[165px]">
                                <div className="flex justify-between text-[10px] font-mono mb-1 text-slate-600">
                                  <span>{stat.loadPct}%</span>
                                  <span>
                                    {stat.pickingCount > 0 ? `${stat.pickingCount} pick` : ''}
                                    {stat.pickingCount > 0 && stat.despachoCount > 0 ? ' · ' : ''}
                                    {stat.despachoCount > 0 ? `${stat.despachoCount} desp` : ''}
                                  </span>
                                </div>
                                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-emerald-600 transition-all duration-300"
                                    style={{ width: `${Math.min(100, stat.loadPct)}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                          </tr>

                          {/* Expanded Detail Row: Pending OV orders for this date */}
                          {isExpanded && (
                            <tr className="bg-slate-50/90">
                              <td colSpan={6} className="p-3 sm:p-4 border-t border-indigo-100">
                                <div className="bg-white rounded-xl border border-indigo-200/80 p-3 shadow-2xs space-y-2">
                                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                      Órdenes OV pendientes del {stat.dateStr} ({stat.ovCards.length})
                                    </span>
                                    {(stat.tr > 0 || stat.of > 0) && (
                                      <span className="text-[10.5px] text-slate-500">
                                        Además en esta fecha: {stat.tr > 0 ? `${stat.tr} TR` : ''}{stat.tr > 0 && stat.of > 0 ? ' · ' : ''}{stat.of > 0 ? `${stat.of} OF` : ''}
                                      </span>
                                    )}
                                  </div>

                                  {stat.ovCards.length === 0 ? (
                                    <p className="text-[11px] text-slate-500 py-2">
                                      No hay órdenes OV abiertas en esta fecha (las tarjetas abiertas son de tipo TR/OF).
                                    </p>
                                  ) : (
                                    <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                                      {stat.ovCards.map(ovCard => {
                                        const stItems = (ovCard.items || []).filter(i => i.location === 'ST');
                                        const countItems = stItems.length > 0 ? stItems : (ovCard.items || []);
                                        const done = countItems.filter(i =>
                                          ovCard.status === 'despacho'
                                            ? i.isDispatched || (i.dispatchedQty || 0) >= i.requestedQty
                                            : i.isFinished || (i.pickedQty || 0) >= i.requestedQty
                                        ).length;
                                        const totalIt = countItems.length;
                                        const pickerNames = (ovCard.assignedPickerIds || [])
                                          .map(id => userNameMap.get(id) || id)
                                          .join(', ');

                                        return (
                                          <div
                                            key={ovCard.id}
                                            onClick={() => onSelectCard && onSelectCard(ovCard)}
                                            className={`py-2 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg transition-colors ${
                                              onSelectCard ? 'hover:bg-emerald-50/60 cursor-pointer' : ''
                                            }`}
                                          >
                                            <div className="min-w-0 flex-1 space-y-0.5">
                                              <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="bg-emerald-600 text-white font-black text-[9.5px] uppercase px-1.5 py-0.5 rounded">
                                                  OV
                                                </span>
                                                <span className="font-mono font-bold text-slate-900 text-xs">
                                                  #{ovCard.orderNumber}
                                                </span>
                                                {ovCard.po && (
                                                  <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono font-bold text-[10px] px-1.5 py-0.2 rounded">
                                                    PO: {ovCard.po}
                                                  </span>
                                                )}
                                                {ovCard.horaImp && (
                                                  <span className="text-[10px] font-mono text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded flex items-center gap-1">
                                                    <Printer className="w-2.5 h-2.5 text-indigo-500" />
                                                    {ovCard.horaImp}
                                                  </span>
                                                )}
                                                <span
                                                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                                    ovCard.status === 'despacho'
                                                      ? 'bg-amber-100 text-amber-800'
                                                      : 'bg-blue-50 text-blue-700'
                                                  }`}
                                                >
                                                  {ovCard.status === 'despacho' ? 'En Despacho' : 'En Picking'}
                                                </span>
                                              </div>
                                              <div className="text-[11px] font-medium text-slate-700 truncate" title={ovCard.client}>
                                                {ovCard.client}
                                              </div>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0 text-[11px]">
                                              <span className="text-slate-600 font-medium bg-slate-100 px-2 py-0.5 rounded">
                                                {pickerNames || 'Sin asignar'}
                                              </span>
                                              <span className="font-mono font-bold text-slate-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded tabular-nums">
                                                {done}/{totalIt}
                                              </span>
                                              {onSelectCard && (
                                                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
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

