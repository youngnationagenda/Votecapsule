import React from 'react';
import { Wrench } from 'lucide-react';

export function ConfigurationPage(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Configuration</h1>
        <p className="text-sm text-gray-500 mt-1">Global platform settings and feature flags</p>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center shadow-sm">
        <Wrench className="w-10 h-10 text-[#0B3C6D] mx-auto mb-3" />
        <p className="text-gray-700 font-medium">Configuration panel coming in Phase 2</p>
        <p className="text-sm text-gray-500 mt-1">
          Platform-wide configuration management including feature flags,
          election windows, and service settings.
        </p>
      </div>
    </div>
  );
}
