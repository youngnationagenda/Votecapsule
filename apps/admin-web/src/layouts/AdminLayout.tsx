/**
 * Vote Capsule™ Admin Portal — Main Admin Layout
 *
 * Contains the sidebar navigation and main content area.
 * Follows the V14 dashboard template:
 * ┌─────────────────────────────┐
 * │ Header                      │
 * ├──────────┬──────────────────┤
 * │ Sidebar  │  Main Content    │
 * └──────────┴──────────────────┘
 */

import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/navigation/Sidebar';
import { TopHeader } from '../components/navigation/TopHeader';
import { ToastContainer } from '../components/feedback/ToastContainer';
import { useAppSelector } from '../store/hooks';

export function AdminLayout(): React.JSX.Element {
  const sidebarCollapsed = useAppSelector((state) => state.ui.sidebarCollapsed);

  return (
    <div className="flex h-screen bg-[#F5F7FA] overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar collapsed={sidebarCollapsed} />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top Header */}
        <TopHeader />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>

      {/* Toast Notifications */}
      <ToastContainer />
    </div>
  );
}
