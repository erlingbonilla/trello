import {
  BodegaCatalogEntry,
  Card,
  CardItem,
  CardType,
  CompletedOrderAudit,
  LiOrderRecord,
  Role,
  TransactionRecord,
  User,
} from '../types';
import { INITIAL_BODEGAS, isSTLocation, getBodegaLocation } from '../data/bodegasCatalog';
import { INITIAL_CARDS, INITIAL_LI_ORDERS, INITIAL_TRANSACTIONS } from '../data/mockOneDriveData';
import { INITIAL_USERS } from '../data/initialUsers';
import { INITIAL_CARD_LABELS } from '../data/labels';
import { normalizeProductCode, normalizeOrderNumber } from '../utils/productUtils';

const STORAGE_KEYS = {
  USERS: 'app_trello_users_v3',
  CURRENT_USER: 'app_trello_current_user_v3',
  AUTH_USER: 'app_trello_auth_user_v3',
  CARDS: 'app_trello_cards_v3',
  LI_ORDERS: 'app_trello_li_orders_v3',
  TRANSACTIONS: 'app_trello_transactions_v3',
  BODEGAS: 'app_trello_bodegas_v3',
  COMPLETED_AUDITS: 'app_trello_audits_v3',
  LABELS: 'app_trello_labels_v3',
};

// Safe helper to write to localStorage without throwing QuotaExceededError
export function safeSetStorage(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e: any) {
    console.warn(`LocalStorage quota exceeded writing to key "${key}". Pruning older cache...`, e);
    // If quota exceeded, clean up large non-critical caches
    try {
      localStorage.removeItem(STORAGE_KEYS.LI_ORDERS);
      localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }
}

// Clean up bloated localStorage from previous sessions
export function cleanupStorageQuotas() {
  try {
    const rawLi = localStorage.getItem(STORAGE_KEYS.LI_ORDERS);
    if (rawLi && rawLi.length > 200000) {
      // More than 200KB, prune to safe size
      const parsed = JSON.parse(rawLi);
      if (Array.isArray(parsed)) {
        safeSetStorage(STORAGE_KEYS.LI_ORDERS, JSON.stringify(parsed.slice(0, 100)));
      }
    }
  } catch {
    localStorage.removeItem(STORAGE_KEYS.LI_ORDERS);
  }

  try {
    const rawTx = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (rawTx && rawTx.length > 200000) {
      const parsed = JSON.parse(rawTx);
      if (Array.isArray(parsed)) {
        safeSetStorage(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(parsed.slice(0, 150)));
      }
    }
  } catch {
    localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
  }
}

// Initialize storage if empty, and ensure latest default orders like 200407844 are available
export function initStorage() {
  cleanupStorageQuotas();

  // Strictly enforce ONLY users from the official CSV list (INITIAL_USERS)
  const validUsernames = new Set(INITIAL_USERS.map(u => u.username.toLowerCase()));
  try {
    const rawUsers = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!rawUsers || !localStorage.getItem('app_trello_users_csv_v1')) {
      // Direct reset to only the 12 official CSV users
      safeSetStorage(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
      safeSetStorage('app_trello_users_csv_v1', 'true');
    } else {
      const parsed: User[] = JSON.parse(rawUsers);
      // Filter out any user NOT in the CSV list
      const filtered = parsed.filter(u => validUsernames.has(u.username.toLowerCase()));
      // Ensure all 12 are present with proper passwords and roles
      INITIAL_USERS.forEach(initUser => {
        const idx = filtered.findIndex(u => u.username.toLowerCase() === initUser.username.toLowerCase());
        if (idx === -1) {
          filtered.push(initUser);
        } else {
          filtered[idx].password = initUser.password;
          filtered[idx].role = initUser.role;
          filtered[idx].name = initUser.name;
        }
      });
      safeSetStorage(STORAGE_KEYS.USERS, JSON.stringify(filtered));
    }
  } catch {
    safeSetStorage(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
  }

  // Ensure current user is valid
  try {
    const current = JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || 'null');
    if (!current || !validUsernames.has((current.username || '').toLowerCase())) {
      safeSetStorage(STORAGE_KEYS.CURRENT_USER, JSON.stringify(INITIAL_USERS[0])); // Erling (Master)
    }
    const auth = JSON.parse(localStorage.getItem(STORAGE_KEYS.AUTH_USER) || 'null');
    if (auth && !validUsernames.has((auth.username || '').toLowerCase())) {
      localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
    }
  } catch {
    safeSetStorage(STORAGE_KEYS.CURRENT_USER, JSON.stringify(INITIAL_USERS[0]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.CARDS) || !localStorage.getItem('app_trello_cleared_initial_v2')) {
    safeSetStorage(STORAGE_KEYS.CARDS, JSON.stringify([]));
    safeSetStorage('app_trello_cleared_initial_v2', 'true');
  }
  if (!localStorage.getItem(STORAGE_KEYS.LI_ORDERS)) {
    safeSetStorage(STORAGE_KEYS.LI_ORDERS, JSON.stringify(INITIAL_LI_ORDERS));
  } else {
    // Ensure any orders in INITIAL_LI_ORDERS like 200407844 are present
    try {
      const storedLi: LiOrderRecord[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.LI_ORDERS) || '[]');
      const missing = INITIAL_LI_ORDERS.filter(
        initRow => !storedLi.some(
          sRow => sRow.orderNumber === initRow.orderNumber && sRow.productCode === initRow.productCode
        )
      );
      if (missing.length > 0) {
        safeSetStorage(STORAGE_KEYS.LI_ORDERS, JSON.stringify([...missing, ...storedLi].slice(0, 200)));
      }
    } catch {
      safeSetStorage(STORAGE_KEYS.LI_ORDERS, JSON.stringify(INITIAL_LI_ORDERS));
    }
  }
  if (!localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) {
    safeSetStorage(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(INITIAL_TRANSACTIONS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.BODEGAS)) {
    safeSetStorage(STORAGE_KEYS.BODEGAS, JSON.stringify(INITIAL_BODEGAS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.COMPLETED_AUDITS)) {
    const sampleAudit: CompletedOrderAudit[] = [
      {
        orderNumber: '100480001',
        type: 'OV',
        client: 'DISTRIBUIDORA DE ELECTRICIDAD CAESS S.A.',
        completedAt: '2026-10-31 16:40:00',
        pickerNames: ['Miguel', 'Equipo Despacho'],
        totalItems: 1,
        transactions: INITIAL_TRANSACTIONS.filter(t => t.orderNumber === '100480001'),
      },
    ];
    localStorage.setItem(STORAGE_KEYS.COMPLETED_AUDITS, JSON.stringify(sampleAudit));
  }
  if (!localStorage.getItem(STORAGE_KEYS.LABELS)) {
    safeSetStorage(STORAGE_KEYS.LABELS, JSON.stringify(INITIAL_CARD_LABELS));
  }
}

// Labels Management
export function getStoredLabels(): import('../types').CardLabel[] {
  initStorage();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LABELS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // Fallback
  }
  return INITIAL_CARD_LABELS;
}

export function saveStoredLabels(labels: import('../types').CardLabel[]) {
  safeSetStorage(STORAGE_KEYS.LABELS, JSON.stringify(labels));
}

export function updateLabelDefinition(id: string, updated: Partial<import('../types').CardLabel>): boolean {
  const labels = getStoredLabels();
  const idx = labels.findIndex(l => l.id === id);
  if (idx === -1) return false;
  labels[idx] = { ...labels[idx], ...updated };
  saveStoredLabels(labels);
  return true;
}

export function addCustomLabel(newLabel: Omit<import('../types').CardLabel, 'id'>): import('../types').CardLabel {
  const labels = getStoredLabels();
  const created: import('../types').CardLabel = {
    ...newLabel,
    id: `label_${Date.now()}`,
  };
  labels.push(created);
  saveStoredLabels(labels);
  return created;
}

export function deleteCustomLabel(id: string): boolean {
  const labels = getStoredLabels();
  const filtered = labels.filter(l => l.id !== id);
  saveStoredLabels(filtered);
  return true;
}

export function resetLabelsToDefault(): import('../types').CardLabel[] {
  saveStoredLabels(INITIAL_CARD_LABELS);
  return INITIAL_CARD_LABELS;
}

// Users & Authentication
export function getUsers(): User[] {
  initStorage();
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
  } catch {
    return INITIAL_USERS;
  }
}

export function saveUsers(users: User[]) {
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
}

export function getCurrentUser(): User {
  initStorage();
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || 'null') || INITIAL_USERS[0];
  } catch {
    return INITIAL_USERS[0];
  }
}

export function setCurrentUser(user: User) {
  localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(user));
}

export function getAuthenticatedUser(): User | null {
  initStorage();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    //
  }
  return null;
}

export function validateCredentials(usernameOrId: string, pass: string): User | null {
  const users = getUsers();
  const found = users.find(
    u => (u.id === usernameOrId || u.username.toLowerCase() === usernameOrId.trim().toLowerCase()) && u.active
  );
  if (!found) return null;
  if (found.password && found.password !== pass.trim()) {
    return null;
  }
  return found;
}

export function logoutUser() {
  localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
}

export function addUser(user: Omit<User, 'id'>): User {
  const users = getUsers();
  const newUser: User = {
    ...user,
    id: `user_${Date.now()}`,
  };
  users.push(newUser);
  saveUsers(users);
  return newUser;
}

// Bodegas
export function getBodegas(): BodegaCatalogEntry[] {
  initStorage();
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.BODEGAS) || '[]');
  } catch {
    return INITIAL_BODEGAS;
  }
}

export function saveBodegas(bodegas: BodegaCatalogEntry[]) {
  localStorage.setItem(STORAGE_KEYS.BODEGAS, JSON.stringify(bodegas));
}

// LI Orders
export function getLiOrders(): LiOrderRecord[] {
  initStorage();
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.LI_ORDERS) || '[]');
  } catch {
    return INITIAL_LI_ORDERS;
  }
}

export function saveLiOrders(records: LiOrderRecord[]) {
  // Keep only a safe sliding window of items in localStorage (max 150 items)
  const trimmed = records.slice(0, 150);
  safeSetStorage(STORAGE_KEYS.LI_ORDERS, JSON.stringify(trimmed));
}

// Transactions
export function getTransactions(): TransactionRecord[] {
  initStorage();
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS) || '[]');
  } catch {
    return INITIAL_TRANSACTIONS;
  }
}

export function saveTransactions(txs: TransactionRecord[]) {
  // Keep only a safe sliding window of transactions in localStorage (max 250 items)
  const trimmed = txs.slice(0, 250);
  safeSetStorage(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(trimmed));
}

// Completed audits
export function getCompletedAudits(): CompletedOrderAudit[] {
  initStorage();
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.COMPLETED_AUDITS) || '[]');
  } catch {
    return [];
  }
}

export function saveCompletedAudits(audits: CompletedOrderAudit[]) {
  safeSetStorage(STORAGE_KEYS.COMPLETED_AUDITS, JSON.stringify(audits));
}

// Cards
export function getCards(): Card[] {
  initStorage();
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.CARDS) || '[]');
  } catch {
    return INITIAL_CARDS;
  }
}

export function saveCards(cards: Card[]) {
  safeSetStorage(STORAGE_KEYS.CARDS, JSON.stringify(cards));
  try {
    fetch('/api/board/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cards, audits: getCompletedAudits() }),
    }).catch(() => {});
  } catch {
    //
  }
}

export async function pullBoardStateFromServer(): Promise<{ cards: Card[]; audits: CompletedOrderAudit[] } | null> {
  try {
    const res = await fetch('/api/board/state');
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.success && Array.isArray(data.cards)) {
      safeSetStorage(STORAGE_KEYS.CARDS, JSON.stringify(data.cards));
      if (Array.isArray(data.audits)) {
        safeSetStorage(STORAGE_KEYS.COMPLETED_AUDITS, JSON.stringify(data.audits));
      }
      return { cards: data.cards, audits: data.audits || [] };
    }
  } catch {
    //
  }
  return null;
}

export function deleteCard(cardId: string): boolean {
  const cards = getCards();
  const filtered = cards.filter(c => c.id !== cardId);
  saveCards(filtered);
  return true;
}

export function clearAllCards(): boolean {
  saveCards([]);
  return true;
}

export function reassignCard(cardId: string, newPickerIds: string[]): boolean {
  const cards = getCards();
  const cardIndex = cards.findIndex(c => c.id === cardId);
  if (cardIndex === -1) return false;
  cards[cardIndex].assignedPickerIds = newPickerIds;
  cards[cardIndex].updatedAt = new Date().toISOString();
  saveCards(cards);
  return true;
}

export function updateCardLabels(cardId: string, labels: string[]): boolean {
  const cards = getCards();
  const cardIndex = cards.findIndex(c => c.id === cardId);
  if (cardIndex === -1) return false;
  cards[cardIndex].labels = labels;
  cards[cardIndex].updatedAt = new Date().toISOString();
  saveCards(cards);
  return true;
}

// Card creation validation and processing
export interface CreateCardInput {
  type: CardType;
  orderNumber: string; // 9 digits
  assignedPickerIds: string[];
  labels: string[];
  customClient?: string;
  prefetchedItems?: any[];
  prefetchedTransactions?: TransactionRecord[];
  includeAllBodegas?: boolean;
}

export interface CreateCardResult {
  success: boolean;
  message: string;
  card?: Card;
}

export function validateAndCreateCard(input: CreateCardInput): CreateCardResult {
  const cleanOrderNum = input.orderNumber.replace(/\D/g, '').slice(-9).padStart(9, '0');
  if (cleanOrderNum.length !== 9 || cleanOrderNum === '000000000') {
    return {
      success: false,
      message: 'El número de orden debe contener exactamente 9 dígitos numéricos.',
    };
  }

  if (!input.assignedPickerIds || input.assignedPickerIds.length === 0) {
    return {
      success: false,
      message: 'Debe seleccionar al menos un Pickeador para asignar la tarjeta.',
    };
  }

  const bodegasCatalog = getBodegas();
  const liOrders = getLiOrders();
  const allCards = getCards();

  // Check if card with this order number already exists in active cards
  const existingActive = allCards.find(
    c => c.orderNumber === cleanOrderNum && c.type === input.type && c.status === 'picking'
  );
  if (existingActive) {
    return {
      success: false,
      message: `Ya existe una tarjeta activa en el tablero para la orden #${cleanOrderNum}.`,
    };
  }

  let clientName = input.customClient?.trim() || '';
  let items: CardItem[] = [];
  let hasNonStBodega = false;

  if (input.type === 'OV') {
    // 1. Search in prefetched items or in local _li cache by Orden #
    const sourceRows = (input.prefetchedItems && input.prefetchedItems.length > 0)
      ? input.prefetchedItems
      : liOrders.filter(row => normalizeOrderNumber(row.orderNumber) === cleanOrderNum);

    if (sourceRows.length === 0) {
      return {
        success: false,
        message: `La Orden #${cleanOrderNum} no existe en el archivo _li de OneDrive. Verifique el número ingresado.`,
      };
    }

    clientName = clientName || sourceRows[0].client || 'Cliente Sin Nombre';

    // 2. Filter products: check Bodega location ST vs others
    sourceRows.forEach((row: any, idx: number) => {
      const isST = isSTLocation(row.bodegaCode, bodegasCatalog);
      if (isST) {
        items.push({
          id: `item_${cleanOrderNum}_${idx}`,
          productCode: normalizeProductCode(row.productCode),
          description: row.description,
          requestedQty: row.requestedQty,
          pickedQty: 0,
          dispatchedQty: 0,
          bodegaCode: row.bodegaCode,
          location: 'ST',
          isFinished: false,
          isDispatched: false,
        });
      } else {
        hasNonStBodega = true;
      }
    });

    // Enforce rule: Card MUST contain at least one product from location ST
    if (items.length === 0) {
      return {
        success: false,
        message: `La Orden #${cleanOrderNum} no contiene ningún producto para la ubicación ST (Bodega Estándar/Stock). No es posible crear la tarjeta de picking.`,
      };
    }
  } else {
    // For TR or OF
    const sourceRows = (input.prefetchedItems && input.prefetchedItems.length > 0)
      ? input.prefetchedItems
      : liOrders.filter(row => row.orderNumber === cleanOrderNum);

    if (sourceRows.length > 0) {
      clientName = clientName || sourceRows[0].client;
      sourceRows.forEach((row: any, idx: number) => {
        items.push({
          id: `item_${cleanOrderNum}_${idx}`,
          productCode: row.productCode,
          description: row.description,
          requestedQty: row.requestedQty || 10,
          pickedQty: 0,
          dispatchedQty: 0,
          bodegaCode: row.bodegaCode || '600',
          location: isSTLocation(row.bodegaCode, bodegasCatalog) ? 'ST' : 'OTRA',
          isFinished: false,
          isDispatched: false,
        });
      });
    } else {
      // Find from transactions
      const txs = getTransactions().filter(t => t.orderNumber === cleanOrderNum);
      clientName = input.type === 'TR' ? 'TRASLADO INTERNO ENTRE BODEGAS' : 'ORDEN DE FABRICACION PLANTA';
      if (txs.length > 0) {
        // Group by product
        const prodMap = new Map<string, number>();
        txs.forEach(t => {
          const qty = Math.abs(t.cantDelta) || t.finalQty || 10;
          prodMap.set(t.productCode, (prodMap.get(t.productCode) || 0) + qty);
        });
        let idx = 0;
        prodMap.forEach((qty, code) => {
          items.push({
            id: `item_${cleanOrderNum}_${idx++}`,
            productCode: code,
            description: `PRODUCTO ${code}`,
            requestedQty: qty,
            pickedQty: 0,
            dispatchedQty: 0,
            bodegaCode: '600',
            location: 'ST',
            isFinished: false,
            isDispatched: false,
          });
        });
      } else {
        // Fallback item
        items.push({
          id: `item_${cleanOrderNum}_0`,
          productCode: `${input.type}-ITEM-01`,
          description: `MATERIAL GENERAL ${input.type} #${cleanOrderNum}`,
          requestedQty: 10,
          pickedQty: 0,
          dispatchedQty: 0,
          bodegaCode: '600',
          location: 'ST',
          isFinished: false,
          isDispatched: false,
        });
      }
    }
  }

  // Labels: add 'multi' tag if there's any product outside ST
  const labelsToApply = [...input.labels];
  if (hasNonStBodega && !labelsToApply.includes('multi')) {
    labelsToApply.push('multi');
  }
  // Ensure default type label is included
  if (input.type === 'OV' && !labelsToApply.includes('ov_tag')) {
    labelsToApply.unshift('ov_tag');
  } else if (input.type === 'TR' && !labelsToApply.includes('traslado')) {
    labelsToApply.unshift('traslado');
  }

  const newCard: Card = {
    id: `card_${Date.now()}_${cleanOrderNum}`,
    type: input.type,
    orderNumber: cleanOrderNum,
    client: clientName || `CLIENTE ORDEN ${cleanOrderNum}`,
    assignedPickerIds: input.assignedPickerIds,
    labels: labelsToApply,
    items,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isMulti: hasNonStBodega,
    status: 'picking',
  };

  if (input.prefetchedTransactions && input.prefetchedTransactions.length > 0) {
    const existingTxs = getTransactions();
    const merged = [
      ...input.prefetchedTransactions,
      ...existingTxs.filter(e => !input.prefetchedTransactions!.some(t => t.id === e.id)),
    ];
    saveTransactions(merged);
  }

  allCards.push(newCard);
  saveCards(allCards);

  // Recalculate progress immediately against existing transactions in case some were already logged
  syncCardsWithTransactions();

  return {
    success: true,
    message: `Tarjeta ${input.type} #${cleanOrderNum} creada exitosamente para ${clientName}.`,
    card: newCard,
  };
}

// Processing transactions against cards and triggering automated moves/closures
export function syncCardsWithTransactions(): {
  updatedCount: number;
  movedToDespachoCount: number;
  completedCount: number;
} {
  const cards = getCards();
  const transactions = getTransactions();
  const audits = getCompletedAudits();
  const users = getUsers();
  const despachoUser = users.find(u => u.role === 'despacho') || { id: 'user_despacho', name: 'Equipo Despacho' };

  let updatedCount = 0;
  let movedToDespachoCount = 0;
  let completedCount = 0;

  const cardsToKeep: Card[] = [];
  const newDespachoCards: Card[] = [];

  cards.forEach(card => {
    // Relevant transactions for this order
    const orderTxs = transactions.filter(t => t.orderNumber === card.orderNumber);

    // Track if any changes happened
    let cardModified = false;

    // Recalculate picked and dispatched quantities for each product item
    card.items.forEach(item => {
      const prodTxs = orderTxs.filter(
        t => normalizeProductCode(t.productCode).toUpperCase() === normalizeProductCode(item.productCode).toUpperCase()
      );

      let pickedTotal = 0;
      let dispatchedTotal = 0;

      if (card.type === 'OV') {
        // Step 2: For OV, look for "PI" transactions and sum only negative values of Cant. Delta
        const piTxs = prodTxs.filter(t => t.transactionType === 'PI');
        piTxs.forEach(t => {
          if (t.cantDelta < 0) {
            pickedTotal += Math.abs(t.cantDelta);
          }
        });

        // Step 4: For Despacho, look for "DL" transactions and sum negative values of Cant. Delta
        const dlTxs = prodTxs.filter(t => t.transactionType === 'DL');
        dlTxs.forEach(t => {
          if (t.cantDelta < 0) {
            dispatchedTotal += Math.abs(t.cantDelta);
          }
        });
      } else if (card.type === 'TR') {
        // TR: PIREQ (positive) and REQDEL (negative)
        const piReqTxs = prodTxs.filter(t => t.transactionType === 'PIREQ');
        piReqTxs.forEach(t => {
          if (t.cantDelta > 0) pickedTotal += t.cantDelta;
        });

        const reqDelTxs = prodTxs.filter(t => t.transactionType === 'REQDEL');
        reqDelTxs.forEach(t => {
          if (t.cantDelta < 0) dispatchedTotal += Math.abs(t.cantDelta);
        });
      } else if (card.type === 'OF') {
        // OF: PIPROD (positive) and TRPROD (negative)
        const piProdTxs = prodTxs.filter(t => t.transactionType === 'PIPROD');
        piProdTxs.forEach(t => {
          if (t.cantDelta > 0) pickedTotal += t.cantDelta;
        });

        const trProdTxs = prodTxs.filter(t => t.transactionType === 'TRPROD');
        trProdTxs.forEach(t => {
          if (t.cantDelta < 0) dispatchedTotal += Math.abs(t.cantDelta);
        });
      }

      if (item.pickedQty !== pickedTotal || item.dispatchedQty !== dispatchedTotal) {
        item.pickedQty = pickedTotal;
        item.dispatchedQty = dispatchedTotal;
        item.isFinished = pickedTotal >= item.requestedQty;
        item.isDispatched = dispatchedTotal >= item.requestedQty;
        cardModified = true;
      }
    });

    if (cardModified) updatedCount++;

    // Check picking card logic vs Despacho card logic
    if (card.status === 'picking') {
      const allItemsFinished = card.items.length > 0 && card.items.every(i => i.isFinished || (i.pickedQty || 0) >= i.requestedQty);
      const anyItemFinished = card.items.some(i => i.isFinished || (i.pickedQty || 0) > 0);
      const allItemsDispatched = card.items.length > 0 && card.items.every(i => i.isDispatched || (i.dispatchedQty || 0) >= i.requestedQty);

      // Check if Despacho card needs to be spawned
      if (anyItemFinished && !allItemsDispatched) {
        // Check if despacho card already exists for this order
        const existingDespacho = cards.find(
          c => c.orderNumber === card.orderNumber && c.status === 'despacho'
        ) || newDespachoCards.find(c => c.orderNumber === card.orderNumber && c.status === 'despacho');

        if (!existingDespacho) {
          const newDspCard: Card = {
            id: `despacho_${card.orderNumber}_${Date.now()}`,
            type: card.type,
            orderNumber: card.orderNumber,
            client: card.client,
            assignedPickerIds: [despachoUser.id],
            labels: [...card.labels],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isMulti: card.isMulti,
            status: 'despacho',
            items: card.items.map(item => ({
              ...item,
              id: `dsp_${item.id}`,
            })),
          };
          newDespachoCards.push(newDspCard);
          card.despachoCardId = newDspCard.id;
          movedToDespachoCount++;
        }
      }

      // CRITICAL RULE: When ALL codes have been picked (100%), the card is AUTOMATICALLY ELIMINATED from pickers' lists!
      if (allItemsFinished) {
        // Eliminated from pickers' column - do not add to cardsToKeep!
        if (allItemsDispatched) {
          // If already has DL on all products, record completed audit immediately
          completedCount++;
          const pickerNames = Array.from(
            new Set(orderTxs.map(t => t.employeeName).filter(Boolean))
          );
          audits.unshift({
            orderNumber: card.orderNumber,
            type: card.type,
            client: card.client,
            completedAt: new Date().toISOString(),
            pickerNames: pickerNames.length > 0 ? pickerNames : ['Miguel', 'Equipo Despacho'],
            totalItems: card.items.length,
            transactions: orderTxs,
          });
        }
      } else {
        cardsToKeep.push(card);
      }
    } else if (card.status === 'despacho') {
      // CRITICAL RULE: In Despacho, when ALL codes have DL (Delivery/Despachado), the card is AUTOMATICALLY ELIMINATED from the board!
      const allItemsDispatched = card.items.length > 0 && card.items.every(i => i.isDispatched || (i.dispatchedQty || 0) >= i.requestedQty);
      if (allItemsDispatched) {
        // Fully complete with DL! Remove from board and record audit
        completedCount++;
        const pickerNames = Array.from(
          new Set(orderTxs.map(t => t.employeeName).filter(Boolean))
        );
        audits.unshift({
          orderNumber: card.orderNumber,
          type: card.type,
          client: card.client,
          completedAt: new Date().toISOString(),
          pickerNames: pickerNames.length > 0 ? pickerNames : ['Miguel', 'Equipo Despacho'],
          totalItems: card.items.length,
          transactions: orderTxs,
        });
      } else {
        cardsToKeep.push(card);
      }
    }
  });

  const finalCards = [...cardsToKeep, ...newDespachoCards];
  saveCards(finalCards);
  saveCompletedAudits(audits);

  return { updatedCount, movedToDespachoCount, completedCount };
}

// Quick Picking and Dispatch Helpers
export function quickPickItem(cardId: string, itemId: string, employeeName = 'Miguel'): { cardDeleted: boolean; finished: boolean } {
  const cards = getCards();
  const card = cards.find(c => c.id === cardId);
  if (!card) return { cardDeleted: true, finished: true };

  const item = card.items.find(i => i.id === itemId);
  if (!item) return { cardDeleted: false, finished: false };

  const remaining = Math.max(0, item.requestedQty - (item.pickedQty || 0));
  if (remaining <= 0) return { cardDeleted: false, finished: true };

  // Generate appropriate transaction
  const txType = card.type === 'OV' ? 'PI' : card.type === 'TR' ? 'PIREQ' : 'PIPROD';
  let cantDelta = -Math.abs(remaining);
  if (txType === 'PIREQ' || txType === 'PIPROD') {
    cantDelta = Math.abs(remaining);
  }

  const sapPrefix = card.type === 'OV' ? 'SO' : card.type === 'TR' ? 'ITR' : 'WO';
  const newTx: TransactionRecord = {
    id: `quick_pi_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    source: '_tr',
    bodega: item.bodegaCode || '600',
    origenUbicacion: 'ST-01-01',
    ubicacion: 'ST-RAMPA-PICK',
    palletName: 'PL-QUICK-PICK',
    productCode: item.productCode,
    transactionType: txType,
    dateTime: new Date().toISOString().replace('T', ' ').substring(0, 19),
    employeeName,
    lisaRef: `LISA-${Math.floor(1000 + Math.random() * 9000)}`,
    sapRef: `${sapPrefix}${card.orderNumber}`,
    orderNumber: card.orderNumber,
    origin: 'PICKING',
    lotNumber: 'LT-2026',
    serialNumber: '',
    initialQty: 100,
    finalQty: 100 + cantDelta,
    cantDelta,
    uom: 'UND',
  };

  const txs = getTransactions();
  txs.unshift(newTx);
  saveTransactions(txs);

  syncCardsWithTransactions();

  // Check if card was deleted
  const freshCards = getCards();
  const cardStillExists = freshCards.some(c => c.id === cardId);
  return { cardDeleted: !cardStillExists, finished: true };
}

export function quickPickAllItems(cardId: string, employeeName = 'Miguel'): { cardDeleted: boolean } {
  const cards = getCards();
  const card = cards.find(c => c.id === cardId);
  if (!card) return { cardDeleted: true };

  const txs = getTransactions();
  const txType = card.type === 'OV' ? 'PI' : card.type === 'TR' ? 'PIREQ' : 'PIPROD';
  const sapPrefix = card.type === 'OV' ? 'SO' : card.type === 'TR' ? 'ITR' : 'WO';

  card.items.forEach(item => {
    const remaining = Math.max(0, item.requestedQty - (item.pickedQty || 0));
    if (remaining > 0) {
      let cantDelta = -Math.abs(remaining);
      if (txType === 'PIREQ' || txType === 'PIPROD') {
        cantDelta = Math.abs(remaining);
      }
      txs.unshift({
        id: `quick_pi_all_${Date.now()}_${item.id}`,
        source: '_tr',
        bodega: item.bodegaCode || '600',
        origenUbicacion: 'ST-01-01',
        ubicacion: 'ST-RAMPA-PICK',
        palletName: 'PL-QUICK-PICK',
        productCode: item.productCode,
        transactionType: txType,
        dateTime: new Date().toISOString().replace('T', ' ').substring(0, 19),
        employeeName,
        lisaRef: `LISA-${Math.floor(1000 + Math.random() * 9000)}`,
        sapRef: `${sapPrefix}${card.orderNumber}`,
        orderNumber: card.orderNumber,
        origin: 'PICKING',
        lotNumber: 'LT-2026',
        serialNumber: '',
        initialQty: 100,
        finalQty: 100 + cantDelta,
        cantDelta,
        uom: 'UND',
      });
    }
  });

  saveTransactions(txs);
  syncCardsWithTransactions();

  const freshCards = getCards();
  const cardStillExists = freshCards.some(c => c.id === cardId);
  return { cardDeleted: !cardStillExists };
}

export function quickDispatchItem(cardId: string, itemId: string, employeeName = 'Equipo Despacho'): { cardDeleted: boolean; finished: boolean } {
  const cards = getCards();
  const card = cards.find(c => c.id === cardId);
  if (!card) return { cardDeleted: true, finished: true };

  const item = card.items.find(i => i.id === itemId);
  if (!item) return { cardDeleted: false, finished: false };

  const remaining = Math.max(0, item.requestedQty - (item.dispatchedQty || 0));
  if (remaining <= 0) return { cardDeleted: false, finished: true };

  const txType = card.type === 'OV' ? 'DL' : card.type === 'TR' ? 'REQDEL' : 'TRPROD';
  const cantDelta = -Math.abs(remaining);
  const sapPrefix = card.type === 'OV' ? 'SO' : card.type === 'TR' ? 'ITR' : 'WO';

  const newTx: TransactionRecord = {
    id: `quick_dl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    source: '_tr',
    bodega: item.bodegaCode || '600',
    origenUbicacion: 'RAMPA-DESPACHO',
    ubicacion: 'SALIDA-TRANSPORTE',
    palletName: 'PL-DL-OUT',
    productCode: item.productCode,
    transactionType: txType,
    dateTime: new Date().toISOString().replace('T', ' ').substring(0, 19),
    employeeName,
    lisaRef: `DL-${Math.floor(1000 + Math.random() * 9000)}`,
    sapRef: `${sapPrefix}${card.orderNumber}`,
    orderNumber: card.orderNumber,
    origin: 'DESPACHO',
    lotNumber: 'LT-2026',
    serialNumber: '',
    initialQty: 100,
    finalQty: 100 + cantDelta,
    cantDelta,
    uom: 'UND',
  };

  const txs = getTransactions();
  txs.unshift(newTx);
  saveTransactions(txs);

  syncCardsWithTransactions();

  const freshCards = getCards();
  const cardStillExists = freshCards.some(c => c.id === cardId);
  return { cardDeleted: !cardStillExists, finished: true };
}

export function quickDispatchAllItems(cardId: string, employeeName = 'Equipo Despacho'): { cardDeleted: boolean } {
  const cards = getCards();
  const card = cards.find(c => c.id === cardId);
  if (!card) return { cardDeleted: true };

  const txs = getTransactions();
  const txType = card.type === 'OV' ? 'DL' : card.type === 'TR' ? 'REQDEL' : 'TRPROD';
  const sapPrefix = card.type === 'OV' ? 'SO' : card.type === 'TR' ? 'ITR' : 'WO';

  card.items.forEach(item => {
    const remaining = Math.max(0, item.requestedQty - (item.dispatchedQty || 0));
    if (remaining > 0) {
      const cantDelta = -Math.abs(remaining);
      txs.unshift({
        id: `quick_dl_all_${Date.now()}_${item.id}`,
        source: '_tr',
        bodega: item.bodegaCode || '600',
        origenUbicacion: 'RAMPA-DESPACHO',
        ubicacion: 'SALIDA-TRANSPORTE',
        palletName: 'PL-DL-OUT',
        productCode: item.productCode,
        transactionType: txType,
        dateTime: new Date().toISOString().replace('T', ' ').substring(0, 19),
        employeeName,
        lisaRef: `DL-${Math.floor(1000 + Math.random() * 9000)}`,
        sapRef: `${sapPrefix}${card.orderNumber}`,
        orderNumber: card.orderNumber,
        origin: 'DESPACHO',
        lotNumber: 'LT-2026',
        serialNumber: '',
        initialQty: 100,
        finalQty: 100 + cantDelta,
        cantDelta,
        uom: 'UND',
      });
    }
  });

  saveTransactions(txs);
  syncCardsWithTransactions();

  const freshCards = getCards();
  const cardStillExists = freshCards.some(c => c.id === cardId);
  return { cardDeleted: !cardStillExists };
}

// Search Order
export interface SearchOrderResult {
  foundOnBoard: boolean;
  card?: Card;
  audit?: CompletedOrderAudit;
  transactions: TransactionRecord[];
  assignedEmployees: string[];
}

export function searchOrder(query: string): SearchOrderResult | null {
  const clean = query.replace(/\D/g, '').slice(-9).padStart(9, '0');
  if (!clean || clean === '000000000') return null;

  const cards = getCards();
  const txs = getTransactions().filter(t => t.orderNumber === clean);
  const audits = getCompletedAudits();

  // 1. Check active board
  const foundCard = cards.find(c => c.orderNumber === clean);
  if (foundCard) {
    const employees = Array.from(
      new Set([
        ...foundCard.assignedPickerIds.map(id => {
          const u = getUsers().find(user => user.id === id);
          return u ? u.name : id;
        }),
        ...txs.map(t => t.employeeName),
      ])
    ).filter(Boolean);

    return {
      foundOnBoard: true,
      card: foundCard,
      transactions: txs,
      assignedEmployees: employees,
    };
  }

  // 2. Check completed audits
  const foundAudit = audits.find(a => a.orderNumber === clean);
  const employeeNames = Array.from(
    new Set([
      ...(foundAudit?.pickerNames || []),
      ...txs.map(t => t.employeeName),
    ])
  ).filter(Boolean);

  if (foundAudit || txs.length > 0) {
    return {
      foundOnBoard: false,
      audit: foundAudit,
      transactions: txs,
      assignedEmployees: employeeNames.length > 0 ? employeeNames : ['No registrado'],
    };
  }

  return null;
}

// Reset data to initial official state
export function resetToInitialState() {
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
  localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(INITIAL_CARDS));
  localStorage.setItem(STORAGE_KEYS.LI_ORDERS, JSON.stringify(INITIAL_LI_ORDERS));
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(INITIAL_TRANSACTIONS));
  localStorage.setItem(STORAGE_KEYS.BODEGAS, JSON.stringify(INITIAL_BODEGAS));
}
