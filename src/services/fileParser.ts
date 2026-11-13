import * as XLSX from 'xlsx';
import { BodegaCatalogEntry, LiOrderRecord, TransactionRecord, PkOrderRecord } from '../types';
import { normalizeProductCode, normalizeOrderNumber } from '../utils/productUtils';

export function parseCsvText(text: string, delimiter?: string): string[][] {
  const clean = text.replace(/^\uFEFF/, '').trim();
  const lines = clean.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) return [];

  // Auto-detect delimiter if not provided
  if (!delimiter) {
    const firstLine = lines[0];
    const semiCount = (firstLine.match(/;/g) || []).length;
    const commaCount = (firstLine.match(/,/g) || []).length;
    const tabCount = (firstLine.match(/\t/g) || []).length;
    if (semiCount > commaCount && semiCount > tabCount) delimiter = ';';
    else if (tabCount > commaCount) delimiter = '\t';
    else delimiter = ',';
  }

  return lines.map(line => {
    // Quick split taking care of simple quotes
    const values: string[] = [];
    let current = '';
    let insideQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === delimiter && !insideQuotes) {
        values.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim().replace(/^"|"$/g, ''));
    return values;
  });
}

export function parseLiCsv(csvContent: string): LiOrderRecord[] {
  const rows = parseCsvText(csvContent);
  if (rows.length < 2) return [];

  const headers = rows[0].map(h => h.trim().toLowerCase());
  
  // Find column indices
  const orderIdx = headers.findIndex(h => h.includes('orden') || h.includes('order') || h === 'orden #');
  const clientIdx = headers.findIndex(h => h.includes('cliente') || h.includes('customer') || h.includes('nombre cliente'));
  const poIdx = headers.findIndex(h => h === 'po' || h.includes('po') || h.includes('corr'));
  const prodIdx = headers.findIndex(h => (h.includes('producto') || h.includes('item') || h.includes('articulo') || h.includes('material')) && !h.includes('desc'));
  const descIdx = headers.findIndex(h => h.includes('descrip') || h.includes('nombre producto') || h.includes('texto'));
  const qtyIdx = headers.findIndex(h => h.includes('cant') || h.includes('pedida') || h.includes('cantidad') || h.includes('qty'));
  const bodegaIdx = headers.findIndex(h => h.includes('bodega') || h.includes('almacen') || h.includes('almacén'));

  const records: LiOrderRecord[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 3) continue;

    // Support both header matching and positional layout seen in user screenshot (Col 0: Orden, Col 2: Cliente, Col 3: PO, Col 4: Producto, Col 5: Descripcion, Col 6: Bodega, Col 7: Cantidad)
    const rawOrder = orderIdx >= 0 ? row[orderIdx] : row[0];
    const rawClient = clientIdx >= 0 ? row[clientIdx] : row[2] || row[1] || '';
    const rawPo = poIdx >= 0 ? row[poIdx] : row[3] || '';
    const rawProd = prodIdx >= 0 ? row[prodIdx] : row[4] || row[2] || '';
    const rawDesc = descIdx >= 0 ? row[descIdx] : row[5] || row[3] || '';
    const rawBodega = bodegaIdx >= 0 ? row[bodegaIdx] : row[6] || row[5] || '600';
    const rawQty = qtyIdx >= 0 ? row[qtyIdx] : row[7] || row[4] || '1';

    const orderNumber = normalizeOrderNumber(rawOrder);
    if (!orderNumber || orderNumber === '000000000') continue;

    const cleanQty = parseFloat(rawQty.replace(',', '.')) || 1;
    const productCode = normalizeProductCode(rawProd);
    const cleanPo = String(rawPo).trim().replace(/\D/g, '').replace(/^0+/, '');

    records.push({
      orderNumber,
      po: cleanPo || undefined,
      client: rawClient.trim(),
      productCode,
      description: rawDesc.trim(),
      requestedQty: cleanQty,
      bodegaCode: rawBodega.trim(),
    });
  }

  return records;
}

export function parseBodegasCsv(csvContent: string): BodegaCatalogEntry[] {
  const rows = parseCsvText(csvContent);
  if (rows.length < 2) return [];

  const entries: BodegaCatalogEntry[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length >= 3) {
      entries.push({
        code: row[0].trim(),
        name: row[1].trim(),
        location: row[2].trim().toUpperCase(),
      });
    }
  }
  return entries;
}

export function parseExcelOrCsvTransactions(
  data: ArrayBuffer | string,
  fileName: string,
  fileType: '_tr' | 'productividad'
): TransactionRecord[] {
  let jsonRows: any[] = [];

  if (typeof data === 'string') {
    // CSV
    const rows = parseCsvText(data);
    if (rows.length < 2) return [];
    const headers = rows[0];
    for (let i = 1; i < rows.length; i++) {
      const obj: any = {};
      headers.forEach((h, idx) => {
        obj[h.trim()] = rows[i][idx] || '';
      });
      jsonRows.push(obj);
    }
  } else {
    // Excel binary
    const workbook = XLSX.read(data, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    jsonRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  }

  const transactions: TransactionRecord[] = [];

  jsonRows.forEach((row, index) => {
    // Standardize column names based on Comparativo.csv
    // _tr: 'Código de Producto', 'Ubicación Origen', 'Cant. Delta'
    // productividad: 'Producto #', 'Fuente ubicación', 'Cant. delta'
    const bodega = row['Bodega'] || row['almacen'] || '';
    const origenUbicacion = row['Ubicación Origen'] || row['Fuente ubicación'] || row['Fuente ubicacion'] || '';
    const ubicacion = row['Ubicación'] || row['Ubicacion'] || '';
    const palletName = row['Nombre de palet'] || row['Pallet'] || '';
    const productCode = row['Código de Producto'] || row['Codigo de Producto'] || row['Producto #'] || row['Producto'] || '';
    const transactionType = (row['Tipo de transacción'] || row['Tipo de transaccion'] || row['Tipo'] || '').toString().trim().toUpperCase();
    const dateTime = row['Fecha / Hora'] || row['Fecha/Hora'] || row['Fecha'] || new Date().toISOString();
    const employeeName = row['Nombre del empleado'] || row['Empleado'] || row['Usuario'] || 'Operador';
    const lisaRef = row['Referencia LISA'] || '';
    const sapRef = (row['Referencia SAP'] || row['Ref SAP'] || '').toString().trim();
    const origin = row['Origen'] || '';
    const lotNumber = row['Lote #'] || row['No. de lote'] || '';
    const serialNumber = row['# Serie'] || row['Numero de serie'] || '';
    const initialQty = parseFloat(String(row['Cantidad inicial'] || row['Cant. inicial'] || '0').replace(',', '.')) || 0;
    const finalQty = parseFloat(String(row['Cant. Final'] || row['Cant. final'] || '0').replace(',', '.')) || 0;
    const rawDelta = row['Cant. Delta'] || row['Cant. delta'] || row['Delta'] || '0';
    const cantDelta = parseFloat(String(rawDelta).replace(',', '.')) || 0;
    const uom = row['UOM'] || row['Unidad'] || 'UND';

    // Extract 9 digits from sapRef
    const digitsMatch = sapRef.match(/\d{9}$/);
    const orderNumber = digitsMatch ? digitsMatch[0] : normalizeOrderNumber(sapRef);
    const cleanProductCode = normalizeProductCode(productCode);

    if (sapRef || cleanProductCode) {
      transactions.push({
        id: `tx_${fileType}_${Date.now()}_${index}`,
        source: fileType,
        bodega: String(bodega).trim(),
        origenUbicacion: String(origenUbicacion).trim(),
        ubicacion: String(ubicacion).trim(),
        palletName: String(palletName).trim(),
        productCode: cleanProductCode,
        transactionType,
        dateTime: String(dateTime).trim(),
        employeeName: String(employeeName).trim(),
        lisaRef: String(lisaRef).trim(),
        sapRef,
        orderNumber,
        origin: String(origin).trim(),
        lotNumber: String(lotNumber).trim(),
        serialNumber: String(serialNumber).trim(),
        initialQty,
        finalQty,
        cantDelta,
        uom: String(uom).trim(),
      });
    }
  });

  return transactions;
}

function normalizeFechaImp(val: any): string | undefined {
  if (val === undefined || val === null || val === '') return undefined;
  if (typeof val === 'number' && !isNaN(val)) {
    const parsed = XLSX.SSF.parse_date_code(val);
    if (parsed && parsed.y && parsed.m && parsed.d) {
      return `${String(parsed.d).padStart(2, '0')}/${String(parsed.m).padStart(2, '0')}/${parsed.y}`;
    }
  }
  const s = String(val).trim();
  if (!s || s === '1/1/1900' || s === '01/01/1900') return undefined;

  // Match d/m/yyyy or dd/mm/yyyy or dd-mm-yyyy
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (dmy) {
    const day = dmy[1].padStart(2, '0');
    const month = dmy[2].padStart(2, '0');
    const year = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3];
    return `${day}/${month}/${year}`;
  }

  // Match yyyy-mm-dd
  const ymd = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (ymd) {
    return `${ymd[3].padStart(2, '0')}/${ymd[2].padStart(2, '0')}/${ymd[1]}`;
  }

  return s;
}

function normalizeHoraImp(val: any): string | undefined {
  if (val === undefined || val === null || val === '') return undefined;
  if (typeof val === 'number' && !isNaN(val)) {
    const totalMinutes = Math.round(val * 24 * 60) % (24 * 60);
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }
  const s = String(val).trim();
  if (!s || s === '00:00:00') return undefined;
  const hm = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (hm) {
    return `${hm[1].padStart(2, '0')}:${hm[2]}`;
  }
  return s;
}

export function parsePkRecords(data: string | ArrayBuffer): PkOrderRecord[] {
  const cleanCorr = (val: any): string => {
    return String(val || '').trim().replace(/\D/g, '').replace(/^0+/, '');
  };

  const recordMap = new Map<string, PkOrderRecord>();

  if (typeof data === 'string') {
    const rows = parseCsvText(data);
    if (rows.length < 2) return [];
    const headers = rows[0].map(h => h.trim().toLowerCase());
    let corrIdx = headers.findIndex(h => h.includes('corr') || h === 'po' || h.includes('orden') || h.includes('order'));
    if (corrIdx === -1) corrIdx = 0;
    const fechaImpIdx = headers.findIndex(h => h.includes('fecha imp') || h === 'fecha_imp' || h === 'fechaimp');
    const horaImpIdx = headers.findIndex(h => h.includes('hora imp') || h === 'hora_imp' || h === 'horaimp');

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;
      const rawVal = row[corrIdx] || row[0] || '';
      const clean = cleanCorr(rawVal);
      if (clean) {
        const fechaImp = fechaImpIdx >= 0 ? normalizeFechaImp(row[fechaImpIdx]) : undefined;
        const horaImp = horaImpIdx >= 0 ? normalizeHoraImp(row[horaImpIdx]) : undefined;
        const existing = recordMap.get(clean);
        if (!existing || (!existing.fechaImp && fechaImp)) {
          recordMap.set(clean, { corr: clean, fechaImp, horaImp });
        }
      }
    }
    return Array.from(recordMap.values());
  } else {
    const workbook = XLSX.read(data, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    jsonRows.forEach(row => {
      const rawVal = row['CORR.'] || row['CORR'] || row['Corr.'] || row['Corr'] || row['PO'] || row['Po'] || row['Orden'] || row['Order'] || '';
      const clean = cleanCorr(rawVal);
      if (clean) {
        // Flexible case-insensitive lookup for FECHA IMP and HORA IMP
        const rowKeys = Object.keys(row);
        const fechaKey = rowKeys.find(k => k.trim().toUpperCase() === 'FECHA IMP' || k.trim().toUpperCase() === 'FECHA_IMP');
        const horaKey = rowKeys.find(k => k.trim().toUpperCase() === 'HORA IMP' || k.trim().toUpperCase() === 'HORA_IMP');
        const fechaImp = fechaKey ? normalizeFechaImp(row[fechaKey]) : undefined;
        const horaImp = horaKey ? normalizeHoraImp(row[horaKey]) : undefined;
        const existing = recordMap.get(clean);
        if (!existing || (!existing.fechaImp && fechaImp)) {
          recordMap.set(clean, { corr: clean, fechaImp, horaImp });
        }
      }
    });
    return Array.from(recordMap.values());
  }
}

export function parsePkFile(data: string | ArrayBuffer): string[] {
  return parsePkRecords(data).map(r => r.corr);
}


