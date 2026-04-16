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
}

export interface Area {
  id: number;
  type: string;
  name: string;
  postalCode: string;
  voivodeship: string;
}

export interface AppDatabase {
  users: User[];
  caregivers: User[];
  areas: Area[];
  cooperatives: Cooperative[];
  salesPlans: Array<Record<string, unknown>>;
}
