import { Card, LiOrderRecord, TransactionRecord } from '../types';

export const INITIAL_LI_ORDERS: LiOrderRecord[] = [
  // Order 200407844 - ALPHA CONS (From User OneDrive _li file)
  {
    orderNumber: '200407844',
    client: 'ALPHA CONS',
    productCode: '0700120968',
    description: 'CONDUCTOR DE COBRE AA STOCK SUC ST',
    requestedQty: 25,
    bodegaCode: '600', // AA STOCK SUC ST (ST)
  },
  {
    orderNumber: '200407844',
    client: 'ALPHA CONS',
    productCode: '0461700008',
    description: 'BARRA COPPERWELD CONECTOR AA STOCK SUC ST',
    requestedQty: 10,
    bodegaCode: '600', // AA STOCK SUC ST (ST)
  },
  {
    orderNumber: '200407844',
    client: 'ALPHA CONS',
    productCode: '1300302352',
    description: 'SCOTCH LOC CONECTOR 3M AA STOCK SUC ST',
    requestedQty: 50,
    bodegaCode: '600', // AA STOCK SUC ST (ST)
  },

  // Order 100482910 - CAESS (OV)
  {
    orderNumber: '100482910',
    client: 'DISTRIBUIDORA DE ELECTRICIDAD CAESS S.A.',
    productCode: 'CAB-THHN-12-NG',
    description: 'CABLE DE COBRE THHN 12 AWG NEGRO 100M',
    requestedQty: 20,
    bodegaCode: '600', // ST
  },
  {
    orderNumber: '100482910',
    client: 'DISTRIBUIDORA DE ELECTRICIDAD CAESS S.A.',
    productCode: 'BRK-SQD-1P20',
    description: 'INTERRUPTOR TERMOMAGNETICO SQD 1P 20A QO',
    requestedQty: 15,
    bodegaCode: '608', // ST (RESERVA AES 2025-2026)
  },
  {
    orderNumber: '100482910',
    client: 'DISTRIBUIDORA DE ELECTRICIDAD CAESS S.A.',
    productCode: 'CDT-EMT-1/2',
    description: 'TUBO CONDUIT EMT 1/2 PULGADA 3M',
    requestedQty: 30,
    bodegaCode: '600', // ST
  },
  {
    orderNumber: '100482910',
    client: 'DISTRIBUIDORA DE ELECTRICIDAD CAESS S.A.',
    productCode: 'CON-SPL-4/0',
    description: 'CONECTOR MECANICO SPLIT BOLT 4/0 AWG',
    requestedQty: 8,
    bodegaCode: '600', // ST
  },

  // Order 100482911 - AES El Salvador (OV - multi bodega!)
  {
    orderNumber: '100482911',
    client: 'AES EL SALVADOR / CLESA',
    productCode: 'TRF-PAD-50KVA',
    description: 'TRANSFORMADOR MONOFASICO PAD MOUNTED 50KVA',
    requestedQty: 2,
    bodegaCode: '600', // ST
  },
  {
    orderNumber: '100482911',
    client: 'AES EL SALVADOR / CLESA',
    productCode: 'TAB-NQC-42C',
    description: 'TABLERO DE DISTRIBUCION NQC 42 CIRCUITOS',
    requestedQty: 1,
    bodegaCode: '600', // ST
  },
  {
    orderNumber: '100482911',
    client: 'AES EL SALVADOR / CLESA',
    productCode: 'CAB-THHN-10-RJ',
    description: 'CABLE THHN 10 AWG ROJO 100M',
    requestedQty: 10,
    bodegaCode: '01', // FB (non-ST bodega! triggers 'multi' label)
  },

  // Order 100482912 - Walmart Santo Tomas (OV)
  {
    orderNumber: '100482912',
    client: 'WALMART CENTROAMERICA S.A.',
    productCode: 'LMP-LED-UFO-150',
    description: 'CAMPANA INDUSTRIAL LED UFO 150W 5000K IP65',
    requestedQty: 12,
    bodegaCode: '605', // ST (CUELLAR WM)
  },
  {
    orderNumber: '100482912',
    client: 'WALMART CENTROAMERICA S.A.',
    productCode: 'CTD-3M-23',
    description: 'CINTA AISLANTE 3M TEMFLEX 1700 NEGRA',
    requestedQty: 40,
    bodegaCode: '600', // ST
  },
  {
    orderNumber: '100482912',
    client: 'WALMART CENTROAMERICA S.A.',
    productCode: 'BRK-SQD-2P40',
    description: 'INTERRUPTOR TERMOMAGNETICO SQD 2P 40A QO',
    requestedQty: 6,
    bodegaCode: '600', // ST
  },

  // Order 100482913 - Hospital Nacional Rosales (OV)
  {
    orderNumber: '100482913',
    client: 'HOSPITAL NACIONAL ROSALES',
    productCode: 'CAB-THHN-12-NG',
    description: 'CABLE DE COBRE THHN 12 AWG NEGRO 100M',
    requestedQty: 15,
    bodegaCode: '602', // ST (BODEGA RESERVA HOSPITAL ROSALES)
  },
  {
    orderNumber: '100482913',
    client: 'HOSPITAL NACIONAL ROSALES',
    productCode: 'TAB-NQC-42C',
    description: 'TABLERO DE DISTRIBUCION NQC 42 CIRCUITOS',
    requestedQty: 2,
    bodegaCode: '602', // ST
  },

  // Order 100482914 - Super Selectos (OV)
  {
    orderNumber: '100482914',
    client: 'CALLEJA S.A. DE C.V. (SUPER SELECTOS)',
    productCode: 'LMP-LED-UFO-150',
    description: 'CAMPANA INDUSTRIAL LED UFO 150W 5000K IP65',
    requestedQty: 8,
    bodegaCode: '600', // ST
  },
  {
    orderNumber: '100482914',
    client: 'CALLEJA S.A. DE C.V. (SUPER SELECTOS)',
    productCode: 'CON-SPL-4/0',
    description: 'CONECTOR MECANICO SPLIT BOLT 4/0 AWG',
    requestedQty: 14,
    bodegaCode: '600', // ST
  },

  // Order 100482915 - Electroferretera Industrial (OV)
  {
    orderNumber: '100482915',
    client: 'ELECTROFERRETERA INDUSTRIAL S.A.',
    productCode: 'CDT-EMT-1/2',
    description: 'TUBO CONDUIT EMT 1/2 PULGADA 3M',
    requestedQty: 50,
    bodegaCode: '600', // ST
  },
  {
    orderNumber: '100482915',
    client: 'ELECTROFERRETERA INDUSTRIAL S.A.',
    productCode: 'BRK-SQD-1P20',
    description: 'INTERRUPTOR TERMOMAGNETICO SQD 1P 20A QO',
    requestedQty: 25,
    bodegaCode: '600', // ST
  },

  // Order 100482916 - DEUSEM S.A. (OV)
  {
    orderNumber: '100482916',
    client: 'DEUSEM S.A. DE C.V.',
    productCode: 'CAB-THHN-10-RJ',
    description: 'CABLE THHN 10 AWG ROJO 100M',
    requestedQty: 18,
    bodegaCode: '614', // ST (CONSIGNACION DEUSEM 2017-2018)
  },
  {
    orderNumber: '100482916',
    client: 'DEUSEM S.A. DE C.V.',
    productCode: 'CON-SPL-4/0',
    description: 'CONECTOR MECANICO SPLIT BOLT 4/0 AWG',
    requestedQty: 12,
    bodegaCode: '600', // ST
  },

  // Products reference for TR & OF
  {
    orderNumber: '200847192',
    client: 'TRASLADO INTERNO BODEGAS ST-FB',
    productCode: 'CAB-THHN-12-NG',
    description: 'CABLE DE COBRE THHN 12 AWG NEGRO 100M',
    requestedQty: 25,
    bodegaCode: '600',
  },
  {
    orderNumber: '200847192',
    client: 'TRASLADO INTERNO BODEGAS ST-FB',
    productCode: 'BRK-SQD-1P20',
    description: 'INTERRUPTOR TERMOMAGNETICO SQD 1P 20A QO',
    requestedQty: 30,
    bodegaCode: '600',
  },
  {
    orderNumber: '200847193',
    client: 'TRASLADO ST A SAN MIGUEL SM',
    productCode: 'LMP-LED-UFO-150',
    description: 'CAMPANA INDUSTRIAL LED UFO 150W 5000K IP65',
    requestedQty: 16,
    bodegaCode: '600',
  },
  {
    orderNumber: '300958102',
    client: 'ORDEN FABRICACION TABLEROS NQC',
    productCode: 'TAB-NQC-42C',
    description: 'TABLERO DE DISTRIBUCION NQC 42 CIRCUITOS ENSAMBLE',
    requestedQty: 5,
    bodegaCode: '600',
  },
  {
    orderNumber: '300958103',
    client: 'ORDEN FABRICACION CONDUCTORES Y CONECTORES',
    productCode: 'CON-SPL-4/0',
    description: 'CONECTOR MECANICO SPLIT BOLT 4/0 AWG ARMADO',
    requestedQty: 40,
    bodegaCode: '600',
  },
];

export const INITIAL_TRANSACTIONS: TransactionRecord[] = [
  // Juan Perez picked 20 of CAB-THHN-12-NG on OV 100482910 (completed!)
  {
    id: 'tx_001',
    source: '_tr',
    bodega: '600',
    origenUbicacion: 'A-01-04',
    ubicacion: 'ST-RAMPA-01',
    palletName: 'PL-2094',
    productCode: 'CAB-THHN-12-NG',
    transactionType: 'PI',
    dateTime: '2026-11-01 08:30:15',
    employeeName: 'Juan Perez',
    lisaRef: 'LISA-4401',
    sapRef: 'SO100482910',
    orderNumber: '100482910',
    origin: 'PICKING',
    lotNumber: 'LT-2026A',
    serialNumber: '',
    initialQty: 120,
    finalQty: 100,
    cantDelta: -20,
    uom: 'MTR',
  },
  // Maria Lopez picked 15 of BRK-SQD-1P20 on OV 100482910 (completed!)
  {
    id: 'tx_002',
    source: 'productividad',
    bodega: '608',
    origenUbicacion: 'B-03-01',
    ubicacion: 'ST-RAMPA-01',
    palletName: 'PL-3110',
    productCode: 'BRK-SQD-1P20',
    transactionType: 'PI',
    dateTime: '2026-11-01 09:12:00',
    employeeName: 'Maria Lopez',
    lisaRef: 'LISA-4405',
    sapRef: 'SO100482910',
    orderNumber: '100482910',
    origin: 'PICKING',
    lotNumber: 'LT-SQD-01',
    serialNumber: '',
    initialQty: 60,
    finalQty: 45,
    cantDelta: -15,
    uom: 'UND',
  },
  // Despacho transaction for CAB-THHN-12-NG on OV 100482910
  {
    id: 'tx_003',
    source: '_tr',
    bodega: '600',
    origenUbicacion: 'ST-RAMPA-01',
    ubicacion: 'DESPACHO-CAMION-02',
    palletName: 'PL-2094',
    productCode: 'CAB-THHN-12-NG',
    transactionType: 'DL',
    dateTime: '2026-11-01 10:05:40',
    employeeName: 'Equipo Despacho',
    lisaRef: 'LISA-4420',
    sapRef: 'SO100482910',
    orderNumber: '100482910',
    origin: 'DESPACHO',
    lotNumber: 'LT-2026A',
    serialNumber: '',
    initialQty: 20,
    finalQty: 0,
    cantDelta: -20,
    uom: 'MTR',
  },
  // Pedro Ramirez picked 2 of TRF-PAD-50KVA on OV 100482911
  {
    id: 'tx_004',
    source: '_tr',
    bodega: '600',
    origenUbicacion: 'PATIO-ST-02',
    ubicacion: 'ST-RAMPA-02',
    palletName: 'PL-TRF-01',
    productCode: 'TRF-PAD-50KVA',
    transactionType: 'PI',
    dateTime: '2026-11-01 10:20:10',
    employeeName: 'Pedro Ramirez',
    lisaRef: 'LISA-4431',
    sapRef: 'SO100482911',
    orderNumber: '100482911',
    origin: 'PICKING',
    lotNumber: 'LT-TRF-2026',
    serialNumber: 'SN-990182',
    initialQty: 8,
    finalQty: 6,
    cantDelta: -2,
    uom: 'UND',
  },
  // Completed Order 100480001 (already finished and removed from active board, searchable in history)
  {
    id: 'tx_hist_01',
    source: 'productividad',
    bodega: '600',
    origenUbicacion: 'C-02-11',
    ubicacion: 'ST-RAMPA-03',
    palletName: 'PL-HIST-01',
    productCode: 'CAB-THHN-12-NG',
    transactionType: 'PI',
    dateTime: '2026-10-31 14:15:00',
    employeeName: 'Juan Perez',
    lisaRef: 'LISA-3990',
    sapRef: 'SO100480001',
    orderNumber: '100480001',
    origin: 'PICKING',
    lotNumber: 'LT-980',
    serialNumber: '',
    initialQty: 200,
    finalQty: 150,
    cantDelta: -50,
    uom: 'MTR',
  },
  {
    id: 'tx_hist_02',
    source: '_tr',
    bodega: '600',
    origenUbicacion: 'ST-RAMPA-03',
    ubicacion: 'CAMION-CAESS',
    palletName: 'PL-HIST-01',
    productCode: 'CAB-THHN-12-NG',
    transactionType: 'DL',
    dateTime: '2026-10-31 16:40:00',
    employeeName: 'Equipo Despacho',
    lisaRef: 'LISA-4002',
    sapRef: 'SO100480001',
    orderNumber: '100480001',
    origin: 'DESPACHO',
    lotNumber: 'LT-980',
    serialNumber: '',
    initialQty: 50,
    finalQty: 0,
    cantDelta: -50,
    uom: 'MTR',
  },
];

export const INITIAL_CARDS: Card[] = [];

