import express from 'express';
import { createServer as createViteServer } from 'vite';
import { resolveOneDriveFolderContext } from './src/services/onedriveFolderSync';
import { isWithinSyncSchedule, getSyncScheduleInfo } from './src/utils/syncSchedule';

async function startServer() {
  const app = express();
  const port = process.env.PORT || 3000;

  app.use(express.json({ limit: '50mb' }));

  // In-memory cache for OneDrive synced data
  let cachedSyncResult: any = null;
  let isSyncing = false;

  const performFolderSync = async (folderUrl?: string) => {
    if (isSyncing) return cachedSyncResult;
    isSyncing = true;
    try {
      const url =
        folderUrl ||
        'https://1drv.ms/f/c/a97927f4218d75aa/IgCbdjPW2zZxQaUGss9bS2uwAcCLWIYQb6IgbAJmCI0lvZw?e=LmSKmD';
      console.log('Iniciando resolveOneDriveFolderContext:', url);
      const result = await resolveOneDriveFolderContext(url);
      cachedSyncResult = result;
      console.log(`Sincronización completada: ${result.liCount} órdenes _li, ${result.trCount + result.prodCount} transacciones.`);
      return result;
    } finally {
      isSyncing = false;
    }
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

  // Fast order lookup endpoint from OneDrive cache with its matching SAP transactions
  app.get('/api/onedrive/order/:orderNumber', (req, res) => {
    const targetOrder = String(req.params.orderNumber).trim();
    if (!cachedSyncResult || !cachedSyncResult.liRecords) {
      return res.status(404).json({ success: false, message: 'OneDrive aún no sincronizado en servidor.' });
    }

    const cleanTarget = targetOrder.replace(/\D/g, '').slice(-9).padStart(9, '0');
    const matches = cachedSyncResult.liRecords.filter((r: any) => {
      const cleanR = String(r.orderNumber || '').replace(/\D/g, '').slice(-9).padStart(9, '0');
      return cleanR === cleanTarget || r.orderNumber === targetOrder;
    });

    if (matches.length === 0) {
      return res.status(404).json({ success: false, message: `Orden #${targetOrder} no encontrada en _li.` });
    }

    const txMatches = (cachedSyncResult.transactions || []).filter((t: any) => {
      const cleanT = String(t.orderNumber || '').replace(/\D/g, '').slice(-9).padStart(9, '0');
      return cleanT === cleanTarget || t.orderNumber === targetOrder;
    });

    return res.json({
      success: true,
      orderNumber: targetOrder,
      client: matches[0].client,
      items: matches,
      transactions: txMatches,
    });
  });

  // Shared multi-device board state in server memory (instant sync between phones & PCs)
  let sharedCards: any[] = [];
  let sharedAudits: any[] = [];

  app.get('/api/board/state', (_req, res) => {
    return res.json({ success: true, cards: sharedCards, audits: sharedAudits });
  });

  app.post('/api/board/state', (req, res) => {
    if (Array.isArray(req.body?.cards)) {
      sharedCards = req.body.cards;
    }
    if (Array.isArray(req.body?.audits)) {
      sharedAudits = req.body.audits;
    }
    return res.json({ success: true, cards: sharedCards, audits: sharedAudits });
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
      return cleanSet.has(cleanT) || orderNumbers.includes(t.orderNumber);
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

  // Initial background sync
  setTimeout(() => {
    performFolderSync().catch(err => {
      console.warn('Background initial OneDrive sync deferred:', err.message);
    });
  }, 1000);

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (_req, res) => {
      res.sendFile('dist/index.html', { root: '.' });
    });
  }

  app.listen(port, () => {
    console.log(`Logistics Server & Vite running on port ${port}`);
  });
}

startServer();
