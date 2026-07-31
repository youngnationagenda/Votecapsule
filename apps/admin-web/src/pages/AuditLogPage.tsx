import React from 'react';
import { FileText } from 'lucide-react';

export function AuditLogPage(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
        <p className="text-sm text-gray-500 mt-1">Comprehensive platform activity record</p>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center shadow-sm">
        <FileText className="w-10 h-10 text-[#0B3C6D] mx-auto mb-3" />
        <p className="text-gray-700 font-medium">Audit trail active</p>
        <p className="text-sm text-gray-500 mt-1">
          Authentication events are logged to the database.
          Full audit log viewer with filtering integrates with the Audit Service (future phase).
        </p>
      </div>
    </div>
  );
}
