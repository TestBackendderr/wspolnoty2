import type { User } from '@/types/domain';
import { ApiError, apiRequest } from '@/services/api';

export class BlockedAccountError extends Error {
  constructor() {
    super('BLOCKED_ACCOUNT');
    this.name = 'BlockedAccountError';
    Object.setPrototypeOf(this, BlockedAccountError.prototype);
  }
}

function isBlockedLoginMessage(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('blocked') ||
    normalized.includes('zablokow') ||
    normalized.includes('заблок')
  );
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface VerifyResetCodePayload {
  email: string;
  code: string;
}

export interface ResetPasswordPayload {
  resetToken: string;
  newPassword: string;
}

interface VerifyResetCodeResponse {
  resetToken: string;
}

interface AuthUserResponse {
  id: number;
  name: string;
  surname?: string;
  email: string;
  phoneNumber?: string;
  role: string;
  isBlocked?: boolean;
  color?: string | null;
}

function mapRole(role: string): User['role'] {
  const normalized = role.toLowerCase();
  if (normalized === 'admin') return 'admin';
  return 'opiekun';
}

function mapAuthUser(response: AuthUserResponse): User {
  return {
    id: response.id,
    name: [response.name, response.surname].filter(Boolean).join(' ').trim() || response.name,
    email: response.email,
    phone: response.phoneNumber ?? '',
    role: mapRole(response.role),
    password: '',
    isBlocked: Boolean(response.isBlocked),
    color: response.color ?? undefined,
    notifications: [],
  };
}

async function requestMe(): Promise<User> {
  const user = await apiRequest<AuthUserResponse>('/auth/me', { method: 'GET' });
  return mapAuthUser(user);
}

export async function login(payload: LoginPayload): Promise<User | null> {
  try {
    const user = await apiRequest<AuthUserResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: payload.email.trim(),
        password: payload.password,
      }),
    });
    return mapAuthUser(user);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      if (isBlockedLoginMessage(error.message)) {
        throw new BlockedAccountError();
      }
      return null;
    }
    throw error;
  }
}

export async function logout(): Promise<void> {
  try {
    await apiRequest('/auth/logout', { method: 'POST', skipJson: true });
  } catch {
    // Ignore logout errors on client cleanup.
  }
}

export async function refreshAuth(): Promise<boolean> {
  try {
    await apiRequest('/auth/refresh', { method: 'POST' });
    return true;
  } catch {
    return false;
  }
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    return await requestMe();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      const refreshed = await refreshAuth();
      if (!refreshed) return null;
      try {
        return await requestMe();
      } catch {
        return null;
      }
    }
    return null;
  }
}

export async function forgotPassword(payload: ForgotPasswordPayload): Promise<void> {
  await apiRequest('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({
      email: payload.email.trim(),
    }),
    skipJson: true,
  });
}

export async function verifyResetCode(payload: VerifyResetCodePayload): Promise<string> {
  const response = await apiRequest<VerifyResetCodeResponse>('/auth/verify-reset-code', {
    method: 'POST',
    body: JSON.stringify({
      email: payload.email.trim(),
      code: payload.code.trim(),
    }),
  });
  return response.resetToken;
}

export async function resetPassword(payload: ResetPasswordPayload): Promise<void> {
  await apiRequest('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({
      resetToken: payload.resetToken,
      newPassword: payload.newPassword,
    }),
    skipJson: true,
  });
}
