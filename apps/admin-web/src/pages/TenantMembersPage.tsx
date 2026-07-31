import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Users, UserPlus } from 'lucide-react';
import { tenantApi } from '../api/tenantApi';

export function TenantMembersPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: members, isLoading } = useQuery({
    queryKey: ['tenant-members', id],
    queryFn: () => tenantApi.getMembers(id!),
    enabled: !!id,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(`/tenants/${id}`)} className="p-2 rounded-md hover:bg-gray-100" aria-label="Back">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Tenant Members</h1>
        <button className="vc-btn-primary ml-auto flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          Add Member
        </button>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading members…</div>
        ) : (members as unknown[])?.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500">No members yet</p>
          </div>
        ) : (
          <div className="p-4">
            <p className="text-sm text-gray-600">{(members as unknown[])?.length ?? 0} member(s)</p>
          </div>
        )}
      </div>
    </div>
  );
}
