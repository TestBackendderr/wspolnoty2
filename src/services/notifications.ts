import { apiRequest } from '@/services/api';

/** Odpowiedź `GET /notifications` (zgodna z paginacją Nest). */
export interface NotificationFromApi {
  id: string;
  type: string;
  title: string;
  body: string;
  payload: Record<string, unknown>;
  readAt: string | null;
  userId: number;
  createdAt: string;
}

export interface ListNotificationsResult {
  data: NotificationFromApi[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListNotificationsParams {
  page?: number;
  limit?: number;
  /** Tylko `readAt === null` */
  unreadOnly?: boolean;
}

export async function listNotifications(
  params: ListNotificationsParams = {},
): Promise<ListNotificationsResult> {
  const q = new URLSearchParams();
  q.set('page', String(params.page ?? 1));
  q.set('limit', String(params.limit ?? 20));
  if (params.unreadOnly) q.set('unreadOnly', 'true');
  return apiRequest<ListNotificationsResult>(`/notifications?${q.toString()}`);
}

/** Szybki podgląd liczby nieprzeczytanych: `total` z pierwszej strony. */
export async function fetchUnreadNotificationsTotal(): Promise<number> {
  const r = await listNotifications({ page: 1, limit: 1, unreadOnly: true });
  return r.total;
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiRequest(`/notifications/${encodeURIComponent(id)}/read`, {
    method: 'PATCH',
    skipJson: true,
  });
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiRequest('/notifications/read-all', { method: 'POST', skipJson: true });
}
