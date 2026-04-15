import type { AppDatabase } from '@/types/domain';

const DB_STORAGE_KEY = 'wspolnoty_energetyczne_full_db_v15';
const AUTH_STORAGE_KEY = 'wspolnoty_auth_user_v1';

const fallbackDb: AppDatabase = {
  users: [
    {
      id: 1,
      email: 'b.wrzoskiewicz@ws-e.pl',
      password: 'admin',
      role: 'admin',
      name: 'Bartlomiej Wrzoskiewicz',
      notifications: [],
    },
    {
      id: 2,
      email: 'opiekun@ws-e.pl',
      password: 'opiekun',
      role: 'opiekun',
      name: 'Przykladowy Opiekun',
      notifications: [],
    },
  ],
  caregivers: [],
  areas: [],
  cooperatives: [],
  salesPlans: [],
};

export function readDatabase(): AppDatabase {
  const raw = localStorage.getItem(DB_STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(fallbackDb));
    return fallbackDb;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AppDatabase>;
    return {
      users: parsed.users ?? fallbackDb.users,
      caregivers: parsed.caregivers ?? [],
      areas: parsed.areas ?? [],
      cooperatives: parsed.cooperatives ?? [],
      salesPlans: parsed.salesPlans ?? [],
    };
  } catch {
    localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(fallbackDb));
    return fallbackDb;
  }
}

export function writeAuthUserId(userId: number | null): void {
  if (userId === null) {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }
  localStorage.setItem(AUTH_STORAGE_KEY, String(userId));
}

export function readAuthUserId(): number | null {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}
