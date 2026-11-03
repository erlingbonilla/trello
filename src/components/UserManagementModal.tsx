import React, { useState } from 'react';
import { Role, User } from '../types';
import { addUser, saveUsers } from '../services/dataStorage';
import { X, UserPlus, Check, ShieldCheck, User as UserIcon, Truck, Key } from 'lucide-react';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  allUsers: User[];
  onUsersUpdated: () => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  allUsers,
  onUsersUpdated,
}) => {
  const isMaster = currentUser.role === 'master';
  const isAsignador = currentUser.role === 'asignador';

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('123');
  const [role, setRole] = useState<Role>('pickeador');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !username.trim()) {
      setError('Por favor complete todos los campos requeridos.');
      return;
    }

    // Role restrictions: Asignador can only create 'pickeador'
    const targetRole = isMaster ? role : 'pickeador';

    const colorPalette = [
      'bg-indigo-600',
      'bg-emerald-600',
      'bg-blue-600',
      'bg-purple-600',
      'bg-teal-600',
      'bg-amber-600',
      'bg-rose-600',
    ];
    const randomColor = colorPalette[Math.floor(Math.random() * colorPalette.length)];

    addUser({
      name: name.trim(),
      username: username.trim().toLowerCase(),
      role: targetRole,
      password: password || '123',
      active: true,
      avatarColor: randomColor,
    });

    setName('');
    setUsername('');
    setPassword('123');
    setError(null);
    onUsersUpdated();
  };

  const toggleUserActive = (userToToggle: User) => {
    if (!isMaster && userToToggle.role !== 'pickeador') return;
    if (userToToggle.id === currentUser.id) return; // Cannot deactivate self

    const updated = allUsers.map(u =>
      u.id === userToToggle.id ? { ...u, active: !u.active } : u
    );
    saveUsers(updated);
    onUsersUpdated();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Gestión de Usuarios del Tablero
              </h2>
              <p className="text-xs text-slate-500">
                {isMaster
                  ? 'Control total de usuarios (Master, Asignador, Pickeadores, Despacho)'
                  : 'Creación y administración de usuarios tipo Pickeador'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Create User Form */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5 text-indigo-600" />
              <span>
                {isMaster ? 'Crear Nuevo Usuario' : 'Crear Nuevo Usuario tipo Pickeador'}
              </span>
            </h3>

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nombre Completo</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Ej. Roberto Morales"
                    className="w-full p-2 bg-white rounded-lg border border-slate-300"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nombre de Usuario (Login)</label>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Ej. rmorales"
                    className="w-full p-2 bg-white rounded-lg border border-slate-300 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Contraseña</label>
                  <input
                    type="text"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Contraseña"
                    className="w-full p-2 bg-white rounded-lg border border-slate-300 font-mono"
                  />
                </div>

                {isMaster ? (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Rol / Tipo de Usuario</label>
                    <select
                      value={role}
                      onChange={e => setRole(e.target.value as Role)}
                      className="w-full p-2 bg-white rounded-lg border border-slate-300 font-medium"
                    >
                      <option value="pickeador">3. Pickeador (Lista de Trello)</option>
                      <option value="asignador">2. Asignador (Crea/Asigna tarjetas)</option>
                      <option value="master">1. Master (Control Total)</option>
                      <option value="despacho">4. Despacho (Automático)</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Rol asignado</label>
                    <input
                      type="text"
                      disabled
                      value="Pickeador (Lista en Tablero)"
                      className="w-full p-2 bg-slate-100 rounded-lg border border-slate-200 text-slate-600 font-medium"
                    />
                  </div>
                )}
              </div>

              {error && <div className="text-xs text-red-600 font-medium">{error}</div>}

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Registrar Usuario</span>
                </button>
              </div>
            </form>
          </div>

          {/* Existing Users Table */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Usuarios del Sistema ({allUsers.length})
            </h3>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Usuario</th>
                    <th className="py-2.5 px-3">Nombre</th>
                    <th className="py-2.5 px-3">Rol</th>
                    <th className="py-2.5 px-3 text-center">Estado</th>
                    {(isMaster || isAsignador) && <th className="py-2.5 px-3 text-right">Acción</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allUsers.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono text-slate-700 font-medium">
                        {u.username}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 flex items-center gap-2">
                        <span
                          className={`w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center ${
                            u.avatarColor || 'bg-slate-700'
                          }`}
                        >
                          {u.name.charAt(0)}
                        </span>
                        <span>{u.name}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                            u.role === 'master'
                              ? 'bg-purple-100 text-purple-900'
                              : u.role === 'asignador'
                              ? 'bg-emerald-100 text-emerald-900'
                              : u.role === 'despacho'
                              ? 'bg-slate-200 text-slate-800'
                              : 'bg-blue-100 text-blue-900'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block w-2 h-2 rounded-full ${
                            u.active ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}
                          title={u.active ? 'Activo' : 'Inactivo'}
                        />
                      </td>
                      {(isMaster || isAsignador) && (
                        <td className="py-2.5 px-3 text-right">
                          {(isMaster || u.role === 'pickeador') && u.id !== currentUser.id && (
                            <button
                              onClick={() => toggleUserActive(u)}
                              className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 underline"
                            >
                              {u.active ? 'Desactivar' : 'Activar'}
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};
