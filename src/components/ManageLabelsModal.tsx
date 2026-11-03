import React, { useState } from 'react';
import { CardLabel } from '../types';
import {
  getStoredLabels,
  updateLabelDefinition,
  addCustomLabel,
  deleteCustomLabel,
  resetLabelsToDefault,
} from '../services/dataStorage';
import { X, Check, Edit2, Plus, Trash2, RotateCcw, Palette, Tag } from 'lucide-react';

interface ManageLabelsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

const PRESET_COLORS = [
  { bg: '#00D084', text: '#FFFFFF', label: 'Verde OV' },
  { bg: '#10B981', text: '#FFFFFF', label: 'Esmeralda' },
  { bg: '#F6E27F', text: '#451A03', label: 'Amarillo Claro' },
  { bg: '#EBBE23', text: '#451A03', label: 'Dorado 2° Pasaran' },
  { bg: '#FAD6A5', text: '#5B21B6', label: 'Melocotón Pendiente' },
  { bg: '#F95C54', text: '#FFFFFF', label: 'Rojo Ruta' },
  { bg: '#EF4444', text: '#FFFFFF', label: 'Rojo Intenso' },
  { bg: '#8B5CF6', text: '#FFFFFF', label: 'Púrpura' },
  { bg: '#0284C7', text: '#FFFFFF', label: 'Azul Multi' },
  { bg: '#3B82F6', text: '#FFFFFF', label: 'Azul Vivo' },
  { bg: '#58626A', text: '#FFFFFF', label: 'Gris Traslado' },
  { bg: '#1E293B', text: '#FFFFFF', label: 'Negro Slate' },
  { bg: '#F97316', text: '#FFFFFF', label: 'Naranja' },
  { bg: '#EC4899', text: '#FFFFFF', label: 'Rosado' },
  { bg: '#14B8A6', text: '#FFFFFF', label: 'Turquesa' },
];

export const ManageLabelsModal: React.FC<ManageLabelsModalProps> = ({
  isOpen,
  onClose,
  onUpdated,
}) => {
  const [labels, setLabels] = useState<CardLabel[]>(() => getStoredLabels());
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state for editing or creating
  const [editName, setEditName] = useState('');
  const [editBg, setEditBg] = useState('#00D084');
  const [editText, setEditText] = useState('#FFFFFF');

  // Creating mode state
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBg, setNewBg] = useState('#3B82F6');
  const [newText, setNewText] = useState('#FFFFFF');

  const refreshList = () => {
    setLabels(getStoredLabels());
    onUpdated();
  };

  if (!isOpen) return null;

  const handleStartEdit = (label: CardLabel) => {
    setEditingId(label.id);
    setEditName(label.name);
    setEditBg(label.bg);
    setEditText(label.text);
    setIsCreating(false);
  };

  const handleSaveEdit = (id: string) => {
    if (!editName.trim()) return;
    updateLabelDefinition(id, {
      name: editName.trim(),
      bg: editBg,
      text: editText,
    });
    setEditingId(null);
    refreshList();
  };

  const handleCreateNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    addCustomLabel({
      name: newName.trim(),
      bg: newBg,
      text: newText,
    });
    setNewName('');
    setIsCreating(false);
    refreshList();
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Está seguro de eliminar esta etiqueta?')) {
      deleteCustomLabel(id);
      refreshList();
    }
  };

  const handleResetDefaults = () => {
    if (confirm('¿Desea restablecer todas las etiquetas a la configuración inicial por defecto?')) {
      resetLabelsToDefault();
      setEditingId(null);
      setIsCreating(false);
      refreshList();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Administrar Catálogo de Etiquetas</h3>
              <p className="text-xs text-slate-500">
                Personalice nombres, colores de fondo y texto de las etiquetas
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

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Action Bar */}
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Etiquetas Registradas ({labels.length})
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetDefaults}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                title="Restablecer a valores iniciales"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restablecer</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCreating(!isCreating);
                  setEditingId(null);
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nueva Etiqueta</span>
              </button>
            </div>
          </div>

          {/* Form Create New Label */}
          {isCreating && (
            <form
              onSubmit={handleCreateNew}
              className="p-4 bg-indigo-50/70 rounded-xl border border-indigo-200 space-y-3 animate-in slide-in-from-top-2 duration-150"
            >
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                Crear Nueva Etiqueta Custom
              </h4>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Nombre de la Etiqueta
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Ej. URGENTE 24H"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>

              {/* Color Presets */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
                  Paleta de Colores Rápidos
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_COLORS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setNewBg(preset.bg);
                        setNewText(preset.text);
                      }}
                      style={{ backgroundColor: preset.bg, color: preset.text }}
                      className="text-[10px] font-bold px-2 py-1 rounded shadow-2xs border border-black/10 hover:scale-105 transition-transform"
                      title={preset.label}
                    >
                      Aa
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Hex Inputs */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                    Color de Fondo (Fondo)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={newBg}
                      onChange={e => setNewBg(e.target.value)}
                      className="w-8 h-8 rounded border border-slate-300 cursor-pointer p-0"
                    />
                    <input
                      type="text"
                      value={newBg}
                      onChange={e => setNewBg(e.target.value)}
                      className="w-full px-2 py-1 font-mono text-xs border border-slate-300 rounded bg-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                    Color de Texto (Letra)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={newText}
                      onChange={e => setNewText(e.target.value)}
                      className="w-8 h-8 rounded border border-slate-300 cursor-pointer p-0"
                    />
                    <input
                      type="text"
                      value={newText}
                      onChange={e => setNewText(e.target.value)}
                      className="w-full px-2 py-1 font-mono text-xs border border-slate-300 rounded bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="pt-2 flex items-center justify-between border-t border-indigo-200">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Vista previa:</span>
                  <span
                    style={{ backgroundColor: newBg, color: newText }}
                    className="text-xs font-bold px-3 py-1 rounded shadow-2xs"
                  >
                    {newName || 'Nombre Etiqueta'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="px-3 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded shadow-2xs"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Labels List */}
          <div className="space-y-2">
            {labels.map(label => {
              const isEditing = editingId === label.id;

              if (isEditing) {
                return (
                  <div
                    key={label.id}
                    className="p-4 bg-slate-50 rounded-xl border-2 border-indigo-500 space-y-3 animate-in fade-in duration-150"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-900 uppercase">
                        Editando Etiqueta: {label.id}
                      </span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Texto de la Etiqueta
                      </label>
                      <input
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
                      />
                    </div>

                    {/* Presets */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Paleta de Colores Rápidos
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {PRESET_COLORS.map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setEditBg(preset.bg);
                              setEditText(preset.text);
                            }}
                            style={{ backgroundColor: preset.bg, color: preset.text }}
                            className="text-[10px] font-bold px-2 py-1 rounded shadow-2xs border border-black/10 hover:scale-105 transition-transform"
                            title={preset.label}
                          >
                            Aa
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Hex controls */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                          Color Fondo
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={editBg}
                            onChange={e => setEditBg(e.target.value)}
                            className="w-7 h-7 rounded border border-slate-300 cursor-pointer p-0"
                          />
                          <input
                            type="text"
                            value={editBg}
                            onChange={e => setEditBg(e.target.value)}
                            className="w-full px-2 py-1 font-mono text-xs border border-slate-300 rounded bg-white"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                          Color Texto
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={editText}
                            onChange={e => setEditText(e.target.value)}
                            className="w-7 h-7 rounded border border-slate-300 cursor-pointer p-0"
                          />
                          <input
                            type="text"
                            value={editText}
                            onChange={e => setEditText(e.target.value)}
                            className="w-full px-2 py-1 font-mono text-xs border border-slate-300 rounded bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Preview & Actions */}
                    <div className="pt-2 flex items-center justify-between border-t border-slate-200">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">Vista previa:</span>
                        <span
                          style={{ backgroundColor: editBg, color: editText }}
                          className="text-xs font-bold px-3 py-1 rounded shadow-2xs"
                        >
                          {editName || 'Ejemplo'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(label.id)}
                          className="px-4 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded shadow-2xs flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Guardar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={label.id}
                  className="p-3 bg-white rounded-xl border border-slate-200 hover:border-slate-300 flex items-center justify-between transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span
                      style={{ backgroundColor: label.bg, color: label.text }}
                      className="text-xs font-bold px-3 py-1.5 rounded-md shadow-2xs font-sans"
                    >
                      {label.name}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      (ID: {label.id})
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(label)}
                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Editar color o texto"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(label.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar etiqueta"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};
