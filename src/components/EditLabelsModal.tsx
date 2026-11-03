import React, { useState, useEffect } from 'react';
import { Card, CardLabel } from '../types';
import { updateCardLabels, getStoredLabels } from '../services/dataStorage';
import { X, Check } from 'lucide-react';

interface EditLabelsModalProps {
  card: Card | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
  onOpenManageLabels?: () => void;
}

export const EditLabelsModal: React.FC<EditLabelsModalProps> = ({
  card,
  isOpen,
  onClose,
  onUpdated,
  onOpenManageLabels,
}) => {
  const [availableLabels, setAvailableLabels] = useState<CardLabel[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen && card) {
      setAvailableLabels(getStoredLabels());
      setSelectedLabels(card.labels);
    }
  }, [isOpen, card]);

  if (!isOpen || !card) return null;

  const toggleLabel = (labelId: string) => {
    setSelectedLabels(prev =>
      prev.includes(labelId) ? prev.filter(id => id !== labelId) : [...prev, labelId]
    );
  };

  const handleSave = () => {
    updateCardLabels(card.id, selectedLabels);
    onUpdated();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in duration-150">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Cambiar Etiquetas de Tarjeta</h3>
            <p className="text-xs text-slate-500 font-mono">Orden #{card.orderNumber}</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-slate-600">
              Seleccione las etiquetas a mostrar en la tarjeta:
            </p>
            {onOpenManageLabels && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenManageLabels();
                }}
                className="text-[11px] font-bold text-indigo-600 hover:underline"
              >
                ⚙️ Editar Colores/Texto
              </button>
            )}
          </div>

          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
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
                  className={`p-2.5 rounded-lg text-left text-xs font-bold flex items-center justify-between transition-all shadow-2xs ${
                    isSelected ? 'ring-2 ring-slate-900 ring-offset-1' : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  <span>{label.name}</span>
                  {isSelected && <Check className="w-4 h-4 shrink-0" />}
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
            className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm"
          >
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
};
