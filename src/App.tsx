import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardItem, CardType, Role, User } from './types';
import {
  getCards,
  getCurrentUser,
  getUsers,
  saveCards,
  saveUsers,
  setCurrentUser,
  reassignCard,
  deleteCard,
  initStorage,
  getStoredLabels,
  getAuthenticatedUser,
  logoutUser,
  syncCardsWithTransactions,
  pullBoardStateFromServer,
} from './services/dataStorage';
import { isWithinSyncSchedule } from './utils/syncSchedule';
import { Navbar } from './components/Navbar';
import { BoardColumn } from './components/BoardColumn';
import { CreateCardModal } from './components/CreateCardModal';
import { CardDetailModal } from './components/CardDetailModal';
import { EditLabelsModal } from './components/EditLabelsModal';
import { ReassignCardModal } from './components/ReassignCardModal';
import { SummaryModal } from './components/SummaryModal';
import { SearchModal } from './components/SearchModal';
import { UserManagementModal } from './components/UserManagementModal';
import { DataSyncModal } from './components/DataSyncModal';
import { ManageLabelsModal } from './components/ManageLabelsModal';
import { LoginModal } from './components/LoginModal';
import { BulkImportModal } from './components/BulkImportModal';
import { Search, RotateCcw, Layers, Upload } from 'lucide-react';

export default function App() {
  // Initialization
  useEffect(() => {
    initStorage();
    syncCardsWithTransactions();
    setCards(getCards());

    // Pull latest shared state from server on startup
    pullBoardStateFromServer().then(res => {
      if (res && res.cards) {
        setCards(res.cards);
      }
    });
  }, []);

  const [users, setUsers] = useState<User[]>(() => getUsers());
  const [authenticatedUser, setAuthenticatedUser] = useState<User | null>(() => getAuthenticatedUser());
  const [currentUser, setCurrentUserState] = useState<User>(() => getCurrentUser());
  const [cards, setCards] = useState<Card[]>(() => getCards());

  // Real-time multi-device sync (polls server every 3.5s and on window focus for instant phone updates without F5)
  useEffect(() => {
    const syncState = () => {
      pullBoardStateFromServer().then(res => {
        if (res && res.cards) {
          setCards(res.cards);
        }
      });
    };

    const interval = setInterval(syncState, 3500);
    window.addEventListener('focus', syncState);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', syncState);
    };
  }, []);

  // Live timer interval to update elapsed time every 30s
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTick(t => t + 1);
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Schedule-aware background auto-sync poll (every 15s) and on startup
  useEffect(() => {
    const fetchBatchTxs = () => {
      const orderNums = getCards().map(c => c.orderNumber);
      if (orderNums.length > 0) {
        fetch('/api/onedrive/batch-transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderNumbers: orderNums }),
        })
          .then(res => res.json())
          .then(data => {
            if (data && data.transactions && data.transactions.length > 0) {
              syncCardsWithTransactions(data.transactions);
              setCards(getCards());
            }
          })
          .catch(() => {});
      }
    };

    // Run immediately on mount
    fetchBatchTxs();

    const syncInterval = setInterval(() => {
      if (isWithinSyncSchedule()) {
        fetchBatchTxs();
      }
    }, 15000); // 15 seconds

    return () => clearInterval(syncInterval);
  }, []);

  // Modals state
  const [createCardOpen, setCreateCardOpen] = useState(false);
  const [createDefaultPickerId, setCreateDefaultPickerId] = useState<string | undefined>(undefined);
  const [selectedCardForDetail, setSelectedCardForDetail] = useState<Card | null>(null);
  const [selectedCardForLabels, setSelectedCardForLabels] = useState<Card | null>(null);
  const [selectedCardForReassign, setSelectedCardForReassign] = useState<Card | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [dataSyncOpen, setDataSyncOpen] = useState(false);
  const [userMgmtOpen, setUserMgmtOpen] = useState(false);
  const [manageLabelsOpen, setManageLabelsOpen] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);

  // Filters state
  const [searchFilter, setSearchFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | CardType>('ALL');
  const [labelFilter, setLabelFilter] = useState<string>('ALL');

  // Reload data from localStorage
  const refreshData = () => {
    setCards(getCards());
    setUsers(getUsers());
  };

  // Login handler
  const handleLoginSuccess = (user: User) => {
    setAuthenticatedUser(user);
    setCurrentUserState(user);
    refreshData();
  };

  // Logout handler
  const handleLogout = () => {
    logoutUser();
    setAuthenticatedUser(null);
  };

  // Switch current user
  const handleSwitchUser = (newUser: User) => {
    setCurrentUser(newUser);
    setCurrentUserState(newUser);
    setAuthenticatedUser(newUser);
  };

  // Reassign / Move card
  const handleDropCardOnPicker = (cardId: string, targetPickerId: string) => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;
    reassignCard(cardId, [targetPickerId]);
    refreshData();
  };

  // Delete card handler
  const handleDeleteCard = (cardId: string) => {
    if (confirm('¿Está seguro de eliminar esta tarjeta del tablero?')) {
      deleteCard(cardId);
      refreshData();
    }
  };

  // Filtered cards
  const filteredCards = useMemo(() => {
    return cards.filter(card => {
      // Filter by search query (order number, client, products)
      if (searchFilter.trim()) {
        const query = searchFilter.toLowerCase().trim();
        const matchesOrder = card.orderNumber.includes(query);
        const matchesClient = card.client.toLowerCase().includes(query);
        const matchesProd = card.items.some(
          (i: CardItem) => i.productCode.toLowerCase().includes(query) || i.description.toLowerCase().includes(query)
        );
        if (!matchesOrder && !matchesClient && !matchesProd) return false;
      }

      // Filter by type
      if (typeFilter !== 'ALL' && card.type !== typeFilter) {
        return false;
      }

      // Filter by label
      if (labelFilter !== 'ALL' && !card.labels.includes(labelFilter)) {
        return false;
      }

      return true;
    });
  }, [cards, searchFilter, typeFilter, labelFilter]);

  // Determine which columns to show based on Role:
  // - Master & Asignador: All active pickers columns + Despacho column
  // - Pickeador: Only their OWN column
  // - Despacho: Only the Despacho column
  const pickers = useMemo(() => {
    return users.filter(u => u.role === 'pickeador' && u.active);
  }, [users]);

  const despachoUser: User = useMemo(() => {
    return (
      users.find(u => u.role === 'despacho') || {
        id: 'user_despacho',
        name: 'Equipo Despacho',
        username: 'despacho',
        role: 'despacho' as Role,
        active: true,
        avatarColor: 'bg-slate-800',
      }
    );
  }, [users]);

  const visibleColumns = useMemo(() => {
    if (currentUser.role === 'master' || currentUser.role === 'asignador') {
      return pickers;
    }
    if (currentUser.role === 'pickeador') {
      return pickers.filter(p => p.id === currentUser.id);
    }
    return []; // For despacho role, handled separately
  }, [currentUser, pickers]);

  const showDespachoColumn =
    currentUser.role === 'master' || currentUser.role === 'asignador' || currentUser.role === 'despacho';

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col antialiased">
      {/* Login Screen Modal overlay if not authenticated */}
      <LoginModal
        isOpen={!authenticatedUser}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Top Bar */}
      <Navbar
        currentUser={currentUser}
        allUsers={users}
        onSwitchUser={handleSwitchUser}
        onLogout={handleLogout}
        onOpenCreateCard={() => {
          setCreateDefaultPickerId(undefined);
          setCreateCardOpen(true);
        }}
        onOpenSummary={() => setSummaryOpen(true)}
        onOpenSearch={() => setSearchOpen(true)}
        onOpenDataSync={() => setDataSyncOpen(true)}
        onOpenUserManagement={() => setUserMgmtOpen(true)}
        onOpenManageLabels={() => setManageLabelsOpen(true)}
        onOpenBulkImport={() => setBulkImportOpen(true)}
      />

      {/* Main Board Subheader: Title, Filters & Stats */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Role Context Notification */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-500">Vista activa:</span>
            <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              {currentUser.role === 'master' && 'Master (Control Total - Todas las listas)'}
              {currentUser.role === 'asignador' && 'Asignador (Gestión de Listas y Tarjetas)'}
              {currentUser.role === 'pickeador' && `Pickeador: ${currentUser.name} (Lista Individual)`}
              {currentUser.role === 'despacho' && 'Despacho (Órdenes en Proceso de Entrega)'}
            </span>
            {(currentUser.role === 'master' || currentUser.role === 'asignador') && (
              <button
                onClick={() => setBulkImportOpen(true)}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded border border-indigo-200 transition-colors shadow-2xs cursor-pointer"
                title="Subir lote de tarjetas desde archivo CSV o Trello"
              >
                <Upload className="w-3 h-3 text-indigo-600" />
                <span>Subir CSV</span>
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Search Input Filter */}
            <div className="relative">
              <input
                type="text"
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                placeholder="Filtrar por orden, cliente o código..."
                className="pl-7 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs w-52 focus:w-64 transition-all focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
            </div>

            {/* Type Segmented Filter */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/80">
              <button
                onClick={() => setTypeFilter('ALL')}
                className={`px-2 py-1 rounded-md font-semibold transition-colors ${
                  typeFilter === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setTypeFilter('OV')}
                className={`px-2 py-1 rounded-md font-semibold transition-colors ${
                  typeFilter === 'OV' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600'
                }`}
              >
                OV
              </button>
              <button
                onClick={() => setTypeFilter('TR')}
                className={`px-2 py-1 rounded-md font-semibold transition-colors ${
                  typeFilter === 'TR' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600'
                }`}
              >
                TR
              </button>
              <button
                onClick={() => setTypeFilter('OF')}
                className={`px-2 py-1 rounded-md font-semibold transition-colors ${
                  typeFilter === 'OF' ? 'bg-purple-700 text-white shadow-2xs' : 'text-slate-600'
                }`}
              >
                OF
              </button>
            </div>

            {/* Label Filter Dropdown */}
            <select
              value={labelFilter}
              onChange={e => setLabelFilter(e.target.value)}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 text-xs"
            >
              <option value="ALL">Todas las etiquetas</option>
              {getStoredLabels().map(l => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>

            {(searchFilter || typeFilter !== 'ALL' || labelFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchFilter('');
                  setTypeFilter('ALL');
                  setLabelFilter('ALL');
                }}
                className="p-1 text-slate-400 hover:text-slate-700 rounded"
                title="Limpiar filtros"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Trello Board Canvas: Adaptive for Single Column (Mobile Phone) vs Multi Column (Desktop) */}
      <main className="flex-1 overflow-x-auto p-3 sm:p-6">
        {(() => {
          const isSingleCol = (visibleColumns.length === 1 && !showDespachoColumn) || (visibleColumns.length === 0 && showDespachoColumn);
          return (
            <div className={`flex items-start gap-4 pb-4 ${isSingleCol ? 'w-full max-w-lg mx-auto justify-center' : 'min-w-max'}`}>
              {/* Picker Columns (Each pickeador is a Trello List) */}
              {visibleColumns.map(picker => {
                const pickerCards = filteredCards.filter(
                  c =>
                    c.status === 'picking' &&
                    c.assignedPickerIds.includes(picker.id) &&
                    !(c.items.length > 0 && c.items.every(i => i.isFinished || (i.pickedQty || 0) >= i.requestedQty))
                );

                return (
                  <BoardColumn
                    key={picker.id}
                    user={picker}
                    cards={pickerCards}
                    currentUser={currentUser}
                    allUsers={users}
                    onOpenDetail={card => setSelectedCardForDetail(card)}
                    onEditLabels={card => setSelectedCardForLabels(card)}
                    onReassign={card => setSelectedCardForReassign(card)}
                    onDelete={handleDeleteCard}
                    onQuickCreateForPicker={pickerId => {
                      setCreateDefaultPickerId(pickerId);
                      setCreateCardOpen(true);
                    }}
                    onDropCardOnPicker={handleDropCardOnPicker}
                    isSingleColumn={isSingleCol}
                  />
                );
              })}

              {/* Despacho Column */}
              {showDespachoColumn && (
                <BoardColumn
                  key="column_despacho"
                  user={despachoUser}
                  cards={filteredCards.filter(
                    c =>
                      (c.status === 'despacho' || c.items.some(i => (i.pickedQty || 0) > (i.dispatchedQty || 0))) &&
                      c.items.some(i => (i.pickedQty || 0) > (i.dispatchedQty || 0))
                  )}
                  currentUser={currentUser}
                  allUsers={users}
                  isDespacho={true}
                  onOpenDetail={card => setSelectedCardForDetail(card)}
                  onEditLabels={card => setSelectedCardForLabels(card)}
                  onReassign={card => setSelectedCardForReassign(card)}
                  onDelete={handleDeleteCard}
                  isSingleColumn={isSingleCol}
                />
              )}

              {/* If pickeador has no column visible (e.g. inactive) */}
              {visibleColumns.length === 0 && !showDespachoColumn && (
                <div className="p-12 text-center bg-white rounded-xl border border-slate-200 mx-auto max-w-md">
                  <Layers className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <h3 className="font-bold text-slate-800 text-sm mb-1">Sin listas asignadas</h3>
                  <p className="text-xs text-slate-500">
                    El usuario actual no cuenta con listas activas en el tablero. Cambie de usuario desde la barra superior.
                  </p>
                </div>
              )}
            </div>
          );
        })()}
      </main>

      {/* Modals */}
      <CreateCardModal
        isOpen={createCardOpen}
        onClose={() => setCreateCardOpen(false)}
        onSuccess={refreshData}
        allUsers={users}
        defaultPickerId={createDefaultPickerId}
      />

      <CardDetailModal
        card={selectedCardForDetail}
        isOpen={!!selectedCardForDetail}
        onClose={() => setSelectedCardForDetail(null)}
        onCardUpdated={refreshData}
        currentUser={currentUser}
        allUsers={users}
      />

      <EditLabelsModal
        card={selectedCardForLabels}
        isOpen={!!selectedCardForLabels}
        onClose={() => setSelectedCardForLabels(null)}
        onUpdated={refreshData}
        onOpenManageLabels={() => setManageLabelsOpen(true)}
      />

      <ReassignCardModal
        card={selectedCardForReassign}
        isOpen={!!selectedCardForReassign}
        onClose={() => setSelectedCardForReassign(null)}
        onUpdated={refreshData}
        allUsers={users}
      />

      <SummaryModal
        isOpen={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        cards={cards}
        allUsers={users}
      />

      <SearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onOpenCardDetail={card => {
          setSelectedCardForDetail(card);
        }}
      />

      <UserManagementModal
        isOpen={userMgmtOpen}
        onClose={() => setUserMgmtOpen(false)}
        currentUser={currentUser}
        allUsers={users}
        onUsersUpdated={refreshData}
      />

      <DataSyncModal
        isOpen={dataSyncOpen}
        onClose={() => setDataSyncOpen(false)}
        onDataRefreshed={refreshData}
      />

      <ManageLabelsModal
        isOpen={manageLabelsOpen}
        onClose={() => setManageLabelsOpen(false)}
        onUpdated={refreshData}
      />

      <BulkImportModal
        isOpen={bulkImportOpen}
        onClose={() => setBulkImportOpen(false)}
        onSuccess={refreshData}
        allUsers={users}
      />
    </div>
  );
}
