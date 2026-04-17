import { apiRequest } from '@/services/api';
import type { Area } from '@/types/domain';

interface AreaApiItem {
  id: number;
  name: string;
  type: string;
  postalCode: string;
  region: string;
}

function mapAreaFromApi(item: AreaApiItem): Area {
  return {
    id: item.id,
    name: item.name,
    type: item.type,
    postalCode: item.postalCode,
    voivodeship: item.region,
  };
}

interface PaginatedAreasApiResponse {
  data: AreaApiItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListAreasParams {
  page?: number;
  limit?: number;
  region?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedAreas {
  data: Area[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function listAreas(params: ListAreasParams = {}): Promise<PaginatedAreas> {
  const query = new URLSearchParams();
  if (params.page !== undefined) query.set('page', String(params.page));
  if (params.limit !== undefined) query.set('limit', String(params.limit));
  if (params.region) query.set('region', params.region);
  if (params.sortOrder) query.set('sortOrder', params.sortOrder);
  const qs = query.toString();
  const response = await apiRequest<PaginatedAreasApiResponse>(
    `/areas${qs ? `?${qs}` : ''}`,
  );
  return {
    data: response.data.map(mapAreaFromApi),
    total: response.total,
    page: response.page,
    limit: response.limit,
    totalPages: response.totalPages,
  };
}

export interface CreateAreaPayload {
  name: string;
  type: string;
  postalCode: string;
  region: string;
}

export async function createArea(payload: CreateAreaPayload): Promise<Area> {
  const item = await apiRequest<AreaApiItem>('/areas', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return mapAreaFromApi(item);
}

export type UpdateAreaPayload = Partial<CreateAreaPayload>;

export async function updateArea(
  id: number,
  payload: UpdateAreaPayload,
): Promise<Area> {
  const item = await apiRequest<AreaApiItem>(`/areas/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return mapAreaFromApi(item);
}

export async function deleteArea(id: number): Promise<void> {
  await apiRequest(`/areas/${id}`, { method: 'DELETE', skipJson: true });
}
