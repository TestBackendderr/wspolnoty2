export type UserRole = 'admin' | 'caregiver' | 'opiekun';

export interface NotificationItem {
  id: number;
  type: string;
  message: string;
  timestamp: string;
  read: boolean;
  relatedId: number | null;
}

export interface User {
  id: number;
  email: string;
  password: string;
  role: UserRole;
  name: string;
  phone?: string;
  isBlocked?: boolean;
  notifications: NotificationItem[];
}

export interface CooperativeMember {
  id: number;
  fullName: string;
  status: 'aktywna' | 'w trakcie tworzenia' | 'planowana' | 'zawieszona';
}

export interface CooperativeHistoryItem {
  id: number;
  message: string;
  cooperativeId: number;
  actionById: number;
  createdAt: string;
  updatedAt?: string;
  actionBy?: { id: number; name: string; surname: string };
}

export interface Cooperative {
  id: number;
  name: string;
  address: string;
  voivodeship: string;
  status: 'aktywna' | 'w trakcie tworzenia' | 'planowana' | 'zawieszona';
  caregiverId: number | null;
  plannedPower: number;
  installedPower: number;
  members: CooperativeMember[];
  /** Filled when API returns it (e.g. list + detail). */
  history?: CooperativeHistoryItem[];
}

export interface Area {
  id: number;
  type: string;
  name: string;
  postalCode: string;
  voivodeship: string;
  responsibleUser: {
    id: number;
    name: string;
    surname: string;
    email: string;
    phoneNumber: string;
  } | null;
}

export interface VoivodeshipLead {
  voivodeshipId: string;
  caregiverId: number | null;
}

export interface VoivodeshipAssignment {
  voivodeshipId: string;
  cooperativeIds: number[];
  areaIds: number[];
}

export interface AppDatabase {
  users: User[];
  caregivers: User[];
  areas: Area[];
  cooperatives: Cooperative[];
  salesPlans: Array<Record<string, unknown>>;
  voivodeshipLeads: VoivodeshipLead[];
  voivodeshipAssignments: VoivodeshipAssignment[];
}

/** In-memory app state shape (no localStorage). Caregivers mirror users with roles opiekun/caregiver. */
export const emptyAppDatabase: AppDatabase = {
  users: [],
  caregivers: [],
  areas: [],
  cooperatives: [],
  salesPlans: [],
  voivodeshipLeads: [],
  voivodeshipAssignments: [],
};

export function appDatabaseWithSyncedCaregivers(db: AppDatabase): AppDatabase {
  return {
    ...db,
    caregivers: db.users.filter((u) => u.role === 'opiekun' || u.role === 'caregiver'),
  };
}
