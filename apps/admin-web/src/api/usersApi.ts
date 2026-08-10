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

/**
 * Unwrap an optional { success, data: <payload> } API Gateway envelope.
 * The identity service returns plain objects — this handles both shapes.
 */
function unwrap<T>(body: unknown): T {
  if (
    body !== null &&
    typeof body === 'object' &&
    'success' in (body as object) &&
    'data' in (body as object)
  ) {
    return (body as { data: T }).data;
  }
  return body as T;
}

export const usersApi = {
  findAll: async (params?: PaginationQuery): Promise<PaginatedResponse<User>> => {
    const { data } = await identityClient.get('/users', { params });
    return unwrap<PaginatedResponse<User>>(data);
  },

  findById: async (id: string): Promise<User> => {
    const { data } = await identityClient.get(`/users/${id}`);
    return unwrap<User>(data);
  },

  update: async (id: string, payload: { status?: string }): Promise<User> => {
    const { data } = await identityClient.patch(`/users/${id}`, payload);
    return unwrap<User>(data);
  },
};
