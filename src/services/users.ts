import { apiRequest } from '@/services/api';
import type { User } from '@/types/domain';

export type ApiUserRole = 'ADMIN' | 'OPIEKUN';

interface ApiUser {
  id: number;
  name: string;
  surname: string;
  email: string;
  phoneNumber: string;
  role: ApiUserRole;
  isBlocked: boolean;
  color?: string | null;
}

interface CreateUserPayload {
  name: string;
  surname: string;
  email: string;
  phoneNumber: string;
  password: string;
  /** Hex zgodny z backendem: `#RRGGBB` lub `#RRGGBBAA`. */
  color: string;
  role: ApiUserRole;
}

interface UpdateUserPayload {
  name?: string;
  surname?: string;
  email?: string;
  phoneNumber?: string;
  password?: string;
  role?: ApiUserRole;
  color?: string;
}

export function mapRoleToApi(role: User['role']): ApiUserRole {
  return role === 'admin' ? 'ADMIN' : 'OPIEKUN';
}

function mapRoleFromApi(role: ApiUserRole): User['role'] {
  return role === 'ADMIN' ? 'admin' : 'opiekun';
}

function mapUserFromApi(user: ApiUser): User {
  return {
    id: user.id,
    name: `${user.name} ${user.surname}`.trim(),
    email: user.email,
    phone: user.phoneNumber,
    password: '',
    role: mapRoleFromApi(user.role),
    isBlocked: user.isBlocked,
    color: user.color ?? undefined,
    notifications: [],
  };
}

export async function createUser(payload: CreateUserPayload): Promise<User> {
  const response = await apiRequest<ApiUser>('/user', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return mapUserFromApi(response);
}

export async function getUserById(id: number): Promise<User> {
  const response = await apiRequest<ApiUser>(`/user/${id}`, { method: 'GET' });
  return mapUserFromApi(response);
}

export async function updateUser(id: number, payload: UpdateUserPayload): Promise<User> {
  const response = await apiRequest<ApiUser>(`/user/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return mapUserFromApi(response);
}

export async function deleteUser(id: number): Promise<void> {
  await apiRequest(`/user/${id}`, { method: 'DELETE', skipJson: true });
}

export async function blockUser(id: number): Promise<void> {
  await apiRequest(`/user/${id}/block`, { method: 'PATCH', skipJson: true });
}

export async function unblockUser(id: number): Promise<void> {
  await apiRequest(`/user/${id}/unblock`, { method: 'PATCH', skipJson: true });
}

export interface ListUsersParams {
  page?: number;
  limit?: number;
  role?: ApiUserRole;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedUsers {
  data: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface PaginatedApiResponse {
  data: ApiUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function listUsers(params: ListUsersParams = {}): Promise<PaginatedUsers> {
  const query = new URLSearchParams();
  if (params.page !== undefined) query.set('page', String(params.page));
  if (params.limit !== undefined) query.set('limit', String(params.limit));
  if (params.role) query.set('role', params.role);
  if (params.sortOrder) query.set('sortOrder', params.sortOrder);

  const qs = query.toString();
  const response = await apiRequest<PaginatedApiResponse>(`/user${qs ? `?${qs}` : ''}`);
  return {
    data: response.data.map(mapUserFromApi),
    total: response.total,
    page: response.page,
    limit: response.limit,
    totalPages: response.totalPages,
  };
}

/** Loads every user via repeated paginated GET /user calls (no GET /user/:id probing). */
export async function listAllUsers(limitPerPage = 100): Promise<User[]> {
  const all: User[] = [];
  let page = 1;

  while (true) {
    const result = await listUsers({ page, limit: limitPerPage, sortOrder: 'desc' });
    all.push(...result.data);
    if (page >= result.totalPages) break;
    page += 1;
  }

  return all;
}
