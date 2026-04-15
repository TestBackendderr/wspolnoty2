import { readAuthUserId, readDatabase, writeAuthUserId } from '@/services/storage';
import type { User } from '@/types/domain';

export interface LoginPayload {
  email: string;
  password: string;
}

export function login(payload: LoginPayload): User | null {
  const db = readDatabase();
  const user = db.users.find(
    (candidate) =>
      candidate.email.toLowerCase() === payload.email.toLowerCase() &&
      candidate.password === payload.password,
  );

  if (!user) {
    return null;
  }

  writeAuthUserId(user.id);
  return user;
}

export function logout(): void {
  writeAuthUserId(null);
}

export function getCurrentUser(): User | null {
  const userId = readAuthUserId();
  if (userId === null) {
    return null;
  }

  const db = readDatabase();
  return db.users.find((user) => user.id === userId) ?? null;
}
