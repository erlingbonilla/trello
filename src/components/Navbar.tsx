import React, { useState } from 'react';
import { Role, User } from '../types';
import { getSyncScheduleInfo } from '../utils/syncSchedule';
import {
  Search,
  BarChart3,
  Cloud,
  Plus,
  Users,
  ChevronDown,
  LogOut,
  Tag,
  Clock,
  CheckCircle2,
  Upload,
} from 'lucide-react';

interface NavbarProps {
  currentUser: User;
  allUsers: User[];
  onSwitchUser: (user: User) => void;
  onLogout: () => void;
  onOpenCreateCard: () => void;
  onOpenBulkImport?: () => void;
  onOpenSummary: () => void;
  onOpenSearch: () => void;
  onOpenDataSync: () => void;
  onOpenUserManagement: () => void;
  onOpenManageLabels?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  allUsers,
  onSwitchUser,
  onLogout,
  onOpenCreateCard,
  onOpenBulkImport,
  onOpenSummary,
  onOpenSearch,
  onOpenDataSync,
  onOpenUserManagement,
  onOpenManageLabels,
}) => {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [oneDriveStatus, setOneDriveStatus] = useState<{ isSynced: boolean; liCount: number } | null>(null);

  const scheduleInfo = getSyncScheduleInfo();

  React.useEffect(() => {
    const checkStatus = () => {
      fetch('/api/onedrive/status')
        .then(res => res.json())
        .then(data => {
          if (data && data.isSynced) {
            setOneDriveStatus({ isSynced: true, liCount: data.liCount });
          }
        })
        .catch(() => {});
    };
    checkStatus();
    const interval = setInterval(checkStatus, 20000);
    return () => clearInterval(interval);
  }, []);

  const canCreate = currentUser.role === 'master' || currentUser.role === 'asignador';
  const canManageUsers = currentUser.role === 'master' || currentUser.role === 'asignador';

  const roleLabels: Record<Role, { label: string; badge: string }> = {
    master: { label: 'Master', badge: 'bg-purple-100 text-purple-900 border-purple-200' },
    asignador: { label: 'Asignador', badge: 'bg-emerald-100 text-emerald-900 border-emerald-200' },
    pickeador: { label: 'Pickeador', badge: 'bg-blue-100 text-blue-900 border-blue-200' },
    despacho: { label: 'Despacho', badge: 'bg-slate-200 text-slate-800 border-slate-300' },
  };

  const getRoleBadge = (role?: string) => {
    return (role && roleLabels[role as Role]) || { label: role || 'Usuario', badge: 'bg-slate-100 text-slate-800 border-slate-200' };
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200/90 shadow-2xs backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
        {/* Zone 1: Brand Title & Sync Schedule Indicator */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black shadow-xs tracking-tighter">
            ST
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <span className="text-base font-bold text-slate-900 tracking-tight whitespace-nowrap">
              Tablero Logístico
            </span>
            
            {/* Auto-sync Schedule Badge */}
            <div
              className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                scheduleInfo.isActive
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
              title={scheduleInfo.nextWindowText}
            >
              <span className="relative flex h-2 w-2">
                {scheduleInfo.isActive && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                )}
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    scheduleInfo.isActive ? 'bg-emerald-500' : 'bg-slate-400'
                  }`}
                />
              </span>
              <span className="font-mono font-bold">Auto-Sync</span>
              <span className="hidden xl:inline text-[9.5px]">({scheduleInfo.scheduleBadge})</span>
            </div>
          </div>
        </div>

        {/* Zone 2: Navigation & Action Controls */}
        <nav className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Search Button */}
          <button
            onClick={onOpenSearch}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
            title="Buscar Orden OV/TR/OF"
          >
            <Search className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Buscar Orden</span>
          </button>

          {/* Summary Table */}
          {(currentUser.role === 'master' || currentUser.role === 'asignador') && (
            <button
              onClick={onOpenSummary}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap"
              title="Tabla Resumen"
            >
              <BarChart3 className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Resumen</span>
            </button>
          )}

          {/* OneDrive & Data Integration */}
          <button
            onClick={onOpenDataSync}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-800 bg-sky-50 hover:bg-sky-100 rounded-lg border border-sky-200/70 transition-colors whitespace-nowrap"
            title="Sincronizar OneDrive"
          >
            <div className="relative">
              <Cloud className="w-3.5 h-3.5 text-sky-600" />
              {oneDriveStatus?.isSynced && (
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full absolute -top-0.5 -right-0.5 ring-1 ring-white" />
              )}
            </div>
            <span className="hidden md:inline">OneDrive</span>
            {oneDriveStatus?.isSynced && (
              <span className="hidden lg:inline text-[10px] bg-sky-200/60 text-sky-900 font-mono px-1.5 py-0.2 rounded-full font-bold">
                {oneDriveStatus.liCount.toLocaleString()}
              </span>
            )}
          </button>

          {/* User Management */}
          {canManageUsers && (
            <button
              onClick={onOpenUserManagement}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap"
              title="Gestión de Usuarios"
            >
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden lg:inline">Usuarios</span>
            </button>
          )}

          {/* Manage Labels */}
          {canManageUsers && onOpenManageLabels && (
            <button
              onClick={onOpenManageLabels}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/70 rounded-lg transition-colors whitespace-nowrap"
              title="Administrar Etiquetas (Texto y Colores)"
            >
              <Tag className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden lg:inline">Etiquetas</span>
            </button>
          )}

          {/* Bulk Import CSV Button */}
          {canCreate && onOpenBulkImport && (
            <button
              onClick={onOpenBulkImport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors whitespace-nowrap shadow-2xs"
              title="Subir Tarjetas Masivas en CSV (Trello)"
            >
              <Upload className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Subir CSV</span>
            </button>
          )}

          {/* Create Card Button */}
          {canCreate && (
            <button
              onClick={onOpenCreateCard}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition-colors whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Crear Tarjeta</span>
            </button>
          )}
        </nav>

        {/* Zone 3: Active User Profile & Quick Switcher */}
        <div className="relative shrink-0 flex items-center gap-2">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-left"
          >
            <div
              className={`w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-2xs ${
                currentUser.avatarColor || 'bg-slate-700'
              }`}
            >
              {currentUser.name.charAt(0)}
            </div>
            <div className="hidden sm:block leading-tight">
              <div className="text-xs font-bold text-slate-900 truncate max-w-[120px]">
                {currentUser.name}
              </div>
              <span
                className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border ${
                  getRoleBadge(currentUser?.role).badge
                }`}
              >
                {getRoleBadge(currentUser?.role).label}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Quick Logout Button */}
          <button
            onClick={onLogout}
            className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Cerrar Sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>

          {/* User Switch Dropdown */}
          {userMenuOpen && (
            <div className="absolute right-0 top-12 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="px-3 py-2 border-b border-slate-100 mb-1 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Usuario Actual
                  </span>
                  <span className="text-xs font-bold text-slate-900">
                    {currentUser.name}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    onLogout();
                  }}
                  className="text-xs text-red-600 font-bold hover:bg-red-50 px-2 py-1 rounded flex items-center gap-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Salir</span>
                </button>
              </div>

              <div className="px-3 py-1 text-[10px] font-bold uppercase text-slate-400">
                Cambiar de Usuario
              </div>

              <div className="max-h-64 overflow-y-auto space-y-0.5 px-1">
                {allUsers.map(u => {
                  const isCurrent = u.id === currentUser.id;
                  return (
                    <button
                      key={u.id}
                      onClick={() => {
                        onSwitchUser(u);
                        setUserMenuOpen(false);
                      }}
                      className={`w-full px-2.5 py-2 rounded-lg text-left text-xs flex items-center justify-between transition-colors ${
                        isCurrent
                          ? 'bg-slate-100 text-slate-900 font-bold'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <div
                          className={`w-6 h-6 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0 ${
                            u.avatarColor || 'bg-slate-700'
                          }`}
                        >
                          {u.name.charAt(0)}
                        </div>
                        <div className="truncate">
                          <div className="truncate">{u.name}</div>
                          <div className="text-[10px] text-slate-400 font-normal">
                            @{u.username}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0 ${
                          getRoleBadge(u?.role).badge
                        }`}
                      >
                        {getRoleBadge(u?.role).label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
