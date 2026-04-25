import type { To } from 'react-router-dom';

const num = (v: unknown): number | null => {
  if (typeof v === 'number' && Number.isInteger(v) && v > 0) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    if (Number.isInteger(n) && n > 0) return n;
  }
  return null;
};

/**
 * Kierunek nawigacji po kliknięciu powiadomienia (type + payload z API).
 * Dostosuj pod konkretne typy, gdy backend ustali kontrakt `payload`.
 */
export function getNotificationPath(
  type: string,
  payload: Record<string, unknown>,
): To {
  const coopId = num(payload['cooperativeId'] ?? payload['coopId']);
  const t = type.toUpperCase();

  if (t.includes('SALES') || t.includes('PLAN') || t.includes('TARGET')) {
    if (t.includes('MY') || t.includes('OPIEKUN')) {
      return '/my-plan';
    }
    return '/sales-plans';
  }

  if (t.includes('MAP') || t.includes('POINT') || t.includes('MIEJSCE')) {
    if (coopId) return { pathname: '/mapa', search: `?linkCoop=${coopId}` };
    return '/mapa';
  }

  if (t.includes('COOPERATIVE') || t.includes('MEMBER') || t.includes('SPÓŁ') || t.includes('SPOŁ')) {
    if (coopId) {
      return { pathname: '/my-cooperatives' };
    }
    return '/spoldzielnie';
  }

  if (t.includes('USER') || t.includes('KONT') || t.includes('ACCOUNT')) {
    return '/users-management';
  }

  return '/dashboard';
}

/** Wizualne „ważne” (czerwony akcent) — dopisz typy z backendu. */
export function isHighPriorityNotificationType(type: string): boolean {
  const t = type.toUpperCase();
  if (t.includes('SALES') && t.includes('TARGET')) return true;
  if (t.includes('NEW_') && t.includes('PLAN')) return true;
  if (t.includes('URGENT') || t.includes('ALERT')) return true;
  return false;
}
