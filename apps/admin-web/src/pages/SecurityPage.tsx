import React from 'react';
import { AlertCircle, Shield } from 'lucide-react';
import { PageErrorBoundary } from '../components/PageErrorBoundary';

function SecurityPageContent(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Security</h1>
        <p className="text-sm text-gray-500 mt-1">Security events and access monitoring</p>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center shadow-sm">
        <Shield className="w-10 h-10 text-[#0B3C6D] mx-auto mb-3" />
        <p className="text-gray-700 font-medium">Security monitoring active</p>
        <p className="text-sm text-gray-500 mt-1">
          Full security event viewer integrates with Audit Service (Phase 3).
          Authentication logs are being captured in the database.
        </p>
      </div>
    </div>
  );
}

export function SecurityPage() {
  return (
    <PageErrorBoundary page="Security">
      <SecurityPageContent />
    </PageErrorBoundary>
  );
}
