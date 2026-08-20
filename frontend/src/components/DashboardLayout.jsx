import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Video,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Bell,
  Search,
  LogOut,
  User,
  Settings,
  Shield,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { getUser, logout } from '../utils/auth';

export default function DashboardLayout({
  navLinks = [],
  title = 'Dashboard',
  subtitle = 'Management Portal',
  children,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getUser() || {};

  // Collapsed state persisted in localStorage
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });

  const [mobileOpen, setMobileOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [hoveredTooltip, setHoveredTooltip] = useState(null);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  };

  // Close menus on path change
  useEffect(() => {
    setMobileOpen(false);
    setUserDropdownOpen(false);
    setNotificationsOpen(false);
  }, [location.pathname]);

  const roleLabel =
    user.role === 'superadmin'
      ? 'Super Admin'
      : user.role === 'school'
      ? 'School Admin'
      : user.role === 'student'
      ? 'Student'
      : 'Parent';

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#1C252E] flex flex-col font-sans selection:bg-[#00A76F] selection:text-white">
      <div className="flex flex-1 w-full relative">
        {/* ========================================================= */}
        {/* 1. DESKTOP SIDEBAR (Collapsible)                          */}
        {/* ========================================================= */}
        <motion.aside
          initial={false}
          animate={{ width: isCollapsed ? 80 : 280 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="hidden lg:flex flex-col bg-white border-r border-[rgba(145,158,171,0.16)] sticky top-0 h-screen z-30 shrink-0 shadow-[0_0_2px_0_rgba(145,158,171,0.12)] select-none relative"
        >
          {/* Minimals Floating Border Toggle Button */}
          <button
            type="button"
            onClick={toggleCollapse}
            className="absolute -right-3 top-7 w-6 h-6 rounded-full bg-white border border-[rgba(145,158,171,0.24)] shadow-sm text-[#637381] hover:text-[#1C252E] hover:bg-[#F9FAFB] flex items-center justify-center transition-all z-40 cursor-pointer"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
          </button>

          {/* Logo & Header */}
          <div className="h-20 px-5 flex items-center justify-between border-b border-[rgba(145,158,171,0.12)]">
            <Link to="/" className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-[#00A76F] flex items-center justify-center text-white shadow-[0_8px_16px_0_rgba(0,167,111,0.24)] shrink-0 transition-transform hover:scale-105">
                <Video size={20} />
              </div>
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="min-w-0"
                >
                  <span className="font-extrabold text-base text-[#1C252E] tracking-tight leading-tight block truncate">
                    Hostel<span className="text-[#00A76F]">Call</span>
                  </span>
                  <span className="text-[10px] font-bold text-[#919EAB] block uppercase tracking-wider truncate">
                    {roleLabel}
                  </span>
                </motion.div>
              )}
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto no-scrollbar">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.to;
              const Icon = link.icon;

              return (
                <div key={link.to} className="relative group">
                  <Link
                    to={link.to}
                    onMouseEnter={() => isCollapsed && setHoveredTooltip(link.label)}
                    onMouseLeave={() => isCollapsed && setHoveredTooltip(null)}
                    className={`flex items-center gap-3.5 ${
                      isCollapsed ? 'justify-center px-0 py-3' : 'px-3.5 py-2.5'
                    } rounded-xl text-xs font-bold transition-all duration-200 ${
                      isActive
                        ? 'bg-[#00A76F]/12 text-[#007849] shadow-xs'
                        : 'text-[#637381] hover:bg-[#919EAB]/8 hover:text-[#1C252E]'
                    }`}
                  >
                    <Icon size={20} className={`shrink-0 ${isActive ? 'text-[#00A76F]' : 'text-[#637381]'}`} />
                    {!isCollapsed && <span className="truncate">{link.label}</span>}
                  </Link>

                  {/* Collapsed Hover Tooltip */}
                  {isCollapsed && hoveredTooltip === link.label && (
                    <motion.div
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8 }}
                      className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-[#1C252E] text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg z-50 whitespace-nowrap pointer-events-none"
                    >
                      {link.label}
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom Sidebar Footer */}
          <div className="p-3 border-t border-[rgba(145,158,171,0.12)] space-y-2">
            {/* Profile Info Card */}
            <div
              className={`p-2.5 bg-[#F9FAFB] border border-[rgba(145,158,171,0.16)] rounded-xl flex items-center ${
                isCollapsed ? 'justify-center' : 'justify-between'
              } gap-2`}
            >
              <div className="w-8 h-8 rounded-full bg-[#00A76F]/15 text-[#007849] font-bold text-xs flex items-center justify-center shrink-0">
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-[#1C252E] truncate">{user.name || 'User'}</p>
                  <p className="text-[10px] text-[#919EAB] truncate">{user.email || user.schoolCode || user.studentId || user.mobile || roleLabel}</p>
                </div>
              )}
            </div>

            {!isCollapsed && (
              <button
                type="button"
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-[#FF5630] hover:bg-[#FF5630]/10 rounded-xl transition"
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </motion.aside>

        {/* ========================================================= */}
        {/* 2. MAIN CONTENT AREA WITH TOP DASHBOARD HEADER            */}
        {/* ========================================================= */}
        <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
          {/* Top Header Bar */}
          <header className="h-20 bg-white/80 backdrop-blur-md border-b border-[rgba(145,158,171,0.16)] sticky top-0 z-20 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 shadow-xs">
            {/* Left Header Controls */}
            <div className="flex items-center gap-3">
              {/* Mobile Menu Hamburger */}
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="lg:hidden p-2 rounded-xl text-[#637381] hover:text-[#1C252E] hover:bg-[#919EAB]/12 transition"
                aria-label="Open sidebar menu"
              >
                <Menu size={22} />
              </button>

              {/* Title & Subtitle */}
              <div>
                <h1 className="text-base sm:text-lg font-bold text-[#1C252E] tracking-tight leading-tight">{title}</h1>
                <p className="text-xs text-[#919EAB] hidden sm:block font-medium">{subtitle}</p>
              </div>
            </div>

            {/* Right Header Quick Controls */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Search Trigger */}
              <div className="relative hidden md:block">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#919EAB]" />
                <input
                  type="text"
                  placeholder="Quick search..."
                  className="pl-9 pr-8 py-1.5 text-xs bg-[#F9FAFB] hover:bg-white focus:bg-white border border-[rgba(145,158,171,0.2)] rounded-xl w-44 lg:w-56 text-[#1C252E] outline-none focus:border-[#00A76F] transition"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[#919EAB] bg-[#919EAB]/12 px-1.5 py-0.5 rounded">
                  ⌘K
                </span>
              </div>

              {/* Notifications Dropdown Button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="p-2 rounded-xl text-[#637381] hover:text-[#1C252E] hover:bg-[#919EAB]/12 relative transition"
                  aria-label="View notifications"
                >
                  <Bell size={20} />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#FF5630] rounded-full ring-2 ring-white" />
                </button>

                <AnimatePresence>
                  {notificationsOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      className="absolute right-0 mt-2 w-72 sm:w-80 bg-white border border-[rgba(145,158,171,0.16)] rounded-2xl shadow-[0_0_2px_0_rgba(145,158,171,0.24),-20px_20px_40px_-4px_rgba(145,158,171,0.24)] p-4 z-50 space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-[rgba(145,158,171,0.12)] pb-2">
                        <span className="text-xs font-bold text-[#1C252E]">Notifications</span>
                        <span className="text-[10px] font-bold bg-[#00A76F]/12 text-[#007849] px-2 py-0.5 rounded-full">New</span>
                      </div>
                      <div className="space-y-2 text-xs text-[#637381]">
                        <div className="p-2 rounded-xl bg-[#F9FAFB] hover:bg-[#919EAB]/8 transition">
                          <p className="font-semibold text-[#1C252E]">System Operational</p>
                          <p className="text-[11px] text-[#919EAB]">HD Video calling servers running smoothly.</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* User Profile Pill & Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-[#919EAB]/12 transition"
                >
                  <div className="w-8 h-8 rounded-full bg-[#00A76F] text-white font-bold text-xs flex items-center justify-center shadow-xs">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="text-xs font-bold text-[#1C252E] hidden sm:block max-w-[100px] truncate">
                    {user.name || 'Account'}
                  </span>
                </button>

                <AnimatePresence>
                  {userDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      className="absolute right-0 mt-2 w-56 bg-white border border-[rgba(145,158,171,0.16)] rounded-2xl shadow-[0_0_2px_0_rgba(145,158,171,0.24),-20px_20px_40px_-4px_rgba(145,158,171,0.24)] p-2 z-50 space-y-1"
                    >
                      <div className="px-3 py-2 border-b border-[rgba(145,158,171,0.12)]">
                        <p className="text-xs font-bold text-[#1C252E] truncate">{user.name || 'User'}</p>
                        <p className="text-[11px] text-[#919EAB] truncate">{roleLabel}</p>
                      </div>

                      <button
                        type="button"
                        onClick={logout}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-[#FF5630] hover:bg-[#FF5630]/10 transition"
                      >
                        <LogOut size={16} />
                        <span>Sign Out</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </header>

          {/* Dashboard Main Content Body */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
            {children}
          </main>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. MOBILE ANIMATED DRAWER                                  */}
      {/* ========================================================= */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-[#1C252E]/60 backdrop-blur-md"
            />

            {/* Mobile Drawer Aside */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col justify-between z-10"
            >
              <div>
                <div className="p-5 border-b border-[rgba(145,158,171,0.16)] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#00A76F] flex items-center justify-center text-white font-bold shadow-xs">
                      <Video size={18} />
                    </div>
                    <div>
                      <h2 className="text-sm font-extrabold text-[#1C252E]">Hostel Call</h2>
                      <p className="text-[10px] font-bold text-[#919EAB] uppercase tracking-wider">{roleLabel}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileOpen(false)}
                    className="p-2 rounded-xl text-[#919EAB] hover:text-[#1C252E] hover:bg-[#919EAB]/8 transition"
                    aria-label="Close menu"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Nav Links */}
                <nav className="p-4 space-y-1.5">
                  {navLinks.map((link) => {
                    const isActive = location.pathname === link.to;
                    const Icon = link.icon;
                    return (
                      <Link
                        key={link.to}
                        to={link.to}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-bold transition ${
                          isActive
                            ? 'bg-[#00A76F]/12 text-[#007849]'
                            : 'text-[#637381] hover:bg-[#919EAB]/8 hover:text-[#1C252E]'
                        }`}
                      >
                        <Icon size={20} className={isActive ? 'text-[#00A76F]' : 'text-[#637381]'} />
                        <span>{link.label}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>

              {/* Mobile Drawer Footer */}
              <div className="p-4 border-t border-[rgba(145,158,171,0.16)] space-y-3">
                <div className="p-3 bg-[#F9FAFB] border border-[rgba(145,158,171,0.16)] rounded-xl flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#00A76F]/15 text-[#007849] font-bold text-xs flex items-center justify-center">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-[#1C252E] truncate">{user.name || 'User'}</p>
                    <p className="text-[11px] text-[#919EAB] truncate">{roleLabel}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-[#FF5630] bg-[#FF5630]/10 hover:bg-[#FF5630]/20 transition"
                >
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
