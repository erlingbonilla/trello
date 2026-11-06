import * as XLSX from 'xlsx';
import { parseCsvText } from './fileParser';
import { normalizeOrderNumber, normalizeProductCode } from '../utils/productUtils';
import { LiOrderRecord, TransactionRecord } from '../types';

export interface OneDriveFolderSyncResult {
  success: boolean;
  message: string;
  filesFound: string[];
  liCount: number;
  trCount: number;
  prodCount: number;
  liRecords: LiOrderRecord[];
  transactions: TransactionRecord[];
  timestamp: string;
}

export async function resolveOneDriveFolderContext(
  shareUrl: string = 'https://1drv.ms/f/c/a97927f4218d75aa/IgCbdjPW2zZxQaUGss9bS2uwAcCLWIYQb6IgbAJmCI0lvZw?e=LmSKmD'
): Promise<OneDriveFolderSyncResult> {
  const userAgent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  // 1. Follow initial redirect from 1drv.ms
  const r1 = await fetch(shareUrl, {
    redirect: 'manual',
    headers: { 'User-Agent': userAgent },
  });
  const loc1 = r1.headers.get('location');
  if (!loc1) {
    throw new Error('No se pudo resolver el primer redireccionamiento de 1drv.ms.');
  }

  // 2. Request OneDrive live destination to get session FedAuth cookie and path
  const r2 = await fetch(loc1, {
    redirect: 'manual',
    headers: { 'User-Agent': userAgent },
  });

  const getCookies = (res: Response): string[] => {
    if (typeof (res.headers as any).getSetCookie === 'function') {
      return (res.headers as any).getSetCookie();
    }
    const single = res.headers.get('set-cookie');
    return single ? [single] : [];
  };

  const cookiesList = getCookies(r2);
  const cookieHeader = cookiesList.map(c => c.split(';')[0]).join('; ');
  if (!cookieHeader || !cookieHeader.includes('FedAuth')) {
    throw new Error('No se pudo obtener la cookie de autenticación FedAuth de OneDrive.');
  }

  const finalLoc = r2.headers.get('location') || loc1;
  const urlObj = new URL(finalLoc);
  const spopath = urlObj.searchParams.get('spopath') || '/personal/a97927f4218d75aa/Documents/productividad';
  const cid = urlObj.searchParams.get('cid') || 'A97927F4218D75AA';

  // 3. Query SharePoint REST API to list all files in folder
  const encodedPath = encodeURIComponent(spopath);
  const listFilesApi = `https://onedrive.live.com/personal/${cid.toLowerCase()}/_api/web/GetFolderByServerRelativeUrl('${encodedPath}')/Files?$select=Name,ServerRelativeUrl,Length,TimeLastModified`;

  const listRes = await fetch(listFilesApi, {
    headers: {
      Cookie: cookieHeader,
      Accept: 'application/json;odata=verbose',
      'User-Agent': userAgent,
    },
  });

  if (!listRes.ok) {
    throw new Error(`Error ${listRes.status} al consultar archivos de la carpeta en SharePoint.`);
  }

  const listJson = await listRes.json();
  const fileEntries: { Name: string; ServerRelativeUrl: string }[] =
    listJson?.d?.results || [];

  const filesFound = fileEntries.map(f => f.Name);

  // Identify key files
  // _li file
  const liFile = fileEntries.find(f => f.Name.toLowerCase().includes('_li') && f.Name.endsWith('.csv')) ||
    fileEntries.find(f => f.Name.toLowerCase().includes('_li'));

  // _tr file (take latest if multiple, e.g. 202610_tr.xlsx over 202609_tr.xlsx)
  const trFiles = fileEntries
    .filter(f => f.Name.toLowerCase().includes('_tr') && (f.Name.endsWith('.xlsx') || f.Name.endsWith('.csv')))
    .sort((a, b) => b.Name.localeCompare(a.Name));
  const trFile = trFiles[0];

  // Productividad file
  const prodFile = fileEntries.find(
    f => f.Name.toLowerCase().includes('productividad') && (f.Name.endsWith('.xlsx') || f.Name.endsWith('.csv'))
  );

  let liRecords: LiOrderRecord[] = [];
  const transactions: TransactionRecord[] = [];

  // Helper to download file content via GetFileByServerRelativeUrl
  const downloadFile = async (serverRelUrl: string): Promise<ArrayBuffer> => {
    const encodedFileUrl = encodeURIComponent(serverRelUrl);
    const downloadApi = `https://onedrive.live.com/personal/${cid.toLowerCase()}/_api/web/GetFileByServerRelativeUrl('${encodedFileUrl}')/$value`;
    const res = await fetch(downloadApi, {
      headers: {
        Cookie: cookieHeader,
        'User-Agent': userAgent,
      },
    });
    if (!res.ok) throw new Error(`Error ${res.status} al descargar ${serverRelUrl}`);
    return await res.arrayBuffer();
  };

  // 4. Download and parse _li
  if (liFile) {
    try {
      const buffer = await downloadFile(liFile.ServerRelativeUrl);
      const text = new TextDecoder('utf-8').decode(buffer);
      const rows = parseCsvText(text);

      if (rows.length >= 2) {
        const headers = rows[0].map(h => h.trim().toLowerCase());
        const orderIdx = headers.findIndex(h => h.includes('orden') || h.includes('order'));
        const clientIdx = headers.findIndex(h => h.includes('cliente') || h.includes('customer'));
        const prodIdx = headers.findIndex(h => (h.includes('producto') || h.includes('item')) && !h.includes('desc'));
        const descIdx = headers.findIndex(h => h.includes('descrip') || h.includes('nombre'));
        const pedidaIdx = headers.findIndex(h => h.includes('cant. pedida') || h.includes('cant. ped') || h.includes('pedida'));
        const qtyIdx = pedidaIdx >= 0 ? pedidaIdx : headers.findIndex(h => h.includes('cant'));
        const bodegaIdx = headers.findIndex(h => h.includes('bodega') || h.includes('almacen'));

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (row.length < 3) continue;

          const rawOrder = orderIdx >= 0 ? row[orderIdx] : row[0];
          const rawClient = clientIdx >= 0 ? row[clientIdx] : row[2] || row[1] || '';
          const rawProd = prodIdx >= 0 ? row[prodIdx] : row[4] || row[2] || '';
          const rawDesc = descIdx >= 0 ? row[descIdx] : row[5] || row[3] || '';
          const rawBodega = bodegaIdx >= 0 ? row[bodegaIdx] : row[6] || row[5] || '600';
          const rawQty = qtyIdx >= 0 ? row[qtyIdx] : row[7] || row[4] || '1';

          const orderNumber = normalizeOrderNumber(rawOrder);
          if (!orderNumber || orderNumber === '000000000') continue;

          liRecords.push({
            orderNumber,
            client: rawClient.trim(),
            productCode: normalizeProductCode(rawProd),
            description: rawDesc.trim(),
            requestedQty: parseFloat(rawQty.replace(',', '.')) || 1,
            bodegaCode: rawBodega.trim(),
          });
        }
      }
    } catch (err: any) {
      console.error('Error procesando _li file:', err);
    }
  }

// Helper to ensure sheet['!ref'] covers all populated cell coordinates
function fixSheetRef(sheet: XLSX.WorkSheet) {
  const cellKeys = Object.keys(sheet).filter(k => !k.startsWith('!'));
  let minR = Infinity, maxR = 0, minC = Infinity, maxC = 0;
  for (const key of cellKeys) {
    const match = key.match(/^([A-Z]+)([0-9]+)$/);
    if (!match) continue;
    const colStr = match[1];
    const rowNum = parseInt(match[2], 10) - 1;
    let colNum = 0;
    for (let i = 0; i < colStr.length; i++) {
      colNum = colNum * 26 + (colStr.charCodeAt(i) - 64);
    }
    colNum -= 1;
    if (rowNum < minR) minR = rowNum;
    if (rowNum > maxR) maxR = rowNum;
    if (colNum < minC) minC = colNum;
    if (colNum > maxC) maxC = colNum;
  }
  if (minR !== Infinity) {
    sheet['!ref'] = XLSX.utils.encode_range({
      s: { r: minR, c: minC },
      e: { r: maxR, c: maxC },
    });
  }
}

  // 5. Download and parse _tr (historical transactions)
  if (trFile) {
    try {
      const buffer = await downloadFile(trFile.ServerRelativeUrl);
      const wb = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = wb.SheetNames[0];
      const sheet = wb.Sheets[sheetName];
      fixSheetRef(sheet);
      const jsonRows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      jsonRows.forEach((row, idx) => {
        const sapRef = String(row['Referencia SAP'] || row['Ref SAP'] || '').trim();
        const productCode = normalizeProductCode(
          row['Código de Producto'] || row['Codigo de Producto'] || row['Producto #'] || row['Producto'] || ''
        );
        const rawDelta = row['Cant. Delta'] || row['Cant. delta'] || row['Delta'] || '0';
        const cantDelta = parseFloat(String(rawDelta).replace(',', '.')) || 0;
        const txType = String(row['Tipo de transacción'] || row['Tipo de transaccion'] || '').trim().toUpperCase();

        if (sapRef || productCode) {
          transactions.push({
            id: `tr_${Date.now()}_${idx}`,
            source: '_tr',
            bodega: String(row['Bodega'] || '600').trim(),
            origenUbicacion: String(row['Ubicación Origen'] || row['Ubicacion Origen'] || row['Fuente ubicación'] || '').trim(),
            ubicacion: String(row['Ubicación'] || row['Ubicacion'] || '').trim(),
            palletName: String(row['Nombre de palet'] || '').trim(),
            productCode,
            transactionType: txType,
            dateTime: String(row['Fecha / Hora'] || '').trim(),
            employeeName: String(row['Nombre del empleado'] || 'Operador').trim(),
            lisaRef: String(row['Referencia LISA'] || '').trim(),
            sapRef,
            orderNumber: normalizeOrderNumber(sapRef),
            origin: String(row['Origen'] || '').trim(),
            lotNumber: String(row['Lote #'] || row['No. de lote'] || '').trim(),
            serialNumber: String(row['# Serie'] || row['Numero de serie'] || '').trim(),
            initialQty: parseFloat(String(row['Cantidad inicial'] || row['Cant. inicial'] || '0').replace(',', '.')) || 0,
            finalQty: parseFloat(String(row['Cant. Final'] || row['Cant. final'] || '0').replace(',', '.')) || 0,
            cantDelta,
            uom: String(row['UOM'] || 'UND').trim(),
          });
        }
      });
    } catch (err: any) {
      console.error('Error procesando _tr file:', err);
    }
  }

  // 6. Download and parse Productividad (current day live transactions)
  // Field equivalences from Comparativo.csv:
  // _tr:            Bodega; Ubicación Origen; Ubicación; Nombre de palet; Código de Producto; Tipo de transacción; Fecha / Hora; Nombre del empleado; Referencia LISA; Referencia SAP; Origen; Lote #; # Serie; Cantidad inicial; Cant. Final; Cant. Delta; UOM
  // Productividad:  Bodega; Fuente ubicación; Ubicación; Nombre de palet; Producto #;          Tipo de transacción; Fecha / Hora; Nombre del empleado; Referencia LISA; Referencia SAP; Origen; No. de lote; Numero de serie; Cant. inicial; Cant. final; Cant. delta; UOM
  if (prodFile) {
    try {
      const buffer = await downloadFile(prodFile.ServerRelativeUrl);
      const wb = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = wb.SheetNames[0];
      const sheet = wb.Sheets[sheetName];
      fixSheetRef(sheet);
      const jsonRows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      jsonRows.forEach((row, idx) => {
        const sapRef = String(row['Referencia SAP'] || row['Ref SAP'] || '').trim();
        const productCode = normalizeProductCode(
          row['Producto #'] || row['Código de Producto'] || row['Codigo de Producto'] || row['Producto'] || ''
        );
        const rawDelta = row['Cant. delta'] || row['Cant. Delta'] || row['Delta'] || '0';
        const cantDelta = parseFloat(String(rawDelta).replace(',', '.')) || 0;
        const txType = String(row['Tipo de transacción'] || row['Tipo de transaccion'] || '').trim().toUpperCase();

        if (sapRef || productCode) {
          transactions.push({
            id: `prod_${Date.now()}_${idx}`,
            source: 'productividad',
            bodega: String(row['Bodega'] || '600').trim(),
            origenUbicacion: String(row['Fuente ubicación'] || row['Fuente ubicacion'] || row['Ubicación Origen'] || '').trim(),
            ubicacion: String(row['Ubicación'] || row['Ubicacion'] || '').trim(),
            palletName: String(row['Nombre de palet'] || '').trim(),
            productCode,
            transactionType: txType,
            dateTime: String(row['Fecha / Hora'] || '').trim(),
            employeeName: String(row['Nombre del empleado'] || 'Operador').trim(),
            lisaRef: String(row['Referencia LISA'] || row['Ref LISA'] || '').trim(),
            sapRef,
            orderNumber: normalizeOrderNumber(sapRef),
            origin: String(row['Origen'] || '').trim(),
            lotNumber: String(row['No. de lote'] || row['Lote #'] || '').trim(),
            serialNumber: String(row['Numero de serie'] || row['# Serie'] || '').trim(),
            initialQty: parseFloat(String(row['Cant. inicial'] || row['Cantidad inicial'] || '0').replace(',', '.')) || 0,
            finalQty: parseFloat(String(row['Cant. final'] || row['Cant. Final'] || '0').replace(',', '.')) || 0,
            cantDelta,
            uom: String(row['UOM'] || 'UND').trim(),
          });
        }
      });
    } catch (err: any) {
      console.error('Error procesando Productividad file:', err);
    }
  }

  // Deduplicate transactions if any record appears in both _tr and Productividad
  const seenTx = new Set<string>();
  const deduplicatedTx: TransactionRecord[] = [];
  for (const tx of transactions) {
    const key = `${tx.sapRef}|${tx.lisaRef}|${tx.productCode}|${tx.transactionType}|${tx.cantDelta}|${tx.ubicacion}|${tx.dateTime}`;
    if (!seenTx.has(key)) {
      seenTx.add(key);
      deduplicatedTx.push(tx);
    }
  }

  return {
    success: true,
    message: `Sincronización completa con OneDrive exitosa. Encontrados ${filesFound.length} archivos en la carpeta.`,
    filesFound,
    liCount: liRecords.length,
    trCount: deduplicatedTx.filter(t => t.source === '_tr').length,
    prodCount: deduplicatedTx.filter(t => t.source === 'productividad').length,
    liRecords,
    transactions: deduplicatedTx,
    timestamp: new Date().toISOString(),
  };
}
