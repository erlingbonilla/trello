export type Role = 'master' | 'asignador' | 'pickeador' | 'despacho';

export interface User {
  id: string;
  username: string;
  name: string;
  role: Role;
  password?: string;
  active: boolean;
  avatarColor?: string;
}

export type CardType = 'OV' | 'TR' | 'OF';

export interface CardLabel {
  id: string;
  name: string;
  bg: string;
  text: string;
  border?: string;
}

export interface CardItem {
  id: string;
  productCode: string;
  description: string;
  requestedQty: number;
  pickedQty: number; // accumulated picked (sum of absolute negative deltas for PI / positive deltas for PIREQ/PIPROD)
  dispatchedQty: number; // accumulated dispatched (sum of absolute negative deltas for DL / REQDEL / TRPROD)
  bodegaCode: string;
  location: string; // e.g. "ST", "FB", "CSH"
  isFinished: boolean; // pickedQty >= requestedQty
  isDispatched: boolean; // dispatchedQty >= requestedQty
}

export interface Card {
  id: string;
  type: CardType;
  orderNumber: string; // 9 digits
  po?: string; // Correlative PO matching CORR. in _pk (e.g. 406602)
  client: string;
  assignedPickerIds: string[]; // Pickers assigned to this card
  labels: string[]; // Label IDs
  items: CardItem[];
  createdAt: string; // ISO date string
  updatedAt: string;
  isMulti: boolean; // Has products with warehouse locations other than ST
  status: 'picking' | 'despacho' | 'completed';
  despachoCardId?: string; // Reference to dispatched copy if separated
}

export interface BodegaCatalogEntry {
  code: string;
  name: string;
  location: string; // e.g. "ST", "FB", "CSH", "AV", "SM"
}

export interface LiOrderRecord {
  orderNumber: string; // 9 digits
  po?: string; // Correlative PO matching CORR. in _pk (e.g. 406602)
  client: string;
  productCode: string;
  description: string;
  requestedQty: number;
  bodegaCode: string;
}

export interface TransactionRecord {
  id: string;
  source: '_tr' | 'productividad';
  bodega: string;
  origenUbicacion: string;
  ubicacion: string;
  palletName: string;
  productCode: string;
  transactionType: string; // 'PI', 'DL', 'PIREQ', 'REQDEL', 'PIPROD', 'TRPROD'
  dateTime: string;
  employeeName: string;
  lisaRef: string;
  sapRef: string; // SO..., ITR..., WO...
  orderNumber: string; // Extracted last 9 digits
  origin: string;
  lotNumber: string;
  serialNumber: string;
  initialQty: number;
  finalQty: number;
  cantDelta: number;
  uom: string;
}

export interface CompletedOrderAudit {
  orderNumber: string;
  type: CardType;
  client?: string;
  completedAt?: string;
  pickerNames: string[];
  totalItems: number;
  transactions: TransactionRecord[];
}
