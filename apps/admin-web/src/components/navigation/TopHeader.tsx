/**
 * Vote Capsule™ Admin Portal — Top Header
 */

import React from 'react';
import { Bell, Search, User, LogOut } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { logout } from '../../store/slices/authSlice';
import { identityClient } from '../../api/apiClient';
import { useNavigate } from 'react-router-dom';

export function TopHeader(): React.JSX.Element {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);

  const handleLogout = async () => {
    try { await identityClient.post('/auth/logout', {}); } catch { /* non-fatal */ }
    dispatch(logout());
    navigate('/login');
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
      {/* Search */}
      <div className="relative w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
        <input
          type="search"
          placeholder="Search tenants, users, elections…"
          className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#0B3C6D] focus:border-[#0B3C6D]"
          aria-label="Search"
        />
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <button
          className="relative p-2 rounded-md hover:bg-gray-100 transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5 text-gray-500" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" aria-hidden="true" />
        </button>

        {/* User menu */}
        <div className="flex items-center gap-3 pl-3 border-l border-gray-200">
          <div className="flex flex-col text-right">
            <span className="text-sm font-medium text-gray-900 leading-none">
              {user?.email ?? 'Admin'}
            </span>
            <span className="text-xs text-gray-500 mt-0.5">Super Admin</span>
          </div>
          <div className="w-8 h-8 bg-[#0B3C6D] rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-white" aria-hidden="true" />
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-md hover:bg-gray-100 transition-colors"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>
    </header>
  );
}
