import { apiRequest } from '@/services/api';

type SortOrder = 'asc' | 'desc';

interface CalculationProfileApiItem {
  id: number;
  power: number;
  capacity: number;
  userId: number;
  createdAt: string;
  updatedAt: string;
}

interface PaginatedCalculationProfilesApiResponse {
  data: CalculationProfileApiItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ListCalculationProfilesParams {
  page?: number;
  limit?: number;
  sortOrder?: SortOrder;
}

export interface CalculationProfile {
  id: number;
  power: number;
  capacity: number;
  userId: number;
  createdAt: string;
  updatedAt: string;
}

interface CreateCalculationProfilePayload {
  power: number;
  capacity: number;
}

function mapCalculationProfileFromApi(item: CalculationProfileApiItem): CalculationProfile {
  return {
    id: item.id,
    power: item.power,
    capacity: item.capacity,
    userId: item.userId,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export async function listCalculationProfiles(
  params: ListCalculationProfilesParams = {},
): Promise<PaginatedCalculationProfilesApiResponse & { data: CalculationProfile[] }> {
  const query = new URLSearchParams();
  if (params.page !== undefined) query.set('page', String(params.page));
  if (params.limit !== undefined) query.set('limit', String(params.limit));
  if (params.sortOrder) query.set('sortOrder', params.sortOrder);

  const qs = query.toString();
  const response = await apiRequest<PaginatedCalculationProfilesApiResponse>(
    `/calculation-profiles${qs ? `?${qs}` : ''}`,
  );

  return {
    data: response.data.map(mapCalculationProfileFromApi),
    total: response.total,
    page: response.page,
    limit: response.limit,
    totalPages: response.totalPages,
  };
}

export async function listAllCalculationProfiles(limitPerPage = 50): Promise<CalculationProfile[]> {
  const all: CalculationProfile[] = [];
  let page = 1;

  while (true) {
    const result = await listCalculationProfiles({
      page,
      limit: limitPerPage,
      sortOrder: 'desc',
    });
    all.push(...result.data);
    if (page >= result.totalPages) break;
    page += 1;
  }

  return all;
}

export async function createCalculationProfile(
  payload: CreateCalculationProfilePayload,
): Promise<CalculationProfile> {
  const response = await apiRequest<CalculationProfileApiItem>('/calculation-profiles', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return mapCalculationProfileFromApi(response);
}

export async function deleteCalculationProfile(id: number): Promise<void> {
  await apiRequest(`/calculation-profiles/${id}`, { method: 'DELETE', skipJson: true });
}
