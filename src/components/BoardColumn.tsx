import React, { useState } from 'react';
import { Card, User } from '../types';
import { CardView } from './CardView';
import { Truck, User as UserIcon, Plus } from 'lucide-react';

interface BoardColumnProps {
  user: User;
  cards: Card[];
  currentUser: User;
  allUsers: User[];
  isDespacho?: boolean;
  onOpenDetail: (card: Card) => void;
  onEditLabels: (card: Card) => void;
  onReassign: (card: Card) => void;
  onDelete: (cardId: string) => void;
  onQuickCreateForPicker?: (pickerId: string) => void;
  onDropCardOnPicker?: (cardId: string, pickerId: string) => void;
  onReorderCard?: (cardId: string, pickerId: string, targetIndex: number) => void;
  onMoveCard?: (cardId: string, pickerId: string, direction: 'up' | 'down') => void;
  isSingleColumn?: boolean;
}

export const BoardColumn: React.FC<BoardColumnProps> = ({
  user,
  cards,
  currentUser,
  allUsers,
  isDespacho = false,
  onOpenDetail,
  onEditLabels,
  onReassign,
  onDelete,
  onQuickCreateForPicker,
  onDropCardOnPicker,
  onReorderCard,
  onMoveCard,
  isSingleColumn = false,
}) => {
  const canModify = currentUser.role === 'master' || currentUser.role === 'asignador';

  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'above' | 'below' | null>(null);
  const [isColumnDragOver, setIsColumnDragOver] = useState(false);

  // Stats for this picker's cards
  const ovCount = cards.filter(c => c.type === 'OV').length;
  const trCount = cards.filter(c => c.type === 'TR').length;
  const ofCount = cards.filter(c => c.type === 'OF').length;

  // Drag and drop handlers on Column level
  const handleColumnDragOver = (e: React.DragEvent) => {
    if (!canModify || isDespacho) return;
    e.preventDefault();
    setIsColumnDragOver(true);
  };

  const handleColumnDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsColumnDragOver(false);
      setDragOverCardId(null);
      setDropPosition(null);
    }
  };

  const handleColumnDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsColumnDragOver(false);
    setDragOverCardId(null);
    setDropPosition(null);
    if (!canModify || isDespacho) return;
    const cardId = e.dataTransfer.getData('text/plain');
    if (!cardId) return;

    if (onReorderCard) {
      onReorderCard(cardId, user.id, cards.length);
    } else if (onDropCardOnPicker) {
      onDropCardOnPicker(cardId, user.id);
    }
  };

  // Drag and drop handlers on Individual Card level
  const handleCardDragOver = (e: React.DragEvent, cardId: string) => {
    if (!canModify || isDespacho) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const relY = e.clientY - rect.top;
    const isAbove = relY < rect.height / 2;
    setDragOverCardId(cardId);
    setDropPosition(isAbove ? 'above' : 'below');
  };

  const handleCardDragLeave = (e: React.DragEvent) => {
    e.stopPropagation();
  };

  const handleCardDrop = (e: React.DragEvent, targetCardId: string, targetIdx: number) => {
    e.preventDefault();
    e.stopPropagation();
    setIsColumnDragOver(false);
    const pos = dropPosition;
    setDragOverCardId(null);
    setDropPosition(null);

    if (!canModify || isDespacho) return;
    const draggedCardId = e.dataTransfer.getData('text/plain');
    if (!draggedCardId) return;

    const insertIndex = pos === 'below' ? targetIdx + 1 : targetIdx;
    if (onReorderCard) {
      onReorderCard(draggedCardId, user.id, insertIndex);
    } else if (onDropCardOnPicker) {
      onDropCardOnPicker(draggedCardId, user.id);
    }
  };

  return (
    <div
      onDragOver={handleColumnDragOver}
      onDragLeave={handleColumnDragLeave}
      onDrop={handleColumnDrop}
      className={`${
        isSingleColumn ? 'w-full max-w-lg mx-auto' : 'w-80 sm:w-84 md:w-88 shrink-0'
      } flex flex-col rounded-xl transition-colors border shadow-xs max-h-[calc(100vh-140px)] ${
        isColumnDragOver ? 'ring-2 ring-emerald-500 bg-emerald-50/40' : ''
      } ${
        isDespacho
          ? 'bg-slate-100/90 border-slate-300'
          : 'bg-slate-100 border-slate-200'
      }`}
    >
      {/* Column Header */}
      <div className="p-3.5 border-b border-slate-200 bg-white/70 backdrop-blur-xs rounded-t-xl flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 shadow-xs ${
              isDespacho
                ? 'bg-slate-800'
                : user.avatarColor || 'bg-indigo-600'
            }`}
          >
            {isDespacho ? (
              <Truck className="w-4 h-4" />
            ) : (
              <span className="font-bold text-xs uppercase">
                {user.name.charAt(0)}
              </span>
            )}
          </div>

          <div className="min-w-0">
            <h3 className="font-bold text-sm text-slate-900 truncate leading-tight flex items-center gap-1.5">
              <span>{user.name}</span>
              {isDespacho && (
                <span className="text-[10px] font-mono uppercase bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-normal">
                  Auto
                </span>
              )}
            </h3>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
              <span>{cards.length} {cards.length === 1 ? 'tarjeta' : 'tarjetas'}</span>
              <span>·</span>
              <span className="text-emerald-700 font-mono font-semibold">{ovCount} OV</span>
              <span>·</span>
              <span className="text-slate-800 font-mono font-semibold">{trCount} TR</span>
              <span>·</span>
              <span className="text-purple-700 font-mono font-semibold">{ofCount} OF</span>
            </div>
          </div>
        </div>

        {canModify && !isDespacho && onQuickCreateForPicker && (
          <button
            onClick={() => onQuickCreateForPicker(user.id)}
            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors"
            title="Crear tarjeta para este pickeador"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Cards Scrollable Body */}
      <div className="p-3 overflow-y-auto flex-1 space-y-2.5">
        {cards.length === 0 ? (
          <div className="text-center py-10 px-4 border-2 border-dashed border-slate-200 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-slate-200/60 flex items-center justify-center mx-auto mb-2 text-slate-400">
              {isDespacho ? <Truck className="w-5 h-5" /> : <UserIcon className="w-5 h-5" />}
            </div>
            <p className="text-xs font-semibold text-slate-600 mb-0.5">
              {isDespacho ? 'Sin despachos pendientes' : 'Sin órdenes asignadas'}
            </p>
            <p className="text-[11px] text-slate-400 max-w-[200px] mx-auto">
              {isDespacho
                ? 'Las tarjetas con productos pickeados se moverán automáticamente aquí.'
                : 'Cree o asigne tarjetas para comenzar la labor de picking.'}
            </p>
          </div>
        ) : (
          cards.map((card, index) => {
            const isTarget = dragOverCardId === card.id;

            return (
              <div key={card.id} className="relative transition-all">
                {/* Visual Drop Line Above Card */}
                {isTarget && dropPosition === 'above' && (
                  <div className="h-1.5 bg-emerald-500 rounded-full mb-1.5 shadow-sm ring-2 ring-emerald-200 animate-pulse" />
                )}

                <div
                  draggable={canModify && !isDespacho}
                  onDragStart={e => {
                    e.dataTransfer.setData('text/plain', card.id);
                  }}
                  onDragOver={e => handleCardDragOver(e, card.id)}
                  onDragLeave={handleCardDragLeave}
                  onDrop={e => handleCardDrop(e, card.id, index)}
                  className={`transition-transform ${isTarget ? 'scale-[0.99]' : ''}`}
                >
                  <CardView
                    card={card}
                    positionIndex={index}
                    totalInColumn={cards.length}
                    currentUser={currentUser}
                    allUsers={allUsers}
                    onOpenDetail={onOpenDetail}
                    onEditLabels={onEditLabels}
                    onReassign={onReassign}
                    onDelete={onDelete}
                    onMoveUp={
                      canModify && !isDespacho && onMoveCard
                        ? () => onMoveCard(card.id, user.id, 'up')
                        : undefined
                    }
                    onMoveDown={
                      canModify && !isDespacho && onMoveCard
                        ? () => onMoveCard(card.id, user.id, 'down')
                        : undefined
                    }
                  />
                </div>

                {/* Visual Drop Line Below Card */}
                {isTarget && dropPosition === 'below' && (
                  <div className="h-1.5 bg-emerald-500 rounded-full mt-1.5 shadow-sm ring-2 ring-emerald-200 animate-pulse" />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
