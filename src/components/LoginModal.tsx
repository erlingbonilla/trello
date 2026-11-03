import React, { useState } from 'react';
import { User, Role } from '../types';
import { getUsers, validateCredentials, setCurrentUser } from '../services/dataStorage';
import { Lock, UserCheck, KeyRound, ShieldCheck, LogIn, Eye, EyeOff } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onLoginSuccess: (user: User) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onLoginSuccess }) => {
  const users = getUsers().filter(u => u.active);
  const [selectedUserId, setSelectedUserId] = useState<string>(users[0]?.id || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const selectedUser = users.find(u => u.id === selectedUserId) || users[0];

  const roleBadges: Record<Role, { label: string; badge: string }> = {
    master: { label: 'Master (Control Total)', badge: 'bg-purple-100 text-purple-900 border-purple-200' },
    asignador: { label: 'Asignador', badge: 'bg-emerald-100 text-emerald-900 border-emerald-200' },
    pickeador: { label: 'Pickeador', badge: 'bg-blue-100 text-blue-900 border-blue-200' },
    despacho: { label: 'Despacho', badge: 'bg-slate-200 text-slate-800 border-slate-300' },
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedUserId) {
      setErrorMsg('Por favor seleccione un usuario.');
      return;
    }

    if (!password) {
      setErrorMsg('Por favor ingrese su contraseña.');
      return;
    }

    const validatedUser = validateCredentials(selectedUserId, password);
    if (!validatedUser) {
      setErrorMsg('Contraseña incorrecta para el usuario seleccionado. Verifique sus datos.');
      return;
    }

    setCurrentUser(validatedUser);
    onLoginSuccess(validatedUser);
    setPassword('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-6 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-sky-500 to-purple-500" />
          <div className="w-12 h-12 bg-emerald-600 rounded-xl mx-auto flex items-center justify-center text-white font-black text-xl shadow-lg mb-3">
            ST
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">Ingreso al Sistema Logístico</h2>
          <p className="text-xs text-slate-400 mt-1">
            Seleccione su usuario e ingrese su contraseña para acceder
          </p>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2">
              <Lock className="w-4 h-4 shrink-0 text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* User selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Seleccionar Usuario
            </label>
            <div className="relative">
              <select
                value={selectedUserId}
                onChange={e => {
                  setSelectedUserId(e.target.value);
                  setErrorMsg(null);
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
              >
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} (@{u.username})
                  </option>
                ))}
              </select>
              <UserCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>

          {/* Selected User Role badge indicator */}
          {selectedUser && (
            <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
              <span className="font-semibold text-slate-600">Rol asignado:</span>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                  roleBadges[selectedUser.role]?.badge || 'bg-slate-100 text-slate-700'
                }`}
              >
                {roleBadges[selectedUser.role]?.label || selectedUser.role}
              </span>
            </div>
          )}

          {/* Password field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Contraseña (Pass)
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="Ingrese su contraseña..."
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all font-mono"
              />
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm mt-2"
          >
            <LogIn className="w-4 h-4" />
            <span>Iniciar Sesión</span>
          </button>
        </form>

        {/* Footer info */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-center">
          <span className="text-[11px] text-slate-500 flex items-center justify-center gap-1 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Sistema Logístico Santo Tomás • Autenticación requerida</span>
          </span>
        </div>
      </div>
    </div>
  );
};
