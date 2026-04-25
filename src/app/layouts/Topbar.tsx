import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '@/app/providers/authContext';
import type { NotificationFromApi } from '@/services/notifications';
import {
  fetchUnreadNotificationsTotal,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/services/notifications';
import { getNotificationPath, isHighPriorityNotificationType } from '@/utils/notificationNavigation';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Pulpit',
  '/opiekunowie': 'Opiekunowie',
  '/tereny': 'Tereny',
  '/spoldzielnie': 'Spółdzielnie energetyczne',
  '/mapa': 'Mapa Polski',
  '/sales-plans': 'Plany sprzedażowe',
  '/users-management': 'Zarządzanie kontami',
  '/calculator': 'Kalkulator PV + Magazyn',
  '/my-cooperatives': 'Moje spółdzielnie',
  '/my-plan': 'Mój plan sprzedaży',
  '/profil': 'Mój profil',
};

interface TopbarProps {
  onToggleSidebar: () => void;
}

const POLL_UNREAD_MS = 45_000;
const LIST_LIMIT = 40;

type DateFilter = '7' | '30' | 'all';

function formatPlDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pl-PL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function filterByType(items: NotificationFromApi[], type: string): NotificationFromApi[] {
  if (!type) return items;
  return items.filter((n) => n.type === type);
}

function filterByDateWindow(items: NotificationFromApi[], range: DateFilter): NotificationFromApi[] {
  if (range === 'all') return items;
  const days = range === '7' ? 7 : 30;
  const cut = new Date();
  cut.setDate(cut.getDate() - days);
  return items.filter((n) => new Date(n.createdAt) >= cut);
}

function splitRecentArchive(items: NotificationFromApi[], showArchive: boolean) {
  if (!showArchive) return { recent: items, archive: [] as NotificationFromApi[] };
  const cut = new Date();
  cut.setDate(cut.getDate() - 30);
  const recent: NotificationFromApi[] = [];
  const archive: NotificationFromApi[] = [];
  for (const n of items) {
    if (new Date(n.createdAt) >= cut) recent.push(n);
    else archive.push(n);
  }
  return { recent, archive };
}

function exportNotificationsToPrintHtml(rows: NotificationFromApi[], title: string): string {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const tr = rows
    .map(
      (n) =>
        `<tr><td>${esc(n.createdAt)}</td><td>${esc(n.type)}</td><td>${esc(n.title)}</td><td>${esc(n.body)}</td><td>${n.readAt ? 'Tak' : 'Nie'}</td></tr>`,
    )
    .join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${esc(title)}</title>
    <style>body{font-family:system-ui;padding:16px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:6px;font-size:12px}th{text-align:left}</style></head>
    <body><h1>${esc(title)}</h1><table><thead><tr><th>Data</th><th>Typ</th><th>Tytuł</th><th>Treść</th><th>Przeczytane</th></tr></thead><tbody>${tr}</tbody></table>
    <p><button onclick="window.print()">Drukuj / PDF</button></p><script>window.onload=function(){/* opcjonalnie druk */}</script></body></html>`;
}

export default function Topbar({ onToggleSidebar }: TopbarProps) {
  const { currentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [listItems, setListItems] = useState<NotificationFromApi[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState('');
  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('30');
  const [showArchive, setShowArchive] = useState(false);
  const [readBusyId, setReadBusyId] = useState<string | null>(null);
  const [readAllBusy, setReadAllBusy] = useState(false);

  const isAdmin = currentUser?.role === 'admin';

  const title = pageTitles[location.pathname] ?? '';

  const refreshUnread = useCallback(async () => {
    if (!currentUser) {
      setUnreadTotal(0);
      return;
    }
    try {
      const t = await fetchUnreadNotificationsTotal();
      setUnreadTotal(t);
    } catch {
      // sieć / 401 — zostaw poprzednią wartość
    }
  }, [currentUser]);

  const loadList = useCallback(async () => {
    if (!currentUser) return;
    setListLoading(true);
    setListError('');
    try {
      const r = await listNotifications({
        page: 1,
        limit: LIST_LIMIT,
        unreadOnly: filterUnreadOnly,
      });
      setListItems(r.data);
    } catch {
      setListError('Nie udało się pobrać powiadomień.');
      setListItems([]);
    } finally {
      setListLoading(false);
    }
  }, [currentUser, filterUnreadOnly]);

  const typeOptions = useMemo(() => {
    const s = new Set<string>();
    listItems.forEach((n) => s.add(n.type));
    return Array.from(s).sort();
  }, [listItems]);

  const displayPipeline = useMemo(() => {
    let rows = listItems;
    rows = filterByType(rows, filterType);
    rows = filterByDateWindow(rows, dateFilter);
    const useArchive = showArchive && dateFilter === 'all';
    return splitRecentArchive(rows, useArchive);
  }, [dateFilter, filterType, listItems, showArchive]);

  useEffect(() => {
    if (!currentUser) return;
    void refreshUnread();
  }, [currentUser, refreshUnread]);

  useEffect(() => {
    if (!currentUser) return;
    const t = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      void refreshUnread();
      if (notificationsOpen) void loadList();
    }, POLL_UNREAD_MS);
    return () => clearInterval(t);
  }, [currentUser, refreshUnread, loadList, notificationsOpen]);

  useEffect(() => {
    if (notificationsOpen && currentUser) void loadList();
  }, [notificationsOpen, currentUser, loadList]);

  const onNotificationRowClick = async (n: NotificationFromApi) => {
    if (!n.readAt) {
      setReadBusyId(n.id);
      try {
        await markNotificationRead(n.id);
        setListItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)));
        void refreshUnread();
      } catch {
        // nadal nawiguj
      } finally {
        setReadBusyId(null);
      }
    }
    navigate(getNotificationPath(n.type, n.payload));
    setNotificationsOpen(false);
  };

  const onReadAll = async () => {
    setReadAllBusy(true);
    try {
      await markAllNotificationsRead();
      void refreshUnread();
      void loadList();
    } catch {
      setListError('Nie udało się oznaczyć wszystkich jako przeczytane.');
    } finally {
      setReadAllBusy(false);
    }
  };

  const onExportPdf = () => {
    const rows = listItems;
    if (rows.length === 0) return;
    const html = exportNotificationsToPrintHtml(rows, 'Powiadomienia — eksport');
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
    }
  };

  return (
    <>
      <header className="topbar">
        <div className="topbar-title-wrap">
          <button
            aria-label="Otwórz menu"
            className="icon-btn sidebar-toggle-btn"
            onClick={onToggleSidebar}
            type="button"
          >
            <i className="fa-solid fa-bars" aria-hidden="true" />
          </button>
          <h2>{title}</h2>
        </div>
        <div className="topbar-actions">
          {currentUser ? (
            <button
              aria-label="Powiadomienia"
              className="icon-btn notification-icon-btn"
              onClick={() => setNotificationsOpen((prev) => !prev)}
              type="button"
            >
              <i className="fa-solid fa-bell" aria-hidden="true" />
              {unreadTotal > 0 ? <span className="notification-badge">{unreadTotal > 99 ? '99+' : unreadTotal}</span> : null}
            </button>
          ) : null}
          <button className="icon-btn" onClick={() => navigate('/mapa')} type="button">
            Mapa Polski
          </button>
        </div>
      </header>

      {notificationsOpen && currentUser ? (
        <div className="notifications-popover-backdrop" onClick={() => setNotificationsOpen(false)}>
          <div className="notifications-popover" onClick={(e) => e.stopPropagation()}>
            <div className="notifications-popover-head">
              <h4>Powiadomienia</h4>
              <div className="notifications-popover-actions">
                <button
                  className="primary-outline-btn notification-read-all-btn"
                  type="button"
                  disabled={readAllBusy || unreadTotal === 0}
                  onClick={() => void onReadAll()}
                >
                  {readAllBusy ? '…' : 'Wszystkie przeczytane'}
                </button>
                {isAdmin ? (
                  <button className="primary-outline-btn" type="button" onClick={onExportPdf} disabled={listItems.length === 0}>
                    Druk / PDF
                  </button>
                ) : null}
              </div>
            </div>

            <div className="notification-filters">
              <label className="notification-filter-tight">
                <input
                  type="checkbox"
                  checked={filterUnreadOnly}
                  onChange={(e) => setFilterUnreadOnly(e.target.checked)}
                />
                Tylko nieprzeczytane
              </label>
              <label className="notification-filter-tight">
                Typ
                <select
                  className="add-entry-select"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <option value="">Wszystkie</option>
                  {typeOptions.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label className="notification-filter-tight">
                Okres
                <select
                  className="add-entry-select"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                >
                  <option value="7">Ostatnie 7 dni</option>
                  <option value="30">Ostatnie 30 dni</option>
                  <option value="all">Bez ogr. daty (lista API)</option>
                </select>
              </label>
              <label className="notification-filter-tight">
                <input
                  type="checkbox"
                  checked={showArchive}
                  onChange={(e) => setShowArchive(e.target.checked)}
                />
                Pokaż starsze (30+ dni)
              </label>
            </div>

            {listError ? <p className="email-warning notification-list-error">{listError}</p> : null}
            {listLoading ? <p className="notification-list-loading">Ładowanie…</p> : null}

            {!listLoading && displayPipeline.recent.length === 0 && displayPipeline.archive.length === 0 ? (
              <p className="map-none">Brak powiadomień w wybranych filtrach.</p>
            ) : null}

            <div className="notification-scroll">
              {displayPipeline.recent.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className={
                    'notification-row notification-row-click' +
                    (!n.readAt ? ' notification-row-unread' : '') +
                    (isHighPriorityNotificationType(n.type) ? ' notification-row-important' : '')
                  }
                  onClick={() => void onNotificationRowClick(n)}
                  disabled={readBusyId === n.id}
                >
                  <strong className="notification-row-title">{n.title}</strong>
                  <span className="notification-row-body">{n.body}</span>
                  <small className="notification-row-time">{formatPlDate(n.createdAt)}</small>
                </button>
              ))}
              {showArchive && displayPipeline.archive.length > 0 ? (
                <>
                  <p className="notification-archive-label">Archiwum (starsze niż 30 dni)</p>
                  {displayPipeline.archive.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      className={
                        'notification-row notification-row-click' +
                        (!n.readAt ? ' notification-row-unread' : '') +
                        (isHighPriorityNotificationType(n.type) ? ' notification-row-important' : '')
                      }
                      onClick={() => void onNotificationRowClick(n)}
                      disabled={readBusyId === n.id}
                    >
                      <strong className="notification-row-title">{n.title}</strong>
                      <span className="notification-row-body">{n.body}</span>
                      <small className="notification-row-time">{formatPlDate(n.createdAt)}</small>
                    </button>
                  ))}
                </>
              ) : null}
            </div>

            <p className="notification-live-hint">Aktualizacja co {POLL_UNREAD_MS / 1000} s. Żywe push bez odświeżania — gdy dołączycie WebSocket do API, można je podłączyć zamiast odświeżania.</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
