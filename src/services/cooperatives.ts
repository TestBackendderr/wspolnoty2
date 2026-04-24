import { apiRequest } from '@/services/api';
import type { Cooperative, CooperativeHistoryItem } from '@/types/domain';
import { toApiRegion, toDisplayRegion } from '@/utils/regions';

export type CooperativeApiStatus = 'ACTIVE' | 'IN_PROGRESS' | 'PLANNED' | 'PAUSED';

interface CooperativeCreatedBy {
  id: number;
  name: string;
  surname: string;
}

export type { CooperativeHistoryItem } from '@/types/domain';

/** API `MemberStatus` (Prisma). */
export type CooperativeMemberStatusApi = 'AKTYWNY' | 'NIEAKTYWNY';

export interface CooperativeMemberFormInput {
  fullName: string;
  ppeAddress: string;
  nip: string;
  plannedInstallationPower: string;
  existingInstallationPower: string;
  plannedStoragePower: string;
  existingStoragePower: string;
  joinDate: string;
  note: string;
  status: 'aktywny' | 'nieaktywny';
}

/** Body shape aligned with `CooperativeMemberInputDto`. */
export interface CooperativeMemberApiPayload {
  name: string;
  ppeAddress: string;
  nip?: string;
  plannedInstallationPowerKwp?: number;
  existingInstallationPowerKwp?: number;
  plannedEnergyStoragePowerKwp?: number;
  existingEnergyStoragePowerKwp?: number;
  status?: CooperativeMemberStatusApi;
  joinOrRegistrationDate: string;
  note?: string;
}

export function cooperativeMemberFormToPayload(
  m: CooperativeMemberFormInput,
): CooperativeMemberApiPayload {
  const parseOptNum = (v: string): number | undefined => {
    const t = v.trim();
    if (t === '') return undefined;
    const n = Number(t);
    return Number.isFinite(n) ? n : undefined;
  };
  const nip = m.nip.trim();
  const note = m.note.trim();
  const plannedInstallationPowerKwp = parseOptNum(m.plannedInstallationPower);
  const existingInstallationPowerKwp = parseOptNum(m.existingInstallationPower);
  const plannedEnergyStoragePowerKwp = parseOptNum(m.plannedStoragePower);
  const existingEnergyStoragePowerKwp = parseOptNum(m.existingStoragePower);
  return {
    name: m.fullName.trim(),
    ppeAddress: m.ppeAddress.trim(),
    ...(nip ? { nip } : {}),
    ...(plannedInstallationPowerKwp !== undefined ? { plannedInstallationPowerKwp } : {}),
    ...(existingInstallationPowerKwp !== undefined ? { existingInstallationPowerKwp } : {}),
    ...(plannedEnergyStoragePowerKwp !== undefined ? { plannedEnergyStoragePowerKwp } : {}),
    ...(existingEnergyStoragePowerKwp !== undefined ? { existingEnergyStoragePowerKwp } : {}),
    status: m.status === 'aktywny' ? 'AKTYWNY' : 'NIEAKTYWNY',
    joinOrRegistrationDate: m.joinDate,
    ...(note ? { note } : {}),
  };
}

/** Map domain members to the form shape used in UI (map + spółdzielnie modals). */
export function cooperativeDomainMembersToForms(
  members: Cooperative['members'],
): CooperativeMemberFormInput[] {
  return (members ?? []).map((m) => ({
    fullName: m.fullName,
    ppeAddress: m.ppeAddress ?? '',
    nip: m.nip ?? '',
    plannedInstallationPower:
      m.plannedInstallationPowerKwp != null ? String(m.plannedInstallationPowerKwp) : '',
    existingInstallationPower:
      m.existingInstallationPowerKwp != null ? String(m.existingInstallationPowerKwp) : '',
    plannedStoragePower:
      m.plannedEnergyStoragePowerKwp != null ? String(m.plannedEnergyStoragePowerKwp) : '',
    existingStoragePower:
      m.existingEnergyStoragePowerKwp != null ? String(m.existingEnergyStoragePowerKwp) : '',
    joinDate: m.joinOrRegistrationDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    note: m.note ?? '',
    status: m.status,
  }));
}

export function memberListFormsToSortedPayloads(
  members: CooperativeMemberFormInput[],
): CooperativeMemberApiPayload[] {
  return members
    .filter((m) => m.fullName.trim() && m.ppeAddress.trim())
    .map((m) => cooperativeMemberFormToPayload(m))
    .sort((a, b) => `${a.name}\0${a.ppeAddress}`.localeCompare(`${b.name}\0${b.ppeAddress}`, 'pl'));
}

type CooperativesApiMember =
  | {
      id: number;
      cooperativeId?: number;
      name: string;
      ppeAddress: string;
      nip?: string | null;
      plannedInstallationPowerKwp?: number | null;
      existingInstallationPowerKwp?: number | null;
      plannedEnergyStoragePowerKwp?: number | null;
      existingEnergyStoragePowerKwp?: number | null;
      status: string;
      joinOrRegistrationDate?: string;
      note?: string | null;
    }
  | {
      userId: number;
      cooperativeId: number;
      status: string;
      createdAt: string;
      user: { id: number; name: string; surname: string };
    };

function isLegacyCooperativeMember(
  m: CooperativesApiMember,
): m is Extract<CooperativesApiMember, { userId: number }> {
  return 'user' in m && m.user != null;
}

function mapMemberStatusFromApi(status: string): Cooperative['members'][number]['status'] {
  return status === 'AKTYWNY' ? 'aktywny' : 'nieaktywny';
}

function mapCooperativeMemberFromApi(m: CooperativesApiMember): Cooperative['members'][number] {
  if (isLegacyCooperativeMember(m)) {
    return {
      id: m.userId,
      fullName: `${m.user.name} ${m.user.surname}`.trim(),
      status: mapMemberStatusFromApi(m.status),
    };
  }
  const join = m.joinOrRegistrationDate;
  return {
    id: m.id,
    fullName: m.name,
    ppeAddress: m.ppeAddress,
    nip: m.nip ?? null,
    plannedInstallationPowerKwp: m.plannedInstallationPowerKwp ?? null,
    existingInstallationPowerKwp: m.existingInstallationPowerKwp ?? null,
    plannedEnergyStoragePowerKwp: m.plannedEnergyStoragePowerKwp ?? null,
    existingEnergyStoragePowerKwp: m.existingEnergyStoragePowerKwp ?? null,
    status: mapMemberStatusFromApi(m.status),
    joinOrRegistrationDate: join
      ? typeof join === 'string'
        ? join
        : new Date(join as unknown as string).toISOString()
      : undefined,
    note: m.note ?? null,
  };
}

interface CooperativesApiItem {
  id: number;
  name: string;
  address: string;
  region: string;
  ratedPower: number;
  installedPower: number | null;
  boardName?: string;
  boardEmail?: string;
  boardPhone?: string;
  status: CooperativeApiStatus;
  supervisorId?: number;
  createdById?: number;
  createdBy?: CooperativeCreatedBy;
  supervisor?: {
    id: number;
    name: string;
    surname: string;
    email: string;
    phoneNumber: string;
  };
  areas?: Array<{
    id: number;
    name: string;
    region: string;
  }>;
  registrationDate?: string | null;
  members?: CooperativesApiMember[];
  mapPoint?: MapPointData | null;
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

export interface MapPointInput {
  name: string;
  lat: number;
  lng: number;
  voivodeshipId: string;
  voivodeshipLabel: string;
}

export interface MapPointData extends MapPointInput {
  id: number;
  createdAt: string;
  updatedAt: string;
}

interface CreateCooperativePayload {
  name: string;
  address: string;
  region: string;
  ratedPower: number;
  installedPower?: number;
  boardName: string;
  boardEmail: string;
  boardPhone: string;
  supervisorId: number;
  registrationDate: string;
  areaIds?: number[];
  members?: CooperativeMemberApiPayload[];
  mapPoint?: MapPointInput;
}

interface UpdateCooperativePayload {
  name?: string;
  address?: string;
  region?: string;
  ratedPower?: number;
  installedPower?: number;
  boardName?: string;
  boardEmail?: string;
  boardPhone?: string;
  supervisorId?: number;
  registrationDate?: string;
  status?: CooperativeApiStatus;
  areaIds?: number[];
  members?: CooperativeMemberApiPayload[];
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
    voivodeship: toDisplayRegion(item.region),
    status: mapStatusFromApi(item.status),
    caregiverId: item.supervisorId ?? null,
    plannedPower: item.ratedPower,
    installedPower: item.installedPower ?? 0,
    boardName: item.boardName,
    boardEmail: item.boardEmail,
    boardPhone: item.boardPhone,
    supervisorId: item.supervisorId ?? null,
    createdById: item.createdById ?? null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    createdBy: item.createdBy,
    supervisor: item.supervisor,
    registrationDate: item.registrationDate ?? undefined,
    areas: (item.areas ?? []).map((area) => ({
      ...area,
      region: toDisplayRegion(area.region),
    })),
    members: (item.members ?? []).map(mapCooperativeMemberFromApi),
    mapPoint: item.mapPoint ?? null,
    history: item.history,
  };
}

export async function listCooperatives(params: ListCooperativesParams = {}): Promise<PaginatedCooperatives> {
  const query = new URLSearchParams();
  if (params.page !== undefined) query.set('page', String(params.page));
  if (params.limit !== undefined) query.set('limit', String(params.limit));
  if (params.status) query.set('status', params.status);
  if (params.region) query.set('region', toApiRegion(params.region));
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
  const body = {
    ...payload,
    region: toApiRegion(payload.region),
  };
  const response = await apiRequest<CooperativesApiItem>('/cooperatives', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return mapCooperativeFromApi(response);
}

export async function updateCooperative(
  id: number,
  payload: UpdateCooperativePayload,
): Promise<Cooperative> {
  const body = payload.region ? { ...payload, region: toApiRegion(payload.region) } : payload;
  const response = await apiRequest<CooperativesApiItem>(`/cooperatives/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return mapCooperativeFromApi(response);
}

export async function deleteCooperative(id: number): Promise<void> {
  await apiRequest(`/cooperatives/${id}`, { method: 'DELETE', skipJson: true });
}

export interface MapPointWithCoopId {
  id: number;
  name: string;
  lat: number;
  lng: number;
  voivodeshipId: string;
  voivodeshipLabel: string;
  cooperativeId: number;
  createdAt: string;
  updatedAt: string;
  /** Kolor markera na mapie (np. kolor opiekuna). */
  color?: string;
  /** Zwracane przez backend — czy bieżący użytkownik może edytować spółdzielnię przy tym punkcie. */
  canEdit?: boolean;
}

export async function listMapPoints(): Promise<MapPointWithCoopId[]> {
  return apiRequest<MapPointWithCoopId[]>('/cooperatives/map-points');
}

/** GET /cooperatives/id-name — tylko id i nazwa; ADMIN: wszystkie, OPIEKUN: wg createdById. */
export interface CooperativeIdName {
  id: number;
  name: string;
}

export async function listCooperativesIdAndName(): Promise<CooperativeIdName[]> {
  return apiRequest<CooperativeIdName[]>('/cooperatives/id-name');
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
