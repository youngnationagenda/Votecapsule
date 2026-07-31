import { identityClient } from './apiClient';
import { PaginatedResponse, PaginationQuery } from '@vote-capsule/types';

export interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
}

export const usersApi = {
  findAll: async (params?: PaginationQuery): Promise<PaginatedResponse<User>> => {
    const { data } = await identityClient.get('/users', { params });
    return (data.data ?? data) as PaginatedResponse<User>;
  },

  findById: async (id: string): Promise<User> => {
    const { data } = await identityClient.get(`/users/${id}`);
    return (data.data ?? data) as User;
  },

  update: async (id: string, payload: { status?: string }): Promise<User> => {
    const { data } = await identityClient.patch(`/users/${id}`, payload);
    return (data.data ?? data) as User;
  },
};
