import type { Cooperative } from '@/types/domain';
import { apiRequest } from '@/services/api';

type DashboardApiCooperativeStatus = 'ACTIVE' | 'IN_PROGRESS' | 'PLANNED' | 'PAUSED';

interface DashboardApiCooperative {
  id: number;
  name: string;
  address: string;
  region: string;
  ratedPower: number;
  installedPower: number | null;
  status: DashboardApiCooperativeStatus;
}

interface DashboardApiStats {
  cooperatives: number;
  users: number;
  areas: number;
  totalInstalledPowerKW: number;
  cooperativesByRegion: Array<{
    region: string;
    count: number;
  }>;
  recentCooperatives: DashboardApiCooperative[];
  usersByActivityStatus: {
    aktywni: number;
    nieaktywni: number;
    rejestrowani: number;
  };
}

export interface DashboardStats {
  cooperatives: number;
  users: number;
  areas: number;
  totalInstalledPowerKW: number;
  cooperativesByRegion: Array<{
    region: string;
    count: number;
  }>;
  recentCooperatives: Cooperative[];
  usersByActivityStatus: {
    active: number;
    inactive: number;
    registering: number;
  };
}

function mapStatusFromApi(status: DashboardApiCooperativeStatus): Cooperative['status'] {
  if (status === 'ACTIVE') return 'aktywna';
  if (status === 'IN_PROGRESS') return 'w trakcie tworzenia';
  if (status === 'PAUSED') return 'zawieszona';
  return 'planowana';
}

function mapCooperativeFromApi(item: DashboardApiCooperative): Cooperative {
  return {
    id: item.id,
    name: item.name,
    address: item.address,
    voivodeship: item.region,
    status: mapStatusFromApi(item.status),
    caregiverId: null,
    plannedPower: item.ratedPower,
    installedPower: item.installedPower ?? 0,
    members: [],
  };
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const response = await apiRequest<DashboardApiStats>('/dashboard');
  return {
    cooperatives: response.cooperatives,
    users: response.users,
    areas: response.areas,
    totalInstalledPowerKW: response.totalInstalledPowerKW,
    cooperativesByRegion: response.cooperativesByRegion,
    recentCooperatives: response.recentCooperatives.map(mapCooperativeFromApi),
    usersByActivityStatus: {
      active: response.usersByActivityStatus?.aktywni ?? 0,
      inactive: response.usersByActivityStatus?.nieaktywni ?? 0,
      registering: response.usersByActivityStatus?.rejestrowani ?? 0,
    },
  };
}
