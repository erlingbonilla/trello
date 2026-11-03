import React, { useState } from 'react';
import { Card, User } from '../types';
import { searchOrder, SearchOrderResult } from '../services/dataStorage';
import { Search, X, CheckCircle, Clock, User as UserIcon, AlertCircle, ArrowRight, Package } from 'lucide-react';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCardDetail: (card: Card) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onOpenCardDetail,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [result, setResult] = useState<SearchOrderResult | null>(null);

  if (!isOpen) return null;

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = searchTerm.replace(/\D/g, '').slice(0, 9);
    if (!clean) return;

    setHasSearched(true);
    const res = searchOrder(clean);
    setResult(res);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Buscador de Órdenes (OV / TR / OF)
            </h2>
            <p className="text-xs text-slate-500">
              Localice tarjetas activas o consulte el histórico de picking en OneDrive (_tr y Productividad)
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-6 space-y-5">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Ingrese los 9 dígitos de la orden (ej. 100482910 o 100480001)"
                className="w-full px-4 py-2.5 pl-10 font-mono text-sm font-semibold rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                autoFocus
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-sm transition-colors"
            >
              Buscar Orden
            </button>
          </form>

          {/* Results Display */}
          {hasSearched && (
            <div>
              {result ? (
                result.foundOnBoard && result.card ? (
                  /* Case 1: Found Active on Board */
                  <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="bg-emerald-600 text-white font-bold text-xs px-2.5 py-0.5 rounded uppercase">
                          {result.card.type}
                        </span>
                        <span className="font-mono font-bold text-base text-slate-900">
                          #{result.card.orderNumber}
                        </span>
                        <span className="text-xs font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                          Tarjeta Activa en Tablero ({result.card.status === 'despacho' ? 'En Despacho' : 'En Picking'})
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          onClose();
                          if (result.card) onOpenCardDetail(result.card);
                        }}
                        className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-emerald-200 shadow-2xs"
                      >
                        <span>Ver Tarjeta</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div>
                      <div className="text-xs font-bold text-slate-500 uppercase">Cliente:</div>
                      <div className="text-sm font-bold text-slate-900">{result.card.client}</div>
                    </div>

                    <div className="p-3 bg-white rounded-lg border border-emerald-100 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-slate-500 block text-[11px]">Asignada Actualmente a:</span>
                        <span className="font-bold text-slate-900">
                          {result.assignedEmployees.join(', ') || 'Sin asignar'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-500 block text-[11px]">Códigos ST:</span>
                        <span className="font-mono font-bold text-slate-900">
                          {result.card.items.filter(i => i.isFinished).length}/{result.card.items.length} Terminados
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Case 2: Not on board, found in OneDrive transactions history! */
                  <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="bg-blue-600 text-white font-bold text-xs px-2.5 py-0.5 rounded uppercase">
                          {result.audit?.type || 'ORDEN'}
                        </span>
                        <span className="font-mono font-bold text-base text-slate-900">
                          #{result.audit?.orderNumber || searchTerm}
                        </span>
                        <span className="text-xs font-semibold text-blue-900 bg-blue-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5 text-blue-700" />
                          Orden Finalizada (Retirada del Tablero)
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-blue-900">
                      Esta orden ya fue completada y retirada automáticamente del tablero. A continuación se detallan los registros encontrados en <strong>_tr</strong> y <strong>Productividad</strong>:
                    </p>

                    <div className="grid grid-cols-2 gap-3 text-xs bg-white p-3 rounded-lg border border-blue-100">
                      <div>
                        <span className="text-slate-500 text-[11px] block">Pickeado por (Operador/Empleado):</span>
                        <span className="font-bold text-slate-900 flex items-center gap-1 mt-0.5">
                          <UserIcon className="w-3.5 h-3.5 text-blue-600" />
                          {result.assignedEmployees.join(', ')}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[11px] block">Último Movimiento / Cierre:</span>
                        <span className="font-mono font-semibold text-slate-800 block mt-0.5">
                          {result.transactions[0]?.dateTime || result.audit?.completedAt || 'Completado'}
                        </span>
                      </div>
                    </div>

                    {/* Historical transactions table */}
                    <div>
                      <div className="text-xs font-bold text-slate-700 mb-1.5">
                        Transacciones Registradas en OneDrive ({result.transactions.length}):
                      </div>
                      <div className="border border-slate-200 rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                        <table className="w-full text-left text-xs bg-white">
                          <thead className="bg-slate-100 text-slate-600 text-[11px]">
                            <tr>
                              <th className="py-1.5 px-2.5">Fecha</th>
                              <th className="py-1.5 px-2.5">Empleado</th>
                              <th className="py-1.5 px-2">Tipo</th>
                              <th className="py-1.5 px-2.5">Producto</th>
                              <th className="py-1.5 px-2 text-right">Cant. Delta</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                            {result.transactions.map((t, idx) => (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="py-1.5 px-2.5 text-slate-500">{t.dateTime}</td>
                                <td className="py-1.5 px-2.5 font-sans font-medium text-slate-800">
                                  {t.employeeName}
                                </td>
                                <td className="py-1.5 px-2">
                                  <span className="bg-slate-100 px-1 py-0.5 rounded font-bold">
                                    {t.transactionType}
                                  </span>
                                </td>
                                <td className="py-1.5 px-2.5 text-slate-900 font-bold">{t.productCode}</td>
                                <td className="py-1.5 px-2 text-right font-bold text-red-600">
                                  {t.cantDelta}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )
              ) : (
                /* Case 3: Not found anywhere */
                <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-xl">
                  <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700 mb-0.5">
                    No se encontraron registros para la orden #{searchTerm}
                  </p>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                    Verifique el número de 9 dígitos. La orden no existe en el tablero activo ni cuenta con transacciones previas en los archivos _tr o Productividad.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
