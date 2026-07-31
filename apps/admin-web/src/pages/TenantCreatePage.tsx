/**
 * Vote Capsule™ Admin Portal — Create Tenant Page
 */

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { tenantApi } from '../api/tenantApi';
import { geographyApi } from '../api/geographyApi';
import { TenantType } from '@vote-capsule/types';
import { useAppDispatch } from '../store/hooks';
import { addToast } from '../store/slices/uiSlice';

const TENANT_TYPES = [
  { value: TenantType.ELECTION_AUTHORITY, label: 'Election Authority' },
  { value: TenantType.POLITICAL_PARTY, label: 'Political Party' },
  { value: TenantType.OBSERVER, label: 'Observer Organization' },
  { value: TenantType.MEDIA, label: 'Media Organization' },
  { value: TenantType.INDEPENDENT_CANDIDATE, label: 'Independent Candidate' },
  { value: TenantType.CIVIL_SOCIETY, label: 'Civil Society Organization' },
  { value: TenantType.GOVERNMENT_AGENCY, label: 'Government Agency' },
];

export function TenantCreatePage(): React.JSX.Element {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  // Real county data from Geography Service (NEC)
  const { data: counties, isLoading: countiesLoading } = useQuery({
    queryKey: ['counties'],
    queryFn: geographyApi.getCounties,
    staleTime: 10 * 60 * 1000, // 10 min
    retry: 1,
  });

  const [formData, setFormData] = useState({
    name: '',
    type: '' as TenantType | '',
    contactEmail: '',
    contactPhone: '',
    countryCode: 'KE',
    countyCode: '', // IEBC county code — from Geography Service
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: tenantApi.create,
    onSuccess: (tenant) => {
      void queryClient.invalidateQueries({ queryKey: ['tenants'] });
      dispatch(addToast({
        type: 'success',
        title: 'Tenant Created',
        message: `${tenant.name} has been created successfully.`,
      }));
      navigate(`/tenants/${tenant.id}`);
    },
    onError: () => {
      dispatch(addToast({
        type: 'error',
        title: 'Creation Failed',
        message: 'Failed to create tenant. Please check your input and try again.',
      }));
    },
  });

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors['name'] = 'Organization name is required';
    if (!formData.type) newErrors['type'] = 'Organization type is required';
    if (formData.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
      newErrors['contactEmail'] = 'Invalid email address';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!validate()) return;
      mutation.mutate({
        name: formData.name,
        type: formData.type as TenantType,
        contactEmail: formData.contactEmail || undefined,
        contactPhone: formData.contactPhone || undefined,
        countryCode: formData.countryCode,
      });
    },
    [formData, validate, mutation],
  );

  const handleChange = useCallback(
    (field: string, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setErrors((prev) => ({ ...prev, [field]: '' }));
    },
    [],
  );

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/tenants')}
          className="p-2 rounded-md hover:bg-gray-100 transition-colors"
          aria-label="Back to tenants"
        >
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create New Tenant</h1>
          <p className="text-sm text-gray-500">Register a new organization on the platform</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} noValidate>
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Organization Details
          </h2>

          {/* Organization Name */}
          <div>
            <label htmlFor="name" className="vc-label">Organization Name <span className="text-red-500">*</span></label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className={`vc-input ${errors['name'] ? 'border-red-300 focus:ring-red-300 focus:border-red-300' : ''}`}
              placeholder="e.g., Independent Electoral and Boundaries Commission"
              required
              aria-required="true"
              aria-describedby={errors['name'] ? 'name-error' : undefined}
            />
            {errors['name'] && (
              <p id="name-error" className="mt-1 text-xs text-red-600 flex items-center gap-1" role="alert">
                <AlertCircle className="w-3 h-3" />{errors['name']}
              </p>
            )}
          </div>

          {/* Organization Type */}
          <div>
            <label htmlFor="type" className="vc-label">Organization Type <span className="text-red-500">*</span></label>
            <select
              id="type"
              value={formData.type}
              onChange={(e) => handleChange('type', e.target.value)}
              className={`vc-input ${errors['type'] ? 'border-red-300' : ''}`}
              required
              aria-required="true"
            >
              <option value="">Select organization type…</option>
              {TENANT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            {errors['type'] && (
              <p className="mt-1 text-xs text-red-600 flex items-center gap-1" role="alert">
                <AlertCircle className="w-3 h-3" />{errors['type']}
              </p>
            )}
          </div>

          {/* Contact Email */}
          <div>
            <label htmlFor="contactEmail" className="vc-label">Contact Email</label>
            <input
              id="contactEmail"
              type="email"
              value={formData.contactEmail}
              onChange={(e) => handleChange('contactEmail', e.target.value)}
              className={`vc-input ${errors['contactEmail'] ? 'border-red-300' : ''}`}
              placeholder="contact@organization.ke"
              autoComplete="email"
            />
            {errors['contactEmail'] && (
              <p className="mt-1 text-xs text-red-600" role="alert">{errors['contactEmail']}</p>
            )}
          </div>

          {/* Contact Phone */}
          <div>
            <label htmlFor="contactPhone" className="vc-label">Contact Phone</label>
            <input
              id="contactPhone"
              type="tel"
              value={formData.contactPhone}
              onChange={(e) => handleChange('contactPhone', e.target.value)}
              className="vc-input"
              placeholder="+254200000000"
              autoComplete="tel"
            />
          </div>

          {/* Country */}
          <div>
            <label htmlFor="countryCode" className="vc-label">Country</label>
            <select
              id="countryCode"
              value={formData.countryCode}
              onChange={(e) => handleChange('countryCode', e.target.value)}
              className="vc-input"
            >
              <option value="KE">Kenya</option>
              <option value="UG">Uganda</option>
              <option value="TZ">Tanzania</option>
              <option value="RW">Rwanda</option>
            </select>
          </div>

          {/* County Dropdown — live data from Geography Service (NEC) */}
          <div>
            <label htmlFor="countyCode" className="vc-label">
              County
              <span className="ml-1 text-xs text-gray-400 font-normal">(Kenya)</span>
            </label>
            <select
              id="countyCode"
              value={formData.countyCode}
              onChange={(e) => handleChange('countyCode', e.target.value)}
              className="vc-input"
              disabled={countiesLoading}
              aria-label="Select county"
            >
              <option value="">
                {countiesLoading ? 'Loading counties…' : 'Select county (optional)'}
              </option>
              {(counties ?? []).map((county) => (
                <option key={county.iebcCode} value={county.iebcCode}>
                  {county.iebcCode} — {county.name} ({new Intl.NumberFormat('en-KE').format(county.registeredVoters)} voters)
                </option>
              ))}
            </select>
            {counties && (
              <p className="mt-1 text-xs text-gray-400">
                {counties.length} counties loaded from NEC
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 mt-5">
          <button
            type="button"
            onClick={() => navigate('/tenants')}
            className="vc-btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="vc-btn-primary"
            aria-busy={mutation.isPending}
          >
            {mutation.isPending ? 'Creating…' : 'Create Tenant'}
          </button>
        </div>
      </form>
    </div>
  );
}
