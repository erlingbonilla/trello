import { CardLabel } from '../types';

export const INITIAL_CARD_LABELS: CardLabel[] = [
  {
    id: 'ov_tag',
    name: 'OV',
    bg: '#00D084',
    text: '#FFFFFF',
  },
  {
    id: 'reserva_aes',
    name: 'RESERVA AES 2025-2026',
    bg: '#F6E27F',
    text: '#451A03',
  },
  {
    id: 'reservas_autorizadas',
    name: 'RESERVAS AUTORIZADAS',
    bg: '#F5DE77',
    text: '#451A03',
  },
  {
    id: 'segundo_pasaran',
    name: '2° PASARAN',
    bg: '#EBBE23',
    text: '#451A03',
  },
  {
    id: 'pendiente',
    name: 'Pendiente',
    bg: '#FAD6A5',
    text: '#5B21B6',
  },
  {
    id: 'ruta_departamental',
    name: '3° RUTA DEPARTAMENTAL',
    bg: '#F95C54',
    text: '#FFFFFF',
  },
  {
    id: 'ruta_ss',
    name: '3° RUTA SS',
    bg: '#F95C54',
    text: '#FFFFFF',
  },
  {
    id: 'traslado',
    name: 'TRASLADO',
    bg: '#58626A',
    text: '#FFFFFF',
  },
  {
    id: 'multi',
    name: 'multi',
    bg: '#0284C7',
    text: '#FFFFFF',
  },
];

export function getStoredLabelsList(): CardLabel[] {
  try {
    const raw = localStorage.getItem('app_trello_labels_v3');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // Fallback to initial
  }
  return INITIAL_CARD_LABELS;
}

export const CARD_LABELS = INITIAL_CARD_LABELS;

export function getLabelById(id: string): CardLabel | undefined {
  const currentList = getStoredLabelsList();
  return currentList.find((l) => l.id === id || l.name.toLowerCase() === id.toLowerCase());
}

