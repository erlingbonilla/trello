export interface ScheduleStatus {
  isActive: boolean;
  statusText: string;
  scheduleBadge: string;
  nextWindowText: string;
}

/**
 * Checks if current time is within OneDrive automatic sync schedule:
 * - Monday to Friday (1 to 5): 08:05 to 17:30
 * - Saturday (6): 08:05 to 12:30
 * - Sunday (0): Inactive
 */
export function isWithinSyncSchedule(now: Date = new Date()): boolean {
  const day = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const timeInMinutes = hours * 60 + minutes;

  // Monday (1) to Friday (5)
  if (day >= 1 && day <= 5) {
    const startInMinutes = 8 * 60 + 5;   // 08:05 = 485 mins
    const endInMinutes = 17 * 60 + 30;   // 17:30 = 1050 mins
    return timeInMinutes >= startInMinutes && timeInMinutes <= endInMinutes;
  }

  // Saturday (6)
  if (day === 6) {
    const startInMinutes = 8 * 60 + 5;   // 08:05 = 485 mins
    const endInMinutes = 12 * 60 + 30;   // 12:30 = 750 mins
    return timeInMinutes >= startInMinutes && timeInMinutes <= endInMinutes;
  }

  // Sunday (0)
  return false;
}

export function getSyncScheduleInfo(now: Date = new Date()): ScheduleStatus {
  const active = isWithinSyncSchedule(now);
  const day = now.getDay();

  if (active) {
    const endText = day === 6 ? '12:30 PM' : '5:30 PM';
    const dayLabel = day === 6 ? 'Sábado' : 'Lun-Vie';
    return {
      isActive: true,
      statusText: `Sincronización Automática Activa (${dayLabel})`,
      scheduleBadge: `Lun-Vie 8:05-17:30 | Sáb 8:05-12:30`,
      nextWindowText: `Auto-sincronizando en vivo hasta las ${endText}`,
    };
  }

  if (day === 0) {
    return {
      isActive: false,
      statusText: 'Auto-Sync Pausado (Domingo sin jornada laboral)',
      scheduleBadge: `Lun-Vie 8:05-17:30 | Sáb 8:05-12:30`,
      nextWindowText: 'Próxima sincronización automática: Lunes 8:05 AM',
    };
  }

  return {
    isActive: false,
    statusText: 'Auto-Sync Pausado (Fuera de Horario Laboral)',
    scheduleBadge: `Lun-Vie 8:05-17:30 | Sáb 8:05-12:30`,
    nextWindowText: 'Horario: Lun-Vie 8:05-17:30 / Sáb 8:05-12:30',
  };
}
