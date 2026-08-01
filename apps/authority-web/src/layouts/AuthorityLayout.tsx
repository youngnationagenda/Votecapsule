import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Vote, Users, MapPin, BarChart3, CheckSquare,
  Brain, BookOpen, Eye, FileText, ChevronLeft, Menu, LogOut, Bell
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { toggleSidebar } from '../store/slices/uiSlice';
import { logout } from '../store/slices/authSlice';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/elections', icon: Vote, label: 'Election Setup' },
  { to: '/candidates', icon: Users, label: 'Candidate Approval' },
  { to: '/geography', icon: MapPin, label: 'Geographic Management' },
  { to: '/live-reporting', icon: BarChart3, label: 'Live Reporting' },
  { to: '/validation', icon: CheckSquare, label: 'Validation Monitor' },
  { to: '/ai-review', icon: Brain, label: 'AI Review' },
  { to: '/publication', icon: BookOpen, label: 'Publication Control' },
  { to: '/observers', icon: Eye, label: 'Observer Coordination' },
  { to: '/reports', icon: FileText, label: 'Official Reports' },
];

export function AuthorityLayout(): React.JSX.Element {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const collapsed = useAppSelector((s) => s.ui.sidebarCollapsed);
  const user = useAppSelector((s) => s.auth.user);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className={`flex flex-col bg-white border-r border-gray-200 transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
          <div className="flex-shrink-0 w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
            <Vote className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">Vote Capsule™</p>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                Authority
              </span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `sidebar-item ${isActive ? 'sidebar-item-active' : 'sidebar-item-inactive'}`
              }
              title={collapsed ? label : undefined}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => dispatch(toggleSidebar())}
          className="flex items-center gap-2 px-4 py-3 border-t border-gray-100 text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors text-sm"
        >
          {collapsed ? <Menu className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" /><span>Collapse</span></>}
        </button>
      </aside>

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <h1 className="text-base font-semibold text-gray-900">Election Authority Portal</h1>
          <div className="flex items-center gap-3">
            <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <Bell className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                <span className="text-xs font-semibold text-emerald-700">
                  {user?.email?.charAt(0).toUpperCase() ?? 'A'}
                </span>
              </div>
              {!collapsed && (
                <span className="text-sm text-gray-700 hidden sm:block">{user?.email}</span>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
