import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, MapPin, BarChart3, AlertTriangle, Brain, Shield, FileText, Download, Globe, BookOpen, LogOut, Menu, ChevronLeft, Eye, Lock } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { toggleSidebar } from '../store/slices/uiSlice';
import { logout } from '../store/slices/authSlice';
import { apiClient } from '../api/apiClient';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'National Dashboard' },
  { to: '/regional', icon: MapPin, label: 'Regional Monitoring' },
  { to: '/live-reporting', icon: BarChart3, label: 'Live Reporting' },
  { to: '/risk-analysis', icon: AlertTriangle, label: 'Risk Analysis' },
  { to: '/ai-alerts', icon: Brain, label: 'AI Alerts' },
  { to: '/evidence', icon: Shield, label: 'Evidence Viewer' },
  { to: '/incidents', icon: FileText, label: 'Incident Tracking' },
  { to: '/downloads', icon: Download, label: 'Downloads' },
  { to: '/api-access', icon: Globe, label: 'REST API Access' },
];

export function ObserverLayout(): React.JSX.Element {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const collapsed = useAppSelector((s) => s.ui.sidebarCollapsed);
  const user = useAppSelector((s) => s.auth.user);
  const handleLogout = async () => {
    try { await apiClient.post('/identity/auth/logout', {}); } catch { /* non-fatal */ }
    dispatch(logout()); navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <aside className={`flex flex-col bg-white border-r border-gray-200 transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
          <div className="flex-shrink-0 w-8 h-8 bg-sky-600 rounded-lg flex items-center justify-center"><Eye className="w-4 h-4 text-white" /></div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">Vote Capsule™</p>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-100 text-sky-700">Observer</span>
            </div>
          )}
        </div>
        {!collapsed && (
          <div className="px-4 py-2 bg-sky-50 border-b border-sky-100">
            <div className="flex items-center gap-1.5"><Lock className="w-3 h-3 text-sky-600" /><span className="text-xs text-sky-700 font-medium">Read-only access</span></div>
          </div>
        )}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `sidebar-item ${isActive ? 'sidebar-item-active' : 'sidebar-item-inactive'}`} title={collapsed ? label : undefined}>
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </NavLink>
          ))}
        </nav>
        <button onClick={() => dispatch(toggleSidebar())} className="flex items-center gap-2 px-4 py-3 border-t border-gray-100 text-gray-500 hover:bg-gray-50 text-sm">
          {collapsed ? <Menu className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" /><span>Collapse</span></>}
        </button>
      </aside>
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-semibold text-gray-900">Observer Portal</h1>
            <span className="read-only-badge flex items-center gap-1"><Lock className="w-3 h-3" />Read-Only</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-xs text-gray-500">{user?.organization ?? user?.email}</div>
            <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center">
              <span className="text-xs font-semibold text-sky-700">{user?.email?.charAt(0).toUpperCase() ?? 'O'}</span>
            </div>
            <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50"><LogOut className="w-4 h-4" /></button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6"><Outlet /></main>
      </div>
    </div>
  );
}
