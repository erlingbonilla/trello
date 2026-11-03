import { BodegaCatalogEntry } from '../types';

export const INITIAL_BODEGAS: BodegaCatalogEntry[] = [
  { code: '01', name: 'AA STOCK SUC FB', location: 'FB' },
  { code: '01-TR', name: 'Transito a Bodega FB', location: 'FB' },
  { code: '02', name: 'Reservas Autorizadas FB', location: 'FB' },
  { code: '03', name: 'MERCADEO', location: 'FB' },
  { code: '04', name: 'CUARENTENA FB', location: 'FB' },
  { code: '05', name: 'BODEGA TABLEROS SQD', location: 'FB' },
  { code: '06', name: 'BODEGA SANTO TOMAS', location: 'FB' },
  { code: '07', name: 'NO USAR FB', location: 'FB' },
  { code: '100', name: 'PRODUCTO ESPECIAL FB S2022', location: 'FB' },
  { code: '101', name: 'PRODUCTO ESPECIAL FB F2022', location: 'FB' },
  { code: '11', name: 'Almacen especial NASA', location: 'FB' },
  { code: '200', name: 'Altamira central', location: 'CSH' },
  { code: '201', name: 'Bodega liquidacion AT', location: 'CSH' },
  { code: '202', name: 'Bodega promocion AT', location: 'CSH' },
  { code: '203', name: 'SV ALTAMIRA', location: 'CSH' },
  { code: '207', name: 'Excesos Altamira', location: 'CSH' },
  { code: '210', name: 'CSI Taller AE', location: 'AV' },
  { code: '211', name: 'BODEGA CONSIGNA CSH CAESS', location: 'CSH' },
  { code: '212', name: 'BODEGA CONSIGNA CSH EEO', location: 'CSH' },
  { code: '213', name: 'BODEGA CONSIGNA CSH DEUSEN', location: 'CSH' },
  { code: '214', name: 'BODEGA CONSIGNA CSH CLESA', location: 'CSH' },
  { code: '300', name: 'AA STOCK SUC AE', location: 'AV' },
  { code: '300-TR', name: 'Transito a Bodega AE', location: 'AV' },
  { code: '301', name: 'ABodega de liquidación AE', location: 'AV' },
  { code: '302', name: 'CSI Servicios AE', location: 'AV' },
  { code: '303', name: 'Sala de Venta Av España', location: 'AV' },
  { code: '304', name: 'LIQ CONSIGNA CSH', location: 'AV' },
  { code: '305', name: 'LIQ CONSIGNA SEE', location: 'AV' },
  { code: '307', name: 'Excesos Av España', location: 'AV' },
  { code: '310', name: 'RESERVAS AES AE', location: 'AV' },
  { code: '311', name: 'RESERVAS DELSUR AE', location: 'AV' },
  { code: '312', name: 'BODEGA CONSIGNA SEE DEUSEN', location: 'AV' },
  { code: '313', name: 'BODEGA CONSIGNA SEE EEO', location: 'AV' },
  { code: '314', name: 'RESERVA AUTORIZADA AE', location: 'AV' },
  { code: '315', name: 'RESERVA AES AV ESPAÑA', location: 'AV' },
  { code: '316', name: 'Producto Especial AV F2022', location: 'AV' },
  { code: '317', name: 'Producto Especial AV S2022', location: 'AV' },
  { code: '400', name: 'AA STOCK SUC SM', location: 'SM' },
  { code: '400-TR', name: 'Transito a Bodega SM', location: 'SM' },
  { code: '401', name: 'ABodega de liquidación SM', location: 'SM' },
  { code: '402', name: 'Bodega promociones SM', location: 'SM' },
  { code: '403', name: 'Sala de Ventas San Miguel', location: 'SM' },
  { code: '407', name: 'Exceso San Miguel', location: 'SM' },
  { code: '408', name: 'Producto Especial SM F2022', location: 'SM' },
  { code: '409', name: 'Producto Especial SM S2022', location: 'SM' },
  { code: '600', name: 'AA STOCK SUC ST', location: 'ST' },
  { code: '600-TR', name: 'Transito a Bodega ST', location: 'ST' },
  { code: '601', name: 'ABodega de liquidación ST', location: 'ST' },
  { code: '602', name: 'BODEGA RESERVA HOSPITAL ROSALES', location: 'ST' },
  { code: '603', name: 'Muestras', location: 'ST' },
  { code: '604', name: 'EATON RESERVAS', location: 'ST' },
  { code: '605', name: 'CUELLAR WM', location: 'ST' },
  { code: '606', name: 'BODEGAS Q10', location: 'ST' },
  { code: '607', name: 'CONSIGNACION LIQ AES', location: 'ST' },
  { code: '608', name: 'RESERVA AES 2025-2026', location: 'ST' },
  { code: '609', name: 'GARANTIAS', location: 'ST' },
  { code: '610', name: 'RESERVA AES 2023-2024', location: 'ST' },
  { code: '611', name: 'CONSIGNACION CAESS 2017-2018', location: 'ST' },
  { code: '612', name: 'CONSIGNACION CLESA 2017-2018', location: 'ST' },
  { code: '613', name: 'CONSIGNACION EEO 2017-2018', location: 'ST' },
  { code: '614', name: 'CONSIGNACION DEUSEM 2017-2018', location: 'ST' },
  { code: '615', name: 'RESERVA DELSUR 2021-2022', location: 'ST' },
  { code: '616', name: 'RESERVAS AUTORIZADAS ST', location: 'ST' },
  { code: '617', name: 'CONSIGNACION CAESS 2019-2020', location: 'ST' },
  { code: '618', name: 'CONSIGNACION DEUSEM 2019-2020', location: 'ST' },
  { code: '619', name: 'CONSIGNACION EEO 2019-2020', location: 'ST' },
  { code: '620', name: 'CONSIGNACION CLESA 2019-2020', location: 'ST' },
  { code: '621', name: 'Producto Especial ST S2022', location: 'ST' },
  { code: '622', name: 'Producto Especial ST F2022', location: 'ST' },
  { code: '623', name: 'RESERVA AES 2021-2022', location: 'ST' },
  { code: '624', name: 'CONSIGNA AES 2021-2022', location: 'ST' },
  { code: '625', name: 'CONSIGNACION CAESS 2021-2022', location: 'ST' },
  { code: '626', name: 'CONSIGNACION DEUSEM 2021-2022', location: 'ST' },
  { code: '627', name: 'CONSIGNACION EEO 2021-2022', location: 'ST' },
  { code: '628', name: 'CONSIGNACION CLESA 2021-2022', location: 'ST' },
  { code: '95', name: 'Bodega promociones mayoreo', location: 'ST' },
  { code: '98', name: 'ABodega de liquidación FB', location: 'FB' },
  { code: '99', name: 'IMPORTACIONES', location: 'ST' },
  { code: 'Aeroman', name: 'Aeroman', location: 'ST' },
  { code: 'AV', name: 'AVERIAS FLOR BLANCA', location: 'ST' },
  { code: 'AVST', name: 'avería santo tomas', location: 'ST' },
  { code: 'CC', name: 'CORTES DE CONDUCTOR', location: 'ST' },
  { code: 'CUING', name: 'CUELLAR ST', location: 'ST' },
  { code: 'EBS-FALT', name: 'Productos Especiales FB F2015', location: 'ST' },
  { code: 'EBS-SOBR', name: 'Producto Especial FB S2015', location: 'ST' },
  { code: 'EXPO', name: 'EXPO', location: 'ST' },
  { code: 'F-2016', name: 'Producto Especial FB F2016', location: 'ST' },
  { code: 'F2017', name: 'Producto Especial F2017', location: 'ST' },
  { code: 'FV', name: 'FUERA DE VENTA', location: 'ST' },
  { code: 'GT01', name: 'Bodega Reserva GT', location: 'ST' },
  { code: 'HN01', name: 'Bodega Reserva HN', location: 'ST' },
  { code: 'IBPLS', name: 'Iberplastic', location: 'ST' },
  { code: 'IC', name: 'Intercompany', location: 'ST' },
  { code: 'ISSS', name: 'Proyecto ISSS', location: 'ST' },
  { code: 'LOT', name: 'LOTE', location: 'ST' },
  { code: 'LOT ST', name: 'LOTES ST', location: 'ST' },
  { code: 'NUVA', name: 'NUVA', location: 'ST' },
  { code: 'PE', name: 'PEDIDOS ESPECIALES', location: 'ST' },
  { code: 'PELSAPAN', name: 'INVENTARIO DE PANAMA', location: 'ST' },
  { code: 'PRODEL', name: 'PRODEL CACAOPERA', location: 'ST' },
  { code: 'PS', name: 'PRODUCTO SANTERIORES', location: 'ST' },
  { code: 'RAP', name: 'RECLAMO A PROVEEDOR', location: 'ST' },
  { code: 'S-2016', name: 'BODEGA S2016', location: 'ST' },
  { code: 'SACOSSIT', name: 'SACOS SINTETICOS', location: 'ST' },
  { code: 'UMATLACA', name: 'Unidad Medica Atlacat', location: 'ST' }
];

export function getBodegaLocation(bodegaCode: string, catalog: BodegaCatalogEntry[] = INITIAL_BODEGAS): string {
  if (!bodegaCode) return 'ST';
  const cleanCode = bodegaCode.trim().toUpperCase();
  // Match by code
  const foundByCode = catalog.find(b => b.code.trim().toUpperCase() === cleanCode);
  if (foundByCode) return foundByCode.location.toUpperCase();
  
  // Match by name
  const foundByName = catalog.find(b => b.name.trim().toUpperCase() === cleanCode || cleanCode.includes(b.name.trim().toUpperCase()));
  if (foundByName) return foundByName.location.toUpperCase();

  // If numeric starting with 6 (e.g. 600, 608) or contains ST, it's Santo Tomás (ST)
  if (cleanCode.startsWith('6') || cleanCode.includes(' ST') || cleanCode.includes('SANTO TOMAS') || cleanCode.includes('STOCK SUC ST')) {
    return 'ST';
  }
  // If starts with 01, 02, etc. (FB)
  if (cleanCode.startsWith('0') || cleanCode.includes(' FB') || cleanCode.includes('FLOR BLANCA')) return 'FB';
  // If starts with 2 (CSH)
  if (cleanCode.startsWith('2') || cleanCode.includes('CSH') || cleanCode.includes('ALTAMIRA')) return 'CSH';
  // If starts with 3 (AV)
  if (cleanCode.startsWith('3') || cleanCode.includes(' AV') || cleanCode.includes('ESPAÑA')) return 'AV';
  // If starts with 4 (SM)
  if (cleanCode.startsWith('4') || cleanCode.includes(' SM') || cleanCode.includes('SAN MIGUEL')) return 'SM';

  return 'ST';
}

export function isSTLocation(bodegaCode: string, catalog: BodegaCatalogEntry[] = INITIAL_BODEGAS): boolean {
  return getBodegaLocation(bodegaCode, catalog) === 'ST';
}
