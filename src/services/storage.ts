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
      phone: '',
      isBlocked: false,
      notifications: [],
    },
    {
      id: 2,
      email: 'opiekun@ws-e.pl',
      password: 'opiekun',
      role: 'opiekun',
      name: 'Przykladowy Opiekun',
      phone: '',
      isBlocked: false,
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
    const normalizedUsers = (parsed.users ?? fallbackDb.users).map((user) => ({
      ...user,
      phone: user.phone ?? '',
      isBlocked: user.isBlocked ?? false,
    }));
    const normalizedCaregivers = (parsed.caregivers ?? []).map((caregiver) => ({
      ...caregiver,
      phone: caregiver.phone ?? '',
      isBlocked: caregiver.isBlocked ?? false,
    }));
    const normalizedAreas = (parsed.areas ?? []).map((area) => ({
      id: area.id,
      name: area.name,
      voivodeship: area.voivodeship,
      type: (area as { type?: string }).type ?? '',
      postalCode: (area as { postalCode?: string }).postalCode ?? '',
    }));
    const userIds = new Set(normalizedUsers.map((u) => u.id));
    const mergedUsers = [...normalizedUsers];
    normalizedCaregivers.forEach((c) => {
      if (!userIds.has(c.id)) {
        mergedUsers.push(c);
      }
    });

    return {
      users: mergedUsers,
      caregivers: normalizedCaregivers,
      areas: normalizedAreas,
      cooperatives: parsed.cooperatives ?? [],
      salesPlans: parsed.salesPlans ?? [],
    };
  } catch {
    localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(fallbackDb));
    return fallbackDb;
  }
}

export function writeDatabase(db: AppDatabase): void {
  localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(db));
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
