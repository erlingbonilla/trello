import React from 'react';
import { Card, User } from '../types';
import { getLabelById } from '../data/labels';
import { getTimeElapsed } from '../utils/timeAgo';
import { INITIAL_BODEGAS } from '../data/bodegasCatalog';
import { Clock, Trash2, Tag, ArrowRightLeft, CheckCircle2, AlertCircle } from 'lucide-react';

interface CardViewProps {
  card: Card;
  currentUser: User;
  allUsers: User[];
  onOpenDetail: (card: Card) => void;
  onEditLabels: (card: Card) => void;
  onReassign: (card: Card) => void;
  onDelete: (cardId: string) => void;
}

export const CardView: React.FC<CardViewProps> = ({
  card,
  currentUser,
  allUsers,
  onOpenDetail,
  onEditLabels,
  onReassign,
  onDelete,
}) => {
  const canModify = currentUser.role === 'master' || currentUser.role === 'asignador';
  const isDespachoCard = card.status === 'despacho';

  // Full solid header background depending on Card Type
  const headerStyles = {
    OV: {
      bg: 'bg-emerald-600',
      border: 'border-emerald-700',
      typeBadge: 'bg-emerald-800/60 text-white',
    },
    TR: {
      bg: 'bg-slate-900',
      border: 'border-slate-950',
      typeBadge: 'bg-slate-800 text-white',
    },
    OF: {
      bg: 'bg-purple-700',
      border: 'border-purple-800',
      typeBadge: 'bg-purple-900/60 text-white',
    },
  }[card.type] || {
    bg: 'bg-emerald-600',
    border: 'border-emerald-700',
    typeBadge: 'bg-emerald-800/60 text-white',
  };

  // Codes finished calculation (for OV: finished / total - pending)
  const items = card.items || [];
  const stItems = items.filter(item => item && item.location === 'ST');
  const itemsToCount = stItems.length > 0 ? stItems : items;
  const totalCodes = itemsToCount.length;
  const finishedCodes = itemsToCount.filter(item => 
    isDespachoCard ? (item.isDispatched || (item.dispatchedQty || 0) >= item.requestedQty) : (item.isFinished || (item.pickedQty || 0) >= item.requestedQty)
  ).length;
  const pendingCodes = Math.max(0, totalCodes - finishedCodes);
  const codeRatioStr = `${finishedCodes}/${totalCodes}-${pendingCodes}`;

  // Unique Bodega Display
  const uniqueBodegaCodes = Array.from(
    new Set(items.map(item => item && item.bodegaCode).filter(Boolean))
  );

  const bodegaDisplay = uniqueBodegaCodes.length > 0
    ? uniqueBodegaCodes.map(code => {
        const clean = code.trim();
        const catalogEntry = INITIAL_BODEGAS.find(
          b => b.code.toUpperCase() === clean.toUpperCase() || b.name.toUpperCase() === clean.toUpperCase()
        );
        if (catalogEntry) {
          return catalogEntry.name !== catalogEntry.code ? `${catalogEntry.name} (${catalogEntry.code})` : catalogEntry.name;
        }
        return clean;
      }).join(', ')
    : '600 (AA STOCK SUC ST)';

  // Filter items to show ONLY pending products (exclude finished ones from card preview)
  const pendingItems = items.filter(item => {
    if (!item) return false;
    if (isDespachoCard) {
      return (item.pickedQty || 0) > (item.dispatchedQty || 0);
    }
    return (item.pickedQty || 0) < item.requestedQty;
  });

  const previewPendingItems = pendingItems.slice(0, 3);
  const remainingPendingCount = Math.max(0, pendingItems.length - 3);

  // Assigned picker objects
  const assignedPickers = allUsers.filter(u => (card.assignedPickerIds || []).includes(u.id));

  return (
    <div
      onClick={() => onOpenDetail(card)}
      className="group relative bg-white rounded-xl shadow-xs hover:shadow-md transition-all duration-150 border border-slate-200 hover:border-slate-300 cursor-pointer mb-3 select-none flex flex-col justify-between overflow-hidden"
    >
      <div>
        {/* Full-width Solid Color Header according to Type */}
        <div className={`px-3 py-2.5 flex items-center justify-between text-white ${headerStyles.bg}`}>
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded shadow-2xs ${headerStyles.typeBadge}`}
            >
              {card.type}
            </span>
            {/* Larger Order Number */}
            <span className="font-mono text-base font-black tracking-tight text-white drop-shadow-xs">
              #{card.orderNumber}
            </span>
            {isDespachoCard && (
              <span className="text-[10px] bg-amber-400 text-amber-950 font-bold px-1.5 py-0.5 rounded shadow-2xs">
                Despacho
              </span>
            )}
          </div>

          {/* Time Elapsed Badge */}
          <div className="flex items-center gap-1 text-[11px] font-mono text-white/90 bg-black/25 px-2 py-0.5 rounded backdrop-blur-xs shrink-0">
            <Clock className="w-3 h-3 text-white/80" />
            <span>{getTimeElapsed(card.createdAt)}</span>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-3">
          {/* Client Name */}
          <h4
            className="text-[11.5px] font-semibold text-slate-700 leading-snug line-clamp-2 mb-1 group-hover:text-slate-950 transition-colors"
            title={card.client}
          >
            {card.client}
          </h4>

          {/* Bodega Location */}
          <div className="text-[10.5px] font-medium text-slate-600 flex items-center gap-1 mb-2">
            <span className="font-bold text-slate-700 text-[9.5px] uppercase tracking-wider bg-slate-100 px-1 py-0.2 rounded border border-slate-200 shrink-0">
              Bodega:
            </span>
            <span className="truncate font-semibold text-slate-700" title={bodegaDisplay}>
              {bodegaDisplay}
            </span>
          </div>

          {/* Labels / Tags */}
          {card.labels.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2.5">
              {card.labels.map(labelId => {
                const label = getLabelById(labelId);
                if (!label) return null;
                return (
                  <span
                    key={label.id}
                    style={{
                      backgroundColor: label.bg,
                      color: label.text,
                    }}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-sm shadow-2xs whitespace-nowrap tracking-wide"
                  >
                    {label.name}
                  </span>
                );
              })}
            </div>
          )}

          {/* Products Preview: Show ONLY PENDING products (Finished ones are hidden from preview) */}
          {pendingItems.length === 0 ? (
            <div className="bg-emerald-50 border border-emerald-200/70 rounded-lg p-2.5 text-center text-[11px] text-emerald-800 font-semibold flex items-center justify-center gap-1.5 my-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{isDespachoCard ? '¡Todo lo pickeado fue despachado!' : '¡Todos los productos pickeados!'}</span>
            </div>
          ) : (
            <div className="space-y-1.5 mb-2.5 bg-slate-50 rounded-lg p-2 border border-slate-100 text-xs">
              <div className="flex items-center justify-between text-[9.5px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60 mb-1">
                <div className="flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                  <span>
                    {isDespachoCard
                      ? `Listo para despachar (${pendingItems.length} código${pendingItems.length > 1 ? 's' : ''}):`
                      : `Pendiente de pickear (${pendingItems.length} código${pendingItems.length > 1 ? 's' : ''}):`}
                  </span>
                </div>
              </div>

              {previewPendingItems.map(item => {
                if (isDespachoCard) {
                  const readyQty = Math.max(0, (item.pickedQty || 0) - (item.dispatchedQty || 0));
                  const pct = Math.min(100, Math.round(((item.dispatchedQty || 0) / (item.pickedQty || 1)) * 100));

                  return (
                    <div key={item.id} className="border-b border-slate-200/60 last:border-b-0 pb-1 last:pb-0">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-mono font-bold text-slate-800 truncate max-w-[140px]" title={item.description}>
                          {item.productCode}
                        </span>
                        <span className="font-mono text-[9.5px] tabular-nums font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/80 shrink-0 ml-1">
                          Por despachar: {readyQty} u. ({item.dispatchedQty || 0}/{item.pickedQty || 0})
                        </span>
                      </div>
                      <div className="text-[9.5px] text-slate-500 truncate" title={item.description}>
                        {item.description}
                      </div>
                      {/* Progress bar */}
                      <div className="w-full bg-slate-200 h-1 rounded-full mt-0.5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300 bg-amber-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                }

                const currentQty = item.pickedQty || 0;
                const remainingQty = Math.max(0, item.requestedQty - currentQty);
                const pct = Math.min(100, Math.round((currentQty / (item.requestedQty || 1)) * 100));

                return (
                  <div key={item.id} className="border-b border-slate-200/60 last:border-b-0 pb-1 last:pb-0">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-mono font-bold text-slate-800 truncate max-w-[140px]" title={item.description}>
                        {item.productCode}
                      </span>
                      <span className="font-mono text-[9.5px] tabular-nums font-bold text-red-600 bg-red-50 px-1.5 py-0.2 rounded border border-red-200/80 shrink-0 ml-1">
                        Falta: {remainingQty} u. ({currentQty}/{item.requestedQty})
                      </span>
                    </div>
                    <div className="text-[9.5px] text-slate-500 truncate" title={item.description}>
                      {item.description}
                    </div>
                    {/* Progress bar */}
                    <div className="w-full bg-slate-200 h-1 rounded-full mt-0.5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300 bg-amber-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              {remainingPendingCount > 0 && (
                <div className="text-[9.5px] text-slate-500 font-semibold pt-0.5 text-center">
                  +{remainingPendingCount} código{remainingPendingCount > 1 ? 's' : ''} más pendiente{remainingPendingCount > 1 ? 's' : ''} en esta orden
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Card Footer: Code metrics, Pickers avatars & Action Buttons */}
      <div className="px-3 pb-2.5 pt-1.5 border-t border-slate-100 flex items-center justify-between text-xs">
        {/* Codes progress counter (e.g. 4/7-3 for OV) */}
        <div
          className="flex items-center gap-1 font-mono text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded"
          title={`${finishedCodes} de ${totalCodes} terminados (${pendingCodes} pendientes)`}
        >
          {finishedCodes === totalCodes ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          ) : (
            <span className="text-[9px] uppercase tracking-wider text-slate-500">ST:</span>
          )}
          <span className="tabular-nums font-bold">{codeRatioStr}</span>
        </div>

        {/* Assigned Pickers Avatars */}
        <div className="flex items-center -space-x-1.5 overflow-hidden">
          {assignedPickers.map(p => (
            <div
              key={p.id}
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-white shadow-2xs ${
                p.avatarColor || 'bg-slate-700'
              }`}
              title={`Asignado a: ${p.name}`}
            >
              {p.name.charAt(0).toUpperCase()}
            </div>
          ))}
        </div>

        {/* Action icons for Master/Asignador */}
        {canModify && !isDespachoCard && (
          <div
            className="flex items-center gap-1 text-slate-400 opacity-60 group-hover:opacity-100 transition-opacity"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => onEditLabels(card)}
              className="p-1 hover:text-slate-700 hover:bg-slate-100 rounded"
              title="Cambiar Etiquetas"
            >
              <Tag className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onReassign(card)}
              className="p-1 hover:text-slate-700 hover:bg-slate-100 rounded"
              title="Reasignar Pickeador"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(card.id)}
              className="p-1 hover:text-red-600 hover:bg-red-50 rounded"
              title="Eliminar Tarjeta"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
