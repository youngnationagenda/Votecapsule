import React from 'react';
import { Settings } from 'lucide-react';
import { useAppSelector } from '../store/hooks';
import { PageErrorBoundary } from '../components/PageErrorBoundary';

function SettingsPageContent(): React.JSX.Element {
  const user = useAppSelector((state) => state.auth.user);
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Your account settings</p>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Account Information</h3>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-500">Email</dt>
            <dd className="font-medium text-gray-900">{user?.email ?? '—'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Role</dt>
            <dd className="font-medium text-gray-900">Platform Super Administrator</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

export function SettingsPage() {
  return (
    <PageErrorBoundary page="Settings">
      <SettingsPageContent />
    </PageErrorBoundary>
  );
}
