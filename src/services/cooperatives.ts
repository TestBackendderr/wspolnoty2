import { apiRequest } from '@/services/api';
import type { Cooperative } from '@/types/domain';

interface CooperativesApiItem {
  id: number;
  name: string;
  address: string;
  region: string;
  ratedPower: number;
  installedPower: number | null;
  status: 'ACTIVE' | 'IN_PROGRESS' | 'PLANNED' | 'PAUSED';
}

interface CreateCooperativePayload {
  name: string;
  address: string;
  region: string;
  ratedPower: number;
}

interface UpdateCooperativePayload {
  name?: string;
  address?: string;
  region?: string;
  ratedPower?: number;
  installedPower?: number;
  status?: 'ACTIVE' | 'IN_PROGRESS' | 'PLANNED' | 'PAUSED';
}

function mapStatusFromApi(status: CooperativesApiItem['status']): Cooperative['status'] {
  if (status === 'ACTIVE') return 'aktywna';
  if (status === 'IN_PROGRESS') return 'w trakcie tworzenia';
  if (status === 'PAUSED') return 'zawieszona';
  return 'planowana';
}

export function mapStatusToApi(status: Cooperative['status']): UpdateCooperativePayload['status'] {
  if (status === 'aktywna') return 'ACTIVE';
  if (status === 'w trakcie tworzenia') return 'IN_PROGRESS';
  if (status === 'zawieszona') return 'PAUSED';
  return 'PLANNED';
}

function mapCooperativeFromApi(item: CooperativesApiItem): Cooperative {
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

export async function listCooperatives(): Promise<Cooperative[]> {
  const response = await apiRequest<CooperativesApiItem[]>('/cooperatives', { method: 'GET' });
  return response.map(mapCooperativeFromApi);
}

export async function getCooperativeById(id: number): Promise<Cooperative> {
  const response = await apiRequest<CooperativesApiItem>(`/cooperatives/${id}`, { method: 'GET' });
  return mapCooperativeFromApi(response);
}

export async function createCooperative(payload: CreateCooperativePayload): Promise<Cooperative> {
  const response = await apiRequest<CooperativesApiItem>('/cooperatives', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return mapCooperativeFromApi(response);
}

export async function updateCooperative(
  id: number,
  payload: UpdateCooperativePayload,
): Promise<Cooperative> {
  const response = await apiRequest<CooperativesApiItem>(`/cooperatives/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return mapCooperativeFromApi(response);
}

export async function deleteCooperative(id: number): Promise<void> {
  await apiRequest(`/cooperatives/${id}`, { method: 'DELETE', skipJson: true });
}
