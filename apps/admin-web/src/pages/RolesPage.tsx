import React from 'react';
import { Shield, Lock } from 'lucide-react';
import { SystemRole } from '@vote-capsule/types';

const SYSTEM_ROLES = Object.values(SystemRole).map((name) => ({ name, isSystem: true }));

export function RolesPage(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Roles & Permissions</h1>
        <p className="text-sm text-gray-500 mt-1">Platform role management</p>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-700">System Roles ({SYSTEM_ROLES.length})</h3>
          <p className="text-xs text-gray-500 mt-0.5">System roles cannot be modified or deleted</p>
        </div>
        <div className="divide-y divide-gray-50">
          {SYSTEM_ROLES.map((role) => (
            <div key={role.name} className="px-5 py-3 flex items-center gap-3">
              <div className="p-1.5 bg-[#0B3C6D]/10 rounded">
                <Shield className="w-3.5 h-3.5 text-[#0B3C6D]" />
              </div>
              <span className="text-sm font-mono text-gray-800">{role.name}</span>
              <Lock className="w-3 h-3 text-gray-300 ml-auto" title="System role — cannot be deleted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
