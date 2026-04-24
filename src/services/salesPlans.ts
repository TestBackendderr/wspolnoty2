import { apiRequest } from '@/services/api';

/** Odpowiada backendowi — wpis w tablicy planned | realized */
export interface SalesPlanEntryApi {
  id: string;
  name: string;
  ppeAddress: string;
  nip?: string | null;
  plannedTurnover: number;
  plannedInstallPower: number;
  existingInstallPower: number;
  plannedStoragePower: number;
  existingStoragePower: number;
  createdAt: string;
  notes?: SalesPlanNoteApi[] | null;
}

export interface SalesPlanNoteApi {
  id: string;
  text: string;
  createdAt: string;
}

export interface SalesPlanApiModel {
  cooperativeId: number;
  quarterYear: string;
  targetKWh: number;
  planned: SalesPlanEntryApi[];
  realized: SalesPlanEntryApi[];
}

export interface ListSalesPlansParams {
  quarterYear: string;
  cooperativeIds?: number[];
}

export interface CreateSalesPlanPayload {
  cooperativeId: number;
  quarterYear: string;
}

export type SalesPlanEntryKind = 'planned' | 'realized';

export interface PlanNoteInputPayload {
  id?: string;
  text: string;
  createdAt?: string;
}

export interface CreateSalesPlanEntryPayload {
  kind: SalesPlanEntryKind;
  name: string;
  ppeAddress: string;
  nip?: string;
  plannedTurnover: number;
  plannedInstallPower: number;
  existingInstallPower: number;
  plannedStoragePower: number;
  existingStoragePower: number;
  createdAt: string;
  notes?: PlanNoteInputPayload[];
}

export type UpdateSalesPlanEntryPayload = Partial<CreateSalesPlanEntryPayload>;

const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuidV4(id: string): boolean {
  return UUID_V4_RE.test(id);
}

function quarterQuery(quarterYear: string): string {
  return `quarterYear=${encodeURIComponent(quarterYear)}`;
}

function buildListQuery(params: ListSalesPlansParams): string {
  const q = new URLSearchParams();
  q.set('quarterYear', params.quarterYear);
  if (params.cooperativeIds?.length) {
    q.set('cooperativeIds', params.cooperativeIds.join(','));
  }
  return q.toString();
}

function normalizePlan(raw: unknown): SalesPlanApiModel {
  const p = raw as Record<string, unknown>;
  return {
    cooperativeId: Number(p.cooperativeId),
    quarterYear: String(p.quarterYear ?? ''),
    targetKWh: Number(p.targetKWh ?? 0),
    planned: Array.isArray(p.planned) ? (p.planned as SalesPlanEntryApi[]) : [],
    realized: Array.isArray(p.realized) ? (p.realized as SalesPlanEntryApi[]) : [],
  };
}

/** Parsuje pojedynczy plan z odpowiedzi GET/PATCH/POST. */
export function parseSalesPlanResponse(raw: unknown): SalesPlanApiModel {
  return normalizePlan(raw);
}

export function normalizeSalesPlansListResponse(data: unknown): SalesPlanApiModel[] {
  if (Array.isArray(data)) {
    return data.map(normalizePlan);
  }
  if (data && typeof data === 'object' && 'items' in data && Array.isArray((data as { items: unknown }).items)) {
    return (data as { items: unknown[] }).items.map(normalizePlan);
  }
  return [];
}

export async function listSalesPlans(params: ListSalesPlansParams): Promise<unknown> {
  const qs = buildListQuery(params);
  return apiRequest<unknown>(`/sales-plans?${qs}`);
}

export async function createSalesPlanShell(payload: CreateSalesPlanPayload): Promise<unknown> {
  return apiRequest<unknown>('/sales-plans', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getSalesPlanByCooperative(
  cooperativeId: number,
  quarterYear: string,
): Promise<unknown> {
  return apiRequest<unknown>(
    `/sales-plans/cooperative/${cooperativeId}?${quarterQuery(quarterYear)}`,
  );
}

export async function updateSalesPlanTarget(
  cooperativeId: number,
  quarterYear: string,
  targetKWh: number,
): Promise<unknown> {
  return apiRequest<unknown>(
    `/sales-plans/cooperative/${cooperativeId}/target?${quarterQuery(quarterYear)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ targetKWh }),
    },
  );
}

export async function createSalesPlanEntry(
  cooperativeId: number,
  quarterYear: string,
  payload: CreateSalesPlanEntryPayload,
): Promise<unknown> {
  return apiRequest<unknown>(
    `/sales-plans/cooperative/${cooperativeId}/entries?${quarterQuery(quarterYear)}`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
}

export async function updateSalesPlanEntry(
  cooperativeId: number,
  quarterYear: string,
  entryId: string,
  payload: UpdateSalesPlanEntryPayload,
): Promise<unknown> {
  return apiRequest<unknown>(
    `/sales-plans/cooperative/${cooperativeId}/entries/${encodeURIComponent(entryId)}?${quarterQuery(quarterYear)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  );
}

export async function deleteSalesPlanEntry(
  cooperativeId: number,
  quarterYear: string,
  entryId: string,
): Promise<unknown> {
  return apiRequest<unknown>(
    `/sales-plans/cooperative/${cooperativeId}/entries/${encodeURIComponent(entryId)}?${quarterQuery(quarterYear)}`,
    { method: 'DELETE' },
  );
}

/** Notatki do API: tylko UUID jako id istniejącej; inaczej nowa notatka (same `text`). */
export function mapNotesToApiPayload(notes: Array<{ id: string; text: string; createdAt: string }>): PlanNoteInputPayload[] {
  return notes.map((n) => {
    if (isUuidV4(n.id)) {
      const iso = noteCreatedAtToIso(n.createdAt);
      return iso ? { id: n.id, text: n.text, createdAt: iso } : { id: n.id, text: n.text };
    }
    return { text: n.text };
  });
}

function noteCreatedAtToIso(displayOrIso: string): string | undefined {
  const t = displayOrIso.trim();
  if (/^\d{4}-\d{2}-\d{2}T/.test(t)) return t;
  return undefined;
}
