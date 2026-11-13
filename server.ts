import fs from 'fs';
import path from 'path';
import express from 'express';
import { createServer as createViteServer, build as viteBuild } from 'vite';
import * as XLSX from 'xlsx';
import { resolveOneDriveFolderContext } from './src/services/onedriveFolderSync';
import { isWithinSyncSchedule, getSyncScheduleInfo } from './src/utils/syncSchedule';
import { isSTLocation } from './src/data/bodegasCatalog';
import { INITIAL_SEEDED_CARDS } from './src/data/initialSeededCards';
import { INITIAL_USERS } from './src/data/initialUsers';

async function startServer() {
  const app = express();
  const port = process.env.PORT || 3000;

  app.use(express.json({ limit: '50mb' }));

  // In-memory cache for OneDrive synced data & O(1) fast indexed maps
  let cachedSyncResult: any = null;
  let cachedLiOrderMap = new Map<string, any[]>();
  let cachedLiPoMap = new Map<string, any[]>();
  let cachedTxOrderMap = new Map<string, any[]>();
  let cachedProductDescMap = new Map<string, string>();
  let cachedPkOrders: string[] = [];
  let cachedPkMap = new Map<string, { fechaImp?: string; horaImp?: string }>();
  let cachedPkFileName: string = '';
  let cachedPkMonth: string = '';
  let isSyncing = false;
  let syncPromise: Promise<any> | null = null;

  const rebuildIndexes = (result: any) => {
    if (!result) return;
    const liMap = new Map<string, any[]>();
    const poMap = new Map<string, any[]>();
    const prodDescMap = new Map<string, string>();
    (result.liRecords || []).forEach((r: any) => {
      const k = String(r.orderNumber || '').replace(/\D/g, '').slice(-9).padStart(9, '0');
      if (k && k !== '000000000') {
        if (!liMap.has(k)) liMap.set(k, []);
        liMap.get(k)!.push(r);
      }
      if (r.po) {
        const cleanPo = String(r.po).trim().replace(/\D/g, '').replace(/^0+/, '');
        if (cleanPo) {
          if (!poMap.has(cleanPo)) poMap.set(cleanPo, []);
          poMap.get(cleanPo)!.push(r);
        }
      }
      const rawProd = String(r.productCode || '').trim();
      const cleanProd = rawProd.replace(/^0+/, '').toUpperCase();
      if (cleanProd && r.description && !prodDescMap.has(cleanProd)) {
        prodDescMap.set(cleanProd, String(r.description).trim());
      }
    });
    cachedLiOrderMap = liMap;
    cachedLiPoMap = poMap;
    cachedProductDescMap = prodDescMap;

    const txMap = new Map<string, any[]>();
    (result.transactions || []).forEach((t: any) => {
      const cleanT = String(t.orderNumber || '').replace(/\D/g, '').slice(-9).padStart(9, '0');
      if (cleanT && cleanT !== '000000000') {
        if (!txMap.has(cleanT)) txMap.set(cleanT, []);
        txMap.get(cleanT)!.push(t);
      }
      const cleanSap = String(t.sapRef || '').replace(/\D/g, '').slice(-9).padStart(9, '0');
      if (cleanSap && cleanSap !== '000000000' && cleanSap !== cleanT) {
        if (!txMap.has(cleanSap)) txMap.set(cleanSap, []);
        txMap.get(cleanSap)!.push(t);
      }
    });
    cachedTxOrderMap = txMap;

    if (Array.isArray(result.pkOrders)) {
      cachedPkOrders = result.pkOrders;
      cachedPkFileName = result.pkFileName || '';
      cachedPkMonth = result.pkMonth || '';
    }
    if (Array.isArray(result.pkRecords)) {
      const pkMap = new Map<string, { fechaImp?: string; horaImp?: string }>();
      result.pkRecords.forEach((rec: any) => {
        if (rec && rec.corr) {
          pkMap.set(String(rec.corr).trim(), {
            fechaImp: rec.fechaImp,
            horaImp: rec.horaImp,
          });
        }
      });
      cachedPkMap = pkMap;
    }
  };

  const resolvePkInfo = (orderNumber: string, existingPo?: string): { po?: string; fechaImp?: string; horaImp?: string } => {
    const cleanOrd = String(orderNumber || '').replace(/\D/g, '').slice(-9).padStart(9, '0');
    const cleanExistingPo = existingPo ? String(existingPo).trim().replace(/\D/g, '').replace(/^0+/, '') : '';
    const liPo = (cachedLiOrderMap.get(cleanOrd) || [])[0]?.po;
    const resolvedPo = cleanExistingPo || (liPo ? String(liPo).trim().replace(/\D/g, '').replace(/^0+/, '') : '');
    const pkEntry = (resolvedPo ? cachedPkMap.get(resolvedPo) : undefined) || cachedPkMap.get(cleanOrd.replace(/^0+/, ''));
    return {
      po: resolvedPo || undefined,
      fechaImp: pkEntry?.fechaImp,
      horaImp: pkEntry?.horaImp,
    };
  };


  const getProductDesc = (code: string, fallback: string): string => {
    const clean = String(code || '').replace(/^0+/, '').toUpperCase();
    return cachedProductDescMap.get(clean) || fallback;
  };

  const performFolderSync = async (folderUrl?: string) => {
    if (syncPromise) return syncPromise;
    const url =
      folderUrl ||
      'https://1drv.ms/f/c/a97927f4218d75aa/IgCbdjPW2zZxQaUGss9bS2uwAcCLWIYQb6IgbAJmCI0lvZw?e=LmSKmD';
    syncPromise = (async () => {
      isSyncing = true;
      try {
        console.log('Iniciando resolveOneDriveFolderContext:', url);
        const result = await resolveOneDriveFolderContext(url);
        cachedSyncResult = result;
        rebuildIndexes(result);
        console.log(`Sincronización completada: ${result.liCount} órdenes _li (${cachedLiOrderMap.size} únicas), ${result.trCount + result.prodCount} transacciones.`);
        return result;
      } finally {
        isSyncing = false;
        syncPromise = null;
      }
    })();
    return syncPromise;
  };

  // Status endpoint
  app.get('/api/onedrive/status', (_req, res) => {
    if (!cachedSyncResult) {
      return res.json({
        isSynced: false,
        isSyncing,
        liCount: 0,
        trCount: 0,
        filesFound: [],
        lastSync: null,
      });
    }
    return res.json({
      isSynced: true,
      isSyncing,
      liCount: cachedSyncResult.liCount,
      trCount: cachedSyncResult.trCount + cachedSyncResult.prodCount,
      filesFound: cachedSyncResult.filesFound,
      lastSync: cachedSyncResult.timestamp,
    });
  });

  // Endpoint to get unassigned ST orders for the current month's _pk file
  app.get('/api/onedrive/pk-unassigned', (_req, res) => {
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Set of orders currently active on the board (not completed)
    const activeBoardOrders = new Set(
      sharedCards
        .filter(c => c.status !== 'completed')
        .flatMap(c => {
          const ord = String(c.orderNumber || '').replace(/\D/g, '').slice(-9).padStart(9, '0');
          const po = c.po ? String(c.po).replace(/\D/g, '').replace(/^0+/, '') : '';
          return [ord, po].filter(Boolean);
        })
    );

    const unassignedOrders: any[] = [];
    const seenOrderNumbers = new Set<string>();

    cachedPkOrders.forEach(ord => {
      const rawCorr = String(ord || '').trim();
      const cleanCorr = rawCorr.replace(/\D/g, '').replace(/^0+/, '');
      if (!cleanCorr) return;

      // Match in _li: CORR. in _pk is the PO in _li
      let liRows = cachedLiPoMap.get(cleanCorr);
      if (!liRows || liRows.length === 0) {
        const norm9 = rawCorr.replace(/\D/g, '').slice(-9).padStart(9, '0');
        liRows = cachedLiOrderMap.get(norm9);
      }

      if (!liRows || liRows.length === 0) return;

      const firstRow = liRows[0];
      const realOrderNum = String(firstRow.orderNumber || '').replace(/\D/g, '').slice(-9).padStart(9, '0');
      if (!realOrderNum || realOrderNum === '000000000') return;

      // Deduplicate if multiple pk rows refer to the same order
      if (seenOrderNumbers.has(realOrderNum)) return;

      // 1. Skip if order is already active on the board (by orderNumber or by PO)
      if (activeBoardOrders.has(realOrderNum) || activeBoardOrders.has(cleanCorr)) return;

      // 2. Check _li records for this order: filter items in ST location
      const stRows = liRows.filter(r => isSTLocation(r.bodegaCode));
      if (stRows.length === 0) return; // Must have items in ST location

      // 3. Check if WMS transactions already show DL (already dispatched/closed)
      const txs = [
        ...(cachedTxOrderMap.get(realOrderNum) || []),
        ...(cleanCorr !== realOrderNum ? (cachedTxOrderMap.get(cleanCorr) || []) : []),
      ];
      const stTxs = txs.filter(t => isSTLocation(t.bodega));

      const hasDl = stTxs.some(t => {
        const txType = String(t.transactionType || '').toUpperCase();
        return t.cantDelta < 0 && (txType === 'DL' || txType === 'REQDEL' || txType === 'TRPROD');
      });

      if (hasDl) return; // Already finished and dispatched in WMS

      // 4. Calculate picking progress for each ST item
      let allItemsFinished = true;
      let anyItemPicked = false;
      let finishedItemsCount = 0;
      let piEmployee: string | undefined = undefined;

      const itemsWithProgress = stRows.map((r, idx) => {
        const rProdClean = String(r.productCode || '').replace(/^0+/, '').toUpperCase();
        const prodTxs = stTxs.filter(t => {
          const tProdClean = String(t.productCode || '').replace(/^0+/, '').toUpperCase();
          return tProdClean === rProdClean;
        });

        let pickedTotal = 0;
        prodTxs.forEach(t => {
          const txType = String(t.transactionType || '').toUpperCase();
          if (t.cantDelta < 0 && (txType === 'PI' || txType === 'PIREQ' || txType === 'PIPROD')) {
            pickedTotal += Math.abs(t.cantDelta);
            if (!piEmployee && t.employeeName) {
              piEmployee = t.employeeName;
            }
          }
        });

        const req = r.requestedQty || 1;
        const isItemDone = req > 0 && pickedTotal >= req;
        if (isItemDone) {
          finishedItemsCount++;
          anyItemPicked = true;
        } else {
          allItemsFinished = false;
          if (pickedTotal > 0) anyItemPicked = true;
        }

        return {
          id: `pk_item_${realOrderNum}_${idx}`,
          productCode: r.productCode,
          description: r.description,
          requestedQty: req,
          pickedQty: pickedTotal,
          bodegaCode: r.bodegaCode,
          isFinished: isItemDone,
        };
      });

      // Strict user rule: If the order was ALREADY COMPLETELY PICKED in WMS, omit it!
      // (It has already been picked, so it does not need to be assigned to the board)
      if (stRows.length > 0 && allItemsFinished) {
        return;
      }

      seenOrderNumbers.add(realOrderNum);

      const pkEntry = cachedPkMap.get(cleanCorr);

      unassignedOrders.push({
        orderNumber: realOrderNum,
        po: cleanCorr,
        type: 'OV',
        client: firstRow.client || `CLIENTE ORDEN ${realOrderNum}`,
        bodegaCode: firstRow.bodegaCode || '600',
        fechaImp: pkEntry?.fechaImp,
        horaImp: pkEntry?.horaImp,
        wmsStatus: anyItemPicked ? 'parcial' : 'sin_iniciar',
        pickedEmployeeName: piEmployee || undefined,
        finishedItemsCount,
        totalItemsCount: stRows.length,
        items: itemsWithProgress,
      });
    });

    return res.json({
      success: true,
      currentMonth: cachedPkMonth || currentMonthStr,
      fileName: cachedPkFileName || `${currentMonthStr}_pk`,
      totalPkOrders: cachedPkOrders.length,
      unassignedCount: unassignedOrders.length,
      unassignedOrders,
    });
  });

  app.post('/api/onedrive/pk-orders', (req, res) => {
    const { pkOrders, pkRecords, fileName, month } = req.body || {};
    if (Array.isArray(pkOrders)) {
      cachedPkOrders = pkOrders;
      cachedPkFileName = fileName || 'Manual_pk';
      cachedPkMonth = month || `${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    }
    if (Array.isArray(pkRecords)) {
      const pkMap = new Map<string, { fechaImp?: string; horaImp?: string }>();
      pkRecords.forEach((rec: any) => {
        if (rec && rec.corr) {
          pkMap.set(String(rec.corr).trim(), {
            fechaImp: rec.fechaImp,
            horaImp: rec.horaImp,
          });
        }
      });
      cachedPkMap = pkMap;
    }
    return res.json({ success: true, count: cachedPkOrders.length });
  });

  // Fast O(1) order lookup endpoint from indexed OneDrive cache (supports Order # and PO)
  app.get('/api/onedrive/order/:orderNumber', (req, res) => {
    const targetOrder = String(req.params.orderNumber).trim();
    if (!cachedSyncResult) {
      return res.status(404).json({ success: false, message: 'OneDrive aún no sincronizado en servidor.' });
    }

    const cleanTarget = targetOrder.replace(/\D/g, '').slice(-9).padStart(9, '0');
    const cleanPo = targetOrder.replace(/\D/g, '').replace(/^0+/, '');

    // Check by 9-digit order number OR by PO
    let matches = cachedLiOrderMap.get(cleanTarget);
    if (!matches || matches.length === 0) {
      matches = cachedLiPoMap.get(cleanPo) || [];
    }

    const effectiveOrderNum = matches.length > 0 ? matches[0].orderNumber : cleanTarget;
    const txMatches = [
      ...(cachedTxOrderMap.get(effectiveOrderNum) || []),
      ...(cleanPo && cleanPo !== effectiveOrderNum ? (cachedTxOrderMap.get(cleanPo) || []) : []),
    ];

    if (matches.length > 0) {
      const pkInfo = resolvePkInfo(matches[0].orderNumber, matches[0].po || cleanPo);
      return res.json({
        success: true,
        orderNumber: matches[0].orderNumber,
        po: pkInfo.po || matches[0].po || cleanPo,
        fechaImp: pkInfo.fechaImp,
        horaImp: pkInfo.horaImp,
        client: matches[0].client,
        items: matches,
        transactions: txMatches,
      });
    }

    // If not found in _li, check if found in transactions from location ST with valid prefix (ITR, SO, WO)
    const validStTxs = txMatches.filter((t: any) => {
      if (!isSTLocation(t.bodega)) return false;
      const sap = String(t.sapRef || '').trim().toUpperCase();
      const txType = String(t.transactionType || '').trim().toUpperCase();
      const isTR = sap.includes('ITR') && (txType === 'PIREQ' || txType === 'REQDEL');
      const isOV = sap.includes('SO') && (txType === 'PI' || txType === 'DL');
      const isOF = sap.includes('WO') && (txType === 'PIPROD' || txType === 'TRPROD');
      return isTR || isOV || isOF;
    });

    if (validStTxs.length > 0) {
      const prodMap = new Map<string, any>();
      validStTxs.forEach((t: any) => {
        const rawCode = String(t.productCode || '').trim();
        const code = /^\d+$/.test(rawCode) && rawCode.length < 10 ? rawCode.padStart(10, '0') : rawCode;
        if (!code) return;
        const delta = typeof t.cantDelta === 'number' ? t.cantDelta : parseFloat(String(t.cantDelta).replace(',', '.')) || 0;
        const realDesc = getProductDesc(code, `PRODUCTO ${code} (${t.uom || 'UND'}) - ${t.bodega || 'ST'}`);
        if (delta < 0) {
          const qty = Math.abs(delta);
          const existing = prodMap.get(code);
          if (existing) {
            existing.requestedQty += qty;
          } else {
            prodMap.set(code, {
              orderNumber: cleanTarget,
              client: `TRASLADO BODEGA ST (${t.bodega || '600'})`,
              productCode: code,
              description: realDesc,
              requestedQty: qty,
              bodegaCode: t.bodega || '600',
            });
          }
        }
      });

      if (prodMap.size === 0) {
        validStTxs.forEach((t: any) => {
          const rawCode = String(t.productCode || '').trim();
          const code = /^\d+$/.test(rawCode) && rawCode.length < 10 ? rawCode.padStart(10, '0') : rawCode;
          if (!code) return;
          const qty = Math.abs(t.cantDelta) || t.finalQty || 1;
          const realDesc = getProductDesc(code, `PRODUCTO ${code} (${t.uom || 'UND'}) - ${t.bodega || 'ST'}`);
          const existing = prodMap.get(code);
          if (!existing) {
            prodMap.set(code, {
              orderNumber: cleanTarget,
              client: `TRASLADO BODEGA ST (${t.bodega || '600'})`,
              productCode: code,
              description: realDesc,
              requestedQty: qty,
              bodegaCode: t.bodega || '600',
            });
          }
        });
      }

      const derivedItems = Array.from(prodMap.values());
      const firstClient = `TRASLADO BODEGA ST (${validStTxs[0]?.bodega || '600'})`;

      return res.json({
        success: true,
        orderNumber: targetOrder,
        client: firstClient,
        items: derivedItems,
        transactions: validStTxs,
      });
    }

    return res.status(404).json({ success: false, message: `Orden #${targetOrder} no encontrada en _li ni en transacciones WMS de ubicación ST.` });
  });

  // Shared multi-device board state in server memory & persisted to disk
  const boardCacheFile = path.resolve('.cache/board_state.json');
  let sharedCards: any[] = [];
  let sharedAudits: any[] = [];

  const loadBoardFromDisk = () => {
    try {
      if (fs.existsSync(boardCacheFile)) {
        const raw = fs.readFileSync(boardCacheFile, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.cards)) sharedCards = parsed.cards;
        if (Array.isArray(parsed.audits)) sharedAudits = parsed.audits;
      }
    } catch (e) {
      console.warn('Could not load board cache:', e);
    }
  };

  const saveBoardToDisk = () => {
    try {
      const dir = path.dirname(boardCacheFile);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(boardCacheFile, JSON.stringify({ cards: sharedCards, audits: sharedAudits }), 'utf8');
    } catch (e) {
      console.warn('Could not save board cache:', e);
    }
  };

  loadBoardFromDisk();

  // Dynamic board: starts with loaded cards from disk (or empty board ready for CSV upload / new cards)
  if (!sharedCards) {
    sharedCards = [];
  }

  const reconcileCardsWithOneDrive = () => {
    if (!cachedSyncResult || !cachedSyncResult.transactions || sharedCards.length === 0) return;

    sharedCards.forEach((card: any) => {
      const cleanTarget = String(card.orderNumber || '').replace(/\D/g, '').slice(-9).padStart(9, '0');

      // Attach PO, FECHA IMP & HORA IMP from _li and _pk automatically
      const pkInfo = resolvePkInfo(cleanTarget, card.po);
      if (pkInfo.po && !card.po) {
        card.po = pkInfo.po;
      }
      if (pkInfo.fechaImp) {
        card.fechaImp = pkInfo.fechaImp;
      }
      if (pkInfo.horaImp) {
        card.horaImp = pkInfo.horaImp;
      }

      // Strict filter:
      // 1. Only transactions in location ST
      // 2. Order number matches
      // 3. SAP prefix: OV -> SO, TR -> ITR, OF -> WO
      // 4. Transaction type:
      //    OV -> PI / DL
      //    TR -> PIREQ / REQDEL
      //    OF -> PIPROD / TRPROD
      const candidates = cachedTxOrderMap.get(cleanTarget) || [];
      const orderTxs = candidates.filter((t: any) => {
        if (!isSTLocation(t.bodega)) return false;

        const sap = String(t.sapRef || '').trim().toUpperCase();
        const txType = String(t.transactionType || '').trim().toUpperCase();

        if (card.type === 'OV') {
          if (!sap.includes('SO')) return false;
          return txType === 'PI' || txType === 'DL';
        } else if (card.type === 'TR') {
          if (!sap.includes('ITR')) return false;
          return txType === 'PIREQ' || txType === 'REQDEL';
        } else if (card.type === 'OF') {
          if (!sap.includes('WO')) return false;
          return txType === 'PIPROD' || txType === 'TRPROD';
        }
        return false;
      });

      // Synchronize items with real WMS transactions:
      if (orderTxs.length > 0) {
        orderTxs.forEach((t: any) => {
          const rawCode = String(t.productCode || '').trim();
          const code = /^\d+$/.test(rawCode) && rawCode.length < 10 ? rawCode.padStart(10, '0') : rawCode;
          if (!code) return;
          const delta = typeof t.cantDelta === 'number' ? t.cantDelta : parseFloat(String(t.cantDelta).replace(',', '.')) || 0;
          const realDesc = getProductDesc(code, `PRODUCTO ${code} (${t.uom || 'UND'}) - ${t.bodega || 'ST'}`);
          if (delta < 0) {
            const qty = Math.abs(delta);
            const existingItem = card.items.find((it: any) => {
              const itCode = String(it.productCode || '').replace(/^0+/, '').toUpperCase();
              const cCode = code.replace(/^0+/, '').toUpperCase();
              return itCode === cCode;
            });
            if (existingItem) {
              existingItem.requestedQty = Math.max(existingItem.requestedQty, qty);
              if (!existingItem.description || existingItem.description.startsWith('PRODUCTO ') || existingItem.description.includes('ITEM')) {
                existingItem.description = realDesc;
              }
            } else {
              card.items.push({
                id: `item_${cleanTarget}_${code}`,
                productCode: code,
                description: realDesc,
                requestedQty: qty,
                pickedQty: 0,
                dispatchedQty: 0,
                bodegaCode: t.bodega || '600',
                location: 'ST',
                isFinished: false,
                isDispatched: false,
              });
            }
          }
        });

        // Also update descriptions for any existing items on the card
        card.items.forEach((it: any) => {
          if (!it.description || it.description.startsWith('PRODUCTO ') || it.description.includes('ITEM')) {
            it.description = getProductDesc(it.productCode, it.description);
          }
        });

        // Remove placeholder items if real products exist
        if (card.items.length > 1) {
          card.items = card.items.filter((it: any) => !it.productCode.includes('ITEM'));
        }
      }

      // Calculate picking & dispatch progress for each item
      card.items.forEach((item: any) => {
        const itemCodeClean = String(item.productCode || '').replace(/^0+/, '').toUpperCase();
        const prodTxs = orderTxs.filter((t: any) => {
          const tCodeClean = String(t.productCode || '').replace(/^0+/, '').toUpperCase();
          return tCodeClean === itemCodeClean || t.productCode === item.productCode;
        });

        let pickedTotal = 0;
        let dispatchedTotal = 0;

        if (card.type === 'OV') {
          // OV: ONLY PI (cantDelta < 0) for picking, ONLY DL (cantDelta < 0) for dispatch
          prodTxs.forEach((t: any) => {
            if (t.transactionType === 'PI' && t.cantDelta < 0) {
              pickedTotal += Math.abs(t.cantDelta);
            }
            if (t.transactionType === 'DL' && t.cantDelta < 0) {
              dispatchedTotal += Math.abs(t.cantDelta);
            }
          });
        } else if (card.type === 'TR') {
          // TR: ONLY PIREQ (cantDelta < 0) for picking, ONLY REQDEL (cantDelta < 0) for dispatch
          prodTxs.forEach((t: any) => {
            if (t.transactionType === 'PIREQ' && t.cantDelta < 0) {
              pickedTotal += Math.abs(t.cantDelta);
            }
            if (t.transactionType === 'REQDEL' && t.cantDelta < 0) {
              dispatchedTotal += Math.abs(t.cantDelta);
            }
          });
        } else if (card.type === 'OF') {
          // OF: ONLY PIPROD (cantDelta < 0) for picking, ONLY TRPROD (cantDelta < 0) for dispatch
          prodTxs.forEach((t: any) => {
            if (t.transactionType === 'PIPROD' && t.cantDelta < 0) {
              pickedTotal += Math.abs(t.cantDelta);
            }
            if (t.transactionType === 'TRPROD' && t.cantDelta < 0) {
              dispatchedTotal += Math.abs(t.cantDelta);
            }
          });
        }

        item.pickedQty = pickedTotal;
        item.dispatchedQty = dispatchedTotal;
        item.isFinished = item.requestedQty > 0 && pickedTotal >= item.requestedQty;
        item.isDispatched = item.requestedQty > 0 && dispatchedTotal >= item.requestedQty;
      });

      // Update card pickers from employee in transactions ONLY if card has no assigned pickers
      if (orderTxs.length > 0 && (!card.assignedPickerIds || card.assignedPickerIds.length === 0)) {
        const empName = String(orderTxs[0].employeeName || '').toLowerCase();
        if (empName.includes('hugo')) {
          card.assignedPickerIds = ['picker_hugo'];
        } else if (empName.includes('miguel')) {
          card.assignedPickerIds = ['picker_miguel'];
        } else if (empName.includes('ricardo')) {
          card.assignedPickerIds = ['picker_ricardo'];
        }
      }

      // Check card completion / status
      const allDispatched = card.items.length > 0 && card.items.every((it: any) => it.isDispatched || (it.dispatchedQty || 0) >= it.requestedQty);
      const allPicked = card.items.length > 0 && card.items.every((it: any) => it.isFinished || (it.pickedQty || 0) >= it.requestedQty);

      if (allDispatched) {
        card.status = 'completed';
      } else if (allPicked) {
        card.status = 'despacho';
      } else {
        card.status = 'picking';
      }
    });

    // Deduplicate sharedCards by order number + type
    const cardMap = new Map<string, any>();
    sharedCards.forEach((c: any) => {
      const cleanOrd = String(c.orderNumber || '').replace(/\D/g, '').slice(-9).padStart(9, '0');
      const key = `${c.type}_${cleanOrd}`;
      const existing = cardMap.get(key);
      if (!existing) {
        cardMap.set(key, c);
      } else {
        const cTime = new Date(c.updatedAt).getTime();
        const eTime = new Date(existing.updatedAt).getTime();
        if (cTime >= eTime) {
          cardMap.set(key, c);
        }
      }
    });
    sharedCards = Array.from(cardMap.values());

    saveBoardToDisk();
  };

  app.get('/api/board/state', (_req, res) => {
    reconcileCardsWithOneDrive();
    return res.json({ success: true, cards: sharedCards, audits: sharedAudits });
  });

  app.post('/api/board/state', (req, res) => {
    if (Array.isArray(req.body?.cards)) {
      // Protect server board: never let a newly connected client with an empty [] state overwrite existing server cards
      if (req.body.cards.length > 0 || sharedCards.length === 0) {
        sharedCards = req.body.cards;
      }
    }
    if (Array.isArray(req.body?.audits)) {
      sharedAudits = req.body.audits;
    }
    reconcileCardsWithOneDrive();
    saveBoardToDisk();
    return res.json({ success: true, cards: sharedCards, audits: sharedAudits });
  });

  app.post('/api/board/clear', (_req, res) => {
    sharedCards = [];
    sharedAudits = [];
    saveBoardToDisk();
    return res.json({ success: true, message: 'Tablero vaciado con éxito en el servidor.' });
  });

  // Export active board cards (strictly Numero, Tipo, Pickeador)
  app.get('/api/board/export', (req, res) => {
    const format = String(req.query.format || 'xlsx').toLowerCase();
    const userMap = new Map(INITIAL_USERS.map((u, idx) => [u.id, { name: u.name, order: idx }]));

    const rawRows: Array<{
      pickerOrder: number;
      orderIndex: number;
      Numero: string;
      Tipo: string;
      Pickeador: string;
    }> = [];

    sharedCards
      .filter((c: any) => c.status !== 'completed')
      .forEach((c: any) => {
        const pickerIds: string[] = Array.isArray(c.assignedPickerIds) && c.assignedPickerIds.length > 0
          ? c.assignedPickerIds
          : ['__unassigned__'];

        pickerIds.forEach((pid: string) => {
          const userInfo = userMap.get(pid);
          const pickerName =
            pid === '__unassigned__'
              ? 'Sin asignar'
              : userInfo?.name || pid.replace(/^picker_/, '').replace(/^user_/, '');
          rawRows.push({
            pickerOrder: userInfo?.order ?? 999,
            orderIndex: c.orderIndex ?? 0,
            Numero: String(c.orderNumber || ''),
            Tipo: String(c.type || 'OV'),
            Pickeador: pickerName,
          });
        });
      });

    rawRows.sort((a, b) => a.pickerOrder - b.pickerOrder || a.orderIndex - b.orderIndex);

    const exportRows = rawRows.map(({ Numero, Tipo, Pickeador }) => ({
      Numero,
      Tipo,
      Pickeador,
    }));

    const dateStr = new Date().toISOString().slice(0, 10);

    if (format === 'csv') {
      const header = 'Numero;Tipo;Pickeador';
      const lines = exportRows.map(r => `${r.Numero};${r.Tipo};${r.Pickeador}`);
      const csvContent = '\uFEFF' + [header, ...lines].join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="ordenes_tablero_${dateStr}.csv"`);
      return res.send(csvContent);
    }

    const ws = XLSX.utils.json_to_sheet(
      exportRows.length > 0 ? exportRows : [{ Numero: '', Tipo: '', Pickeador: '' }],
      { header: ['Numero', 'Tipo', 'Pickeador'] }
    );
    ws['!cols'] = [{ wch: 16 }, { wch: 8 }, { wch: 24 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ordenes');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="ordenes_tablero_${dateStr}.xlsx"`);
    return res.send(buf);
  });

  // Bulk Import cards endpoint (from CSV: Numero;Tipo;Usuario)
  app.post('/api/board/bulk-import', (req, res) => {
    try {
      const items: Array<{ orderNumber: string; type: string; username: string }> = req.body?.items || [];
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'No se recibieron filas válidas para importar.' });
      }

      // Group pickers by order number:
      const orderPickersMap = new Map<string, Set<string>>();
      const orderTypeMap = new Map<string, string>();

      // User name normalizer
      const normalizeUser = (name: string): string => {
        const clean = name.trim().toLowerCase();
        if (clean.includes('marco')) return 'picker_marco';
        if (clean.includes('hugo')) return 'picker_hugo';
        if (clean.includes('gerardo')) return 'picker_gerardo';
        if (clean.includes('miguel')) return 'picker_miguel';
        if (clean.includes('jose')) return 'picker_jose';
        if (clean.includes('ricardo')) return 'picker_ricardo';
        if (clean.includes('walter')) return 'picker_walter';
        if (clean.includes('edwin')) return 'picker_edwin';
        if (clean.includes('despacho')) return 'user_despacho';
        return 'picker_miguel';
      };

      items.forEach(row => {
        const cleanOrd = String(row.orderNumber || '').replace(/\D/g, '').slice(-9).padStart(9, '0');
        if (!cleanOrd || cleanOrd === '000000000') return;
        const pickerId = normalizeUser(row.username || '');
        if (!orderPickersMap.has(cleanOrd)) {
          orderPickersMap.set(cleanOrd, new Set());
        }
        orderPickersMap.get(cleanOrd)!.add(pickerId);

        const rawType = String(row.type || 'OV').trim().toUpperCase();
        const validCardType = rawType === 'TR' ? 'TR' : rawType === 'OF' ? 'OF' : 'OV';
        orderTypeMap.set(cleanOrd, validCardType);
      });

      const newCards: any[] = [];
      const skippedOrders: Array<{ order: string; reason: string }> = [];

      orderPickersMap.forEach((pickerSet, ord) => {
        const pickers = Array.from(pickerSet);
        const cardType = orderTypeMap.get(ord) || 'OV';
        const liRows = cachedLiOrderMap.get(ord) || [];

        let clientName = liRows[0]?.client || '';
        let cardItems: any[] = [];
        let hasNonSt = false;

        if (cardType === 'OV') {
          const stRows = liRows.filter((r: any) => isSTLocation(r.bodegaCode));
          hasNonSt = liRows.some((r: any) => !isSTLocation(r.bodegaCode));

          if (stRows.length === 0) {
            skippedOrders.push({
              order: ord,
              reason: liRows.length === 0
                ? 'No existe en el archivo _li de OneDrive'
                : 'No contiene productos en ubicación ST',
            });
            return;
          }

          clientName = clientName || 'CLIENTE ORDEN ' + ord;
          cardItems = stRows.map((r: any, idx: number) => ({
            id: `item_${ord}_${idx}`,
            productCode: String(r.productCode || '').trim(),
            description: r.description,
            requestedQty: r.requestedQty || 1,
            pickedQty: 0,
            dispatchedQty: 0,
            bodegaCode: r.bodegaCode,
            location: 'ST',
            isFinished: false,
            isDispatched: false,
          }));
        } else {
          // For TR or OF
          clientName = cardType === 'TR' ? 'TRASLADO BODEGA ST' : 'ORDEN DE FABRICACION PLANTA';
          if (liRows.length > 0) {
            clientName = liRows[0].client || clientName;
            cardItems = liRows.filter((r: any) => isSTLocation(r.bodegaCode)).map((r: any, idx: number) => ({
              id: `item_${ord}_${idx}`,
              productCode: String(r.productCode || '').trim(),
              description: r.description,
              requestedQty: r.requestedQty || 1,
              pickedQty: 0,
              dispatchedQty: 0,
              bodegaCode: r.bodegaCode,
              location: 'ST',
              isFinished: false,
              isDispatched: false,
            }));
          } else {
            // Find in transactions
            const txs = (cachedTxOrderMap.get(ord) || []).filter((t: any) => isSTLocation(t.bodega));
            if (txs.length > 0) {
              const prodMap = new Map<string, any>();
              txs.forEach((t: any) => {
                const rawCode = String(t.productCode || '').trim();
                const code = /^\d+$/.test(rawCode) && rawCode.length < 10 ? rawCode.padStart(10, '0') : rawCode;
                if (!code) return;
                const qty = Math.abs(t.cantDelta) || t.finalQty || 1;
                const desc = getProductDesc(code, `PRODUCTO ${code} (${t.uom || 'UND'}) - ${t.bodega || 'ST'}`);
                if (!prodMap.has(code)) {
                  prodMap.set(code, {
                    id: `item_${ord}_${code}`,
                    productCode: code,
                    description: desc,
                    requestedQty: qty,
                    pickedQty: 0,
                    dispatchedQty: 0,
                    bodegaCode: t.bodega || '600',
                    location: 'ST',
                    isFinished: false,
                    isDispatched: false,
                  });
                }
              });
              cardItems = Array.from(prodMap.values());
            } else {
              cardItems = [{
                id: `item_${ord}_0`,
                productCode: `${cardType}-ITEM-01`,
                description: `MATERIAL GENERAL ${cardType} #${ord}`,
                requestedQty: 10,
                pickedQty: 0,
                dispatchedQty: 0,
                bodegaCode: '600',
                location: 'ST',
                isFinished: false,
                isDispatched: false,
              }];
            }
          }
        }

        const labels = [cardType === 'TR' ? 'traslado' : 'ov_tag'];
        if (hasNonSt) labels.push('multi');

        const pkInfo = resolvePkInfo(ord);

        newCards.push({
          id: `card_${Date.now()}_${ord}`,
          type: cardType,
          orderNumber: ord,
          po: pkInfo.po,
          fechaImp: pkInfo.fechaImp,
          horaImp: pkInfo.horaImp,
          client: clientName,
          assignedPickerIds: pickers,
          labels,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isMulti: hasNonSt,
          status: 'picking',
          items: cardItems,
        });
      });

      // Merge newCards with existing sharedCards (replacing duplicates if already on board)
      const newOrdersSet = new Set(newCards.map(c => c.orderNumber));
      const retainedCards = sharedCards.filter(c => !newOrdersSet.has(c.orderNumber));
      sharedCards = [...retainedCards, ...newCards];

      reconcileCardsWithOneDrive();
      saveBoardToDisk();

      return res.json({
        success: true,
        importedCount: newCards.length,
        skippedCount: skippedOrders.length,
        skippedOrders,
        totalBoardCards: sharedCards.length,
        cards: sharedCards,
      });
    } catch (err: any) {
      console.error('Error in /api/board/bulk-import:', err);
      return res.status(500).json({ success: false, message: err.message || 'Error al importar tarjetas.' });
    }
  });

  // Batch transactions endpoint for active cards on the board
  app.post('/api/onedrive/batch-transactions', (req, res) => {
    const orderNumbers: string[] = req.body?.orderNumbers || [];
    if (!cachedSyncResult || !cachedSyncResult.transactions) {
      return res.json({ success: true, transactions: [] });
    }
    const cleanSet = new Set(
      orderNumbers.map(o => String(o).replace(/\D/g, '').slice(-9).padStart(9, '0'))
    );
    const matched = cachedSyncResult.transactions.filter((t: any) => {
      const cleanT = String(t.orderNumber || '').replace(/\D/g, '').slice(-9).padStart(9, '0');
      const cleanSap = String(t.sapRef || '').replace(/\D/g, '').slice(-9).padStart(9, '0');
      return cleanSet.has(cleanT) || cleanSet.has(cleanSap) || orderNumbers.includes(t.orderNumber);
    });
    return res.json({ success: true, transactions: matched });
  });

  // API endpoint implementing resolveOneDriveFolderContext (lightweight summary, no 30MB payload)
  app.post('/api/onedrive/sync-folder', async (req, res) => {
    try {
      const folderUrl = req.body?.folderUrl;
      const result = await performFolderSync(folderUrl);
      return res.json({
        success: true,
        message: result.message,
        filesFound: result.filesFound,
        liCount: result.liCount,
        trCount: (result.trCount || 0) + (result.prodCount || 0),
        timestamp: result.timestamp,
      });
    } catch (error: any) {
      console.error('Error in resolveOneDriveFolderContext:', error.message);
      return res.status(500).json({
        success: false,
        error: error.message || 'Error al resolver la carpeta de OneDrive',
      });
    }
  });

  // Scheduled background sync loop (runs every 3 minutes)
  setInterval(() => {
    if (isWithinSyncSchedule()) {
      console.log('[Auto-Sync Schedule] Operating window active. Triggering background OneDrive sync...');
      performFolderSync().catch(err => {
        console.warn('[Auto-Sync Schedule] OneDrive sync deferred:', err.message);
      });
    } else {
      console.log('[Auto-Sync Schedule] Outside operational hours (Mon-Fri 08:05-17:30 / Sat 08:05-12:30). Paused.');
    }
  }, 180000); // 3 minutes

  // Initial background sync: delayed 12 seconds so server boots instantly and serves all HTTP requests
  setTimeout(() => {
    performFolderSync().catch(err => {
      console.warn('Background initial OneDrive sync deferred:', err.message);
    });
  }, 12000);

  const isProd = process.env.NODE_ENV === 'production';
  const distPath = path.resolve('dist');
  const indexHtmlPath = path.join(distPath, 'index.html');

  if (isProd) {
    // Production mode: serve pre-built dist assets
    if (!fs.existsSync(indexHtmlPath)) {
      console.log('[Server] dist/index.html no encontrada en producción. Compilando aplicación con Vite build...');
      try {
        await viteBuild();
        console.log('[Server] Compilación de producción completada con éxito.');
      } catch (buildErr: any) {
        console.error('[Server] Falló compilación de Vite:', buildErr.message);
      }
    }

    app.use(express.static(distPath, { index: false }));
    app.get('*', (_req, res, next) => {
      if (fs.existsSync(indexHtmlPath)) {
        res.sendFile(indexHtmlPath, (err) => {
          if (err) next(err);
        });
      } else {
        // Fallback if dist was deleted or not yet built
        res.sendFile(path.resolve('index.html'), (err) => {
          if (err) next(err);
        });
      }
    });
  } else {
    // Development mode: always mount Vite dev middlewares
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    // Transform and return index.html for any unhandled GET route
    app.get('*', async (req, res, next) => {
      try {
        const url = req.originalUrl;
        let template = fs.readFileSync(path.resolve('index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        if (vite.ssrFixStacktrace) {
          vite.ssrFixStacktrace(e);
        }
        next(e);
      }
    });
  }

  app.listen(Number(port), '0.0.0.0', () => {
    console.log(`Logistics Server running on http://0.0.0.0:${port}`);
  });
}

startServer();
