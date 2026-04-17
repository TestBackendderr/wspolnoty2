import { apiRequest } from '@/services/api';
import type { Cooperative, CooperativeHistoryItem } from '@/types/domain';

export type CooperativeApiStatus = 'ACTIVE' | 'IN_PROGRESS' | 'PLANNED' | 'PAUSED';

interface CooperativeCreatedBy {
  id: number;
  name: string;
  surname: string;
}

export type { CooperativeHistoryItem } from '@/types/domain';

interface CooperativesApiItem {
  id: number;
  name: string;
  address: string;
  region: string;
  ratedPower: number;
  installedPower: number | null;
  status: CooperativeApiStatus;
  createdBy?: CooperativeCreatedBy;
  createdAt?: string;
  updatedAt?: string;
  history?: CooperativeHistoryItem[];
}

interface PaginatedCooperativesResponse {
  data: CooperativesApiItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
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
  status?: CooperativeApiStatus;
}

export interface ListCooperativesParams {
  page?: number;
  limit?: number;
  status?: CooperativeApiStatus;
  region?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedCooperatives {
  data: Cooperative[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function mapStatusFromApi(status: CooperativeApiStatus): Cooperative['status'] {
  if (status === 'ACTIVE') return 'aktywna';
  if (status === 'IN_PROGRESS') return 'w trakcie tworzenia';
  if (status === 'PAUSED') return 'zawieszona';
  return 'planowana';
}

export function mapStatusToApi(status: Cooperative['status']): CooperativeApiStatus {
  if (status === 'aktywna') return 'ACTIVE';
  if (status === 'w trakcie tworzenia') return 'IN_PROGRESS';
  if (status === 'zawieszona') return 'PAUSED';
  return 'PLANNED';
}

/** Labels used in tables/forms — same strings as `Cooperative.status` after `mapStatusFromApi`. */
const STATUS_API_LABEL_IN_MESSAGE: Record<CooperativeApiStatus, string> = {
  ACTIVE: 'Aktywna',
  IN_PROGRESS: 'W trakcie tworzenia',
  PLANNED: 'Planowana',
  PAUSED: 'Zawieszona',
};

/**
 * Rewrites backend history strings: quoted enum values → project display labels
 * (e.g. status: "ACTIVE" → "PLANNED" → status: "aktywna" → "planowana").
 */
export function formatCooperativeHistoryMessage(message: string): string {
  let result = message;
  const entries = Object.entries(STATUS_API_LABEL_IN_MESSAGE) as [CooperativeApiStatus, string][];
  entries.sort((a, b) => b[0].length - a[0].length);
  for (const [api, label] of entries) {
    result = result.replaceAll(`"${api}"`, `"${label}"`);
  }
  return result;
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
    history: item.history,
  };
}

export async function listCooperatives(params: ListCooperativesParams = {}): Promise<PaginatedCooperatives> {
  const query = new URLSearchParams();
  if (params.page !== undefined) query.set('page', String(params.page));
  if (params.limit !== undefined) query.set('limit', String(params.limit));
  if (params.status) query.set('status', params.status);
  if (params.region) query.set('region', params.region);
  if (params.sortOrder) query.set('sortOrder', params.sortOrder);

  const qs = query.toString();
  const response = await apiRequest<PaginatedCooperativesResponse>(`/cooperatives${qs ? `?${qs}` : ''}`);
  return {
    data: response.data.map(mapCooperativeFromApi),
    total: response.total,
    page: response.page,
    limit: response.limit,
    totalPages: response.totalPages,
  };
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

/** Loads every cooperative via repeated paginated GET /cooperatives calls. */
export async function listAllCooperatives(limitPerPage = 100): Promise<Cooperative[]> {
  const all: Cooperative[] = [];
  let page = 1;

  while (true) {
    const result = await listCooperatives({ page, limit: limitPerPage, sortOrder: 'desc' });
    all.push(...result.data);
    if (page >= result.totalPages) break;
    page += 1;
  }

  return all;
}
