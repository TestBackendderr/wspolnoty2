import { apiRequest } from '@/services/api';
import type { User } from '@/types/domain';

type ApiUserRole = 'ADMIN' | 'OPIEKUN';

interface ApiUser {
  id: number;
  name: string;
  surname: string;
  email: string;
  phoneNumber: string;
  role: ApiUserRole;
  isBlocked: boolean;
}

interface CreateUserPayload {
  name: string;
  surname: string;
  email: string;
  phoneNumber: string;
  password: string;
  role: ApiUserRole;
}

interface UpdateUserPayload {
  name?: string;
  surname?: string;
  email?: string;
  phoneNumber?: string;
  password?: string;
  role?: ApiUserRole;
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

export async function listUsersFromBackend(maxProbe = 500, maxMisses = 40): Promise<User[]> {
  const users: User[] = [];
  let misses = 0;
  let id = 1;

  while (id <= maxProbe && misses < maxMisses) {
    try {
      const user = await getUserById(id);
      users.push(user);
      misses = 0;
    } catch {
      misses += 1;
    }
    id += 1;
  }

  return users;
}
