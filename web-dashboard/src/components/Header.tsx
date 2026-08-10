import React, { useState } from 'react';
import { Shield, Bell, Building2, LogOut, ChevronDown, Lock, Menu, X } from 'lucide-react';
import { UserSession } from './AuthScreen';

export interface SchoolTenant {
  id: string;
  code: string;
  name: string;
  students: number;
  tablets: number;
}

export const ALL_SCHOOL_TENANTS: SchoolTenant[] = [
  { id: '1', code: 'SCH-DAP', name: 'Delhi Public School (R.K. Puram)', students: 1240, tablets: 18 },
  { id: '2', code: 'SCH-DHA', name: 'The Doon School (Dehradun)', students: 850, tablets: 14 },
  { id: '3', code: 'SCH-MAYO', name: 'Mayo College (Ajmer)', students: 920, tablets: 16 },
  { id: '4', code: 'SCH-SHER', name: 'Sherwood College (Nainital)', students: 640, tablets: 10 },
];

interface HeaderProps {
  portalRole: 'SCHOOL_ADMIN' | 'SUPER_ADMIN';
  onSwitchPortal: (role: 'SCHOOL_ADMIN' | 'SUPER_ADMIN') => void;
  currentUser: UserSession | null;
  onLogout: () => void;
  selectedTenant: SchoolTenant;
  onSelectTenant: (tenant: SchoolTenant) => void;
}

export const Header: React.FC<HeaderProps> = ({
  portalRole,
  onSwitchPortal,
  currentUser,
  onLogout,
  selectedTenant,
  onSelectTenant
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-50 shadow-xs">
      <div className="flex items-center justify-between px-3.5 sm:px-6 lg:px-8 h-18 sm:h-20 max-w-[1600px] mx-auto">
        {/* Brand Logo & Tenant Badge */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-indigo-600 to-cyan-500 rounded-xl flex items-center justify-center shadow-md shadow-indigo-100 shrink-0">
            <Shield size={20} className="text-white sm:w-5 sm:h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 leading-none">
                Hostel<span className="text-cyan-600">Connect</span>
              </h1>
              {isSuperAdmin ? (
                <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                  <Shield size={10} className="text-indigo-600" />
                  <span>All Tenants</span>
                </span>
              ) : (
                <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                  <Lock size={10} className="text-slate-400" />
                  <span>{currentUser?.schoolCode || 'SCH-DAP'}</span>
                </span>
              )}
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5 truncate max-w-[150px] sm:max-w-none">
              {isSuperAdmin ? 'Master Multi-Tenant Console' : (currentUser?.schoolName || 'Delhi Public School')}
            </span>
          </div>
        </div>

        {/* Desktop Center: Super Admin Global Tenant Selector & Portal Switcher */}
        {isSuperAdmin ? (
          <div className="hidden lg:flex items-center gap-3">
            {/* Portal Switcher for Super Admin */}
            <div className="flex items-center bg-slate-100/90 p-1.5 rounded-xl border border-slate-200/60 shadow-inner">
              <button
                onClick={() => onSwitchPortal('SUPER_ADMIN')}
                className={`flex items-center gap-1.5 py-2 px-3.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  portalRole === 'SUPER_ADMIN'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <Shield size={14} /> Super Admin Console
              </button>
              <button
                onClick={() => onSwitchPortal('SCHOOL_ADMIN')}
                className={`flex items-center gap-1.5 py-2 px-3.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  portalRole === 'SCHOOL_ADMIN'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <Building2 size={14} /> School Tenant View
              </button>
            </div>

            {/* Super Admin Tenant Dropdown Switcher */}
            {portalRole === 'SCHOOL_ADMIN' && (
              <div className="flex items-center gap-2 bg-indigo-50/80 border border-indigo-200/80 px-3 py-1.5 rounded-xl">
                <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">Tenant:</span>
                <select
                  value={selectedTenant.code}
                  onChange={(e) => {
                    const found = ALL_SCHOOL_TENANTS.find(t => t.code === e.target.value);
                    if (found) onSelectTenant(found);
                  }}
                  className="bg-white border border-indigo-200 text-xs font-bold text-slate-800 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  {ALL_SCHOOL_TENANTS.map((tenant) => (
                    <option key={tenant.code} value={tenant.code}>
                      {tenant.name} ({tenant.code})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        ) : (
          /* Regular School Admin: Strictly restricted to their single school tenant */
          <div className="hidden lg:flex items-center gap-2 bg-slate-100/90 py-2 px-4 rounded-xl border border-slate-200/60 text-xs font-bold text-slate-700">
            <Building2 size={15} className="text-cyan-600" />
            <span>{currentUser?.schoolName || 'Delhi Public School'} ({currentUser?.schoolCode || 'SCH-DAP'})</span>
          </div>
        )}

        {/* Right: User Profile & Actions */}
        <div className="flex items-center gap-2 sm:gap-3.5">
          <button className="relative p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer" title="Notifications">
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>

          <div className="hidden sm:flex items-center gap-2.5 pl-2 sm:pl-3 border-l border-slate-200">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 text-white flex items-center justify-center text-xs font-extrabold shadow-sm shrink-0">
              {currentUser?.name?.charAt(0) || 'U'}
            </div>
            <div className="hidden xl:block text-left">
              <p className="text-xs font-bold text-slate-900 leading-none">{currentUser?.name || 'User'}</p>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1">
                {currentUser?.role === 'SUPER_ADMIN' ? '👑 Master Super Admin' : 'School Admin'}
              </p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="hidden sm:flex items-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200/60 transition cursor-pointer"
          >
            <LogOut size={14} />
            <span>Log Out</span>
          </button>

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            title="Toggle Menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-slate-50 border-t border-slate-200 px-4 py-4 space-y-3 animate-fade-in-up">
          {isSuperAdmin && (
            <div className="space-y-2.5">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Super Admin Navigation:</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { onSwitchPortal('SUPER_ADMIN'); setMobileMenuOpen(false); }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    portalRole === 'SUPER_ADMIN' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-700'
                  }`}
                >
                  <Shield size={14} /> Console
                </button>
                <button
                  onClick={() => { onSwitchPortal('SCHOOL_ADMIN'); setMobileMenuOpen(false); }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    portalRole === 'SCHOOL_ADMIN' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-700'
                  }`}
                >
                  <Building2 size={14} /> Tenant View
                </button>
              </div>

              {portalRole === 'SCHOOL_ADMIN' && (
                <div className="pt-2">
                  <label className="block text-[11px] font-bold text-indigo-700 uppercase mb-1">Active School Tenant:</label>
                  <select
                    value={selectedTenant.code}
                    onChange={(e) => {
                      const found = ALL_SCHOOL_TENANTS.find(t => t.code === e.target.value);
                      if (found) {
                        onSelectTenant(found);
                        setMobileMenuOpen(false);
                      }
                    }}
                    className="w-full bg-white border border-indigo-200 text-xs font-bold text-slate-800 rounded-xl p-2.5"
                  >
                    {ALL_SCHOOL_TENANTS.map((tenant) => (
                      <option key={tenant.code} value={tenant.code}>
                        {tenant.name} ({tenant.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-slate-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs font-bold">
                {currentUser?.name?.charAt(0) || 'U'}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">{currentUser?.name}</p>
                <p className="text-[10px] text-slate-400 uppercase font-semibold">{currentUser?.role?.replace('_', ' ')}</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold text-red-600 bg-red-100"
            >
              <LogOut size={14} />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
