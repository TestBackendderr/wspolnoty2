import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '@/app/providers/authContext';

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

export default function Topbar({ onToggleSidebar }: TopbarProps) {
  const { currentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const title = pageTitles[location.pathname] ?? '';
  const notifications = currentUser?.notifications ?? [];
  const unread = notifications.filter((n) => !n.read).length;

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
          <button
            aria-label="Powiadomienia"
            className="icon-btn notification-icon-btn"
            onClick={() => setNotificationsOpen((prev) => !prev)}
            type="button"
          >
            <i className="fa-solid fa-bell" aria-hidden="true" />
            {unread > 0 ? (
              <span className="notification-badge">{unread}</span>
            ) : null}
          </button>
          <button
            className="icon-btn"
            onClick={() => navigate('/mapa')}
            type="button"
          >
            Mapa Polski
          </button>
        </div>
      </header>

      {notificationsOpen ? (
        <div
          className="notifications-popover-backdrop"
          onClick={() => setNotificationsOpen(false)}
        >
          <div
            className="notifications-popover"
            onClick={(event) => event.stopPropagation()}
          >
            <h4>Powiadomienia</h4>
            {notifications.length === 0 ? (
              <p>Brak powiadomień</p>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className="notification-row">
                  <strong>{n.message}</strong>
                  <small>{n.timestamp}</small>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
