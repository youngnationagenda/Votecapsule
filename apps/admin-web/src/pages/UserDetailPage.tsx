import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { usersApi } from '../api/usersApi';

export function UserDetailPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: user, isLoading } = useQuery({
    queryKey: ['user', id],
    queryFn: () => usersApi.findById(id!),
    enabled: !!id,
  });

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading user…</div>;
  if (!user) return <div className="p-8 text-center text-red-600">User not found</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/users')} className="p-2 rounded-md hover:bg-gray-100" aria-label="Back">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{user.email}</h1>
          <p className="text-sm text-gray-400 font-mono">{user.id}</p>
        </div>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div><dt className="text-gray-500">Email</dt><dd className="font-medium mt-1">{user.email}</dd></div>
          <div><dt className="text-gray-500">Status</dt><dd className="font-medium mt-1 capitalize">{user.status}</dd></div>
          <div><dt className="text-gray-500">Email Verified</dt><dd className="font-medium mt-1">{user.emailVerified ? 'Yes' : 'No'}</dd></div>
          <div><dt className="text-gray-500">Last Login</dt><dd className="font-medium mt-1">{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : '—'}</dd></div>
          <div><dt className="text-gray-500">Created</dt><dd className="font-medium mt-1">{new Date(user.createdAt).toLocaleDateString()}</dd></div>
        </dl>
      </div>
    </div>
  );
}
