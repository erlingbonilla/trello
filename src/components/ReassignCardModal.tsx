import React, { useState } from 'react';
import { Card, User } from '../types';
import { reassignCard } from '../services/dataStorage';
import { X, Check, Users } from 'lucide-react';

interface ReassignCardModalProps {
  card: Card | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
  allUsers: User[];
}

export const ReassignCardModal: React.FC<ReassignCardModalProps> = ({
  card,
  isOpen,
  onClose,
  onUpdated,
  allUsers,
}) => {
  if (!isOpen || !card) return null;

  const [selectedPickers, setSelectedPickers] = useState<string[]>(card.assignedPickerIds);
  const pickers = allUsers.filter(u => u.role === 'pickeador' && u.active);

  const togglePicker = (id: string) => {
    setSelectedPickers(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    if (selectedPickers.length === 0) return;
    reassignCard(card.id, selectedPickers);
    onUpdated();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in duration-150">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Reasignar Tarjeta a Pickeador(es)</h3>
            <p className="text-xs text-slate-500 font-mono">
              {card.type} #{card.orderNumber} · {card.client}
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-xs text-slate-600 mb-2">
            Seleccione el o los pickeadores que trabajarán esta orden. Puede asignar múltiples personas:
          </p>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {pickers.map(p => {
              const isSelected = selectedPickers.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => togglePicker(p.id)}
                  className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 font-semibold'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0 ${
                        p.avatarColor || 'bg-slate-700'
                      }`}
                    >
                      {p.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">{p.name}</div>
                      <div className="text-[10px] text-slate-500">Pickeador activo</div>
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-indigo-600" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={selectedPickers.length === 0}
            className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-sm"
          >
            Guardar Reasignación
          </button>
        </div>
      </div>
    </div>
  );
};
