import { useMemo, useState } from 'react';

import { getCurrentUser, login, logout } from '@/services/auth';
import { readDatabase } from '@/services/storage';
import type { User, UserRole } from '@/types/domain';
import DashboardPage from '@/pages/dashboard';
import OpiekunowiePage from '@/pages/opiekunowie';
import TerenyPage from '@/pages/tereny';
import SpoldzielniePage from '@/pages/spoldzielnie';
import MapaPolskiPage from '@/pages/mapa-polski';
import PlanySprzedazowePage from '@/pages/plany-sprzedazowe';
import KalkulatorPvMagazynPage from '@/pages/kalkulator-pv-magazyn';
import ZarzadzanieKontamiPage from '@/pages/zarzadzanie-kontami';

type ViewId =
  | 'dashboard'
  | 'opiekunowie'
  | 'tereny'
  | 'spoldzielnie'
  | 'mapa'
  | 'sales-plans'
  | 'users-management'
  | 'calculator'
  | 'my-cooperatives'
  | 'my-plan';

interface NavItem {
  id: ViewId;
  label: string;
  iconClass: string;
}

const roleLabel: Record<UserRole, string> = {
  admin: 'admin',
  caregiver: 'opiekun',
  opiekun: 'opiekun',
};

const pageTitles: Record<ViewId, string> = {
  dashboard: 'Dashboard',
  opiekunowie: 'Opiekunowie',
  tereny: 'Tereny',
  spoldzielnie: 'Spoldzielnie energetyczne',
  mapa: 'Mapa Polski',
  'sales-plans': 'Plany sprzedazowe',
  'users-management': 'Zarzadzanie kontami',
  calculator: 'Kalkulator PV + Magazyn',
  'my-cooperatives': 'Moje spoldzielnie',
  'my-plan': 'Moj plan sprzedazy',
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => getCurrentUser());
  const [error, setError] = useState<string>('');
  const [view, setView] = useState<ViewId>('dashboard');
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const db = readDatabase();
  const isAuthenticated = useMemo(() => currentUser !== null, [currentUser]);
  const isCaregiver = currentUser?.role === 'opiekun' || currentUser?.role === 'caregiver';

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') ?? '').trim();
    const password = String(formData.get('password') ?? '');

    const loggedInUser = login({ email, password });
    if (!loggedInUser) {
      setError('Nieprawidlowy email lub haslo.');
      return;
    }

    setError('');
    setCurrentUser(loggedInUser);
  };

  const handleLogout = () => {
    logout();
    setCurrentUser(null);
    setView('dashboard');
    setNotificationsOpen(false);
  };

  if (!isAuthenticated || currentUser === null) {
    return (
      <div className="auth-layout">
        <form className="auth-card" onSubmit={handleSubmit}>
          <h1>Wspolnoty Energetyczne</h1>
          <p>System zarzadzania</p>

          <label htmlFor="email">Adres e-mail</label>
          <input id="email" name="email" type="email" required />

          <label htmlFor="password">Haslo</label>
          <input id="password" name="password" type="password" required />

          {error ? <div className="form-error">{error}</div> : null}

          <button type="submit" className="primary-btn">
            Zaloguj sie
          </button>
        </form>
      </div>
    );
  }

  const navItems: NavItem[] = isCaregiver
    ? [
        { id: 'dashboard', label: 'Dashboard', iconClass: 'fa-solid fa-chart-pie' },
        { id: 'my-cooperatives', label: 'Moje spoldzielnie', iconClass: 'fa-solid fa-bolt' },
        { id: 'my-plan', label: 'Moj plan sprzedazy', iconClass: 'fa-solid fa-chart-line' },
        { id: 'calculator', label: 'Kalkulator PV + Magazyn', iconClass: 'fa-solid fa-calculator' },
      ]
    : [
        { id: 'dashboard', label: 'Dashboard', iconClass: 'fa-solid fa-chart-pie' },
        { id: 'opiekunowie', label: 'Opiekunowie', iconClass: 'fa-solid fa-user' },
        { id: 'tereny', label: 'Tereny', iconClass: 'fa-solid fa-map-marker-alt' },
        { id: 'spoldzielnie', label: 'Spoldzielnie', iconClass: 'fa-solid fa-bolt' },
        { id: 'mapa', label: 'Mapa Polski', iconClass: 'fa-solid fa-map' },
        { id: 'sales-plans', label: 'Plany sprzedazowe', iconClass: 'fa-solid fa-chart-line' },
        { id: 'calculator', label: 'Kalkulator PV + Magazyn', iconClass: 'fa-solid fa-calculator' },
        { id: 'users-management', label: 'Zarzadzanie kontami', iconClass: 'fa-solid fa-users-cog' },
      ];

  const visibleCooperatives = isCaregiver
    ? db.cooperatives.filter((coop) => coop.caregiverId === currentUser.id)
    : db.cooperatives;

  const unread = (currentUser.notifications ?? []).filter((n) => !n.read).length;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h1>Wspolnoty Energetyczne</h1>
          <p>System zarzadzania</p>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`sidebar-link ${view === item.id ? 'active' : ''}`}
              onClick={() => setView(item.id)}
              type="button"
            >
              <span className="sidebar-link-content">
                <i className={item.iconClass} aria-hidden="true" />
                <span>{item.label}</span>
              </span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div>
            {currentUser.name} <span>{roleLabel[currentUser.role]}</span>
          </div>
          <button onClick={handleLogout} type="button">
            Wyloguj
          </button>
        </div>
      </aside>

      <section className="content-zone">
        <header className="topbar">
          <h2>{pageTitles[view]}</h2>
          <div className="topbar-actions">
            <button
              aria-label="Powiadomienia"
              className="icon-btn notification-icon-btn"
              onClick={() => setNotificationsOpen((prev) => !prev)}
              type="button"
            >
              <i className="fa-solid fa-bell" aria-hidden="true" />
              {unread > 0 ? <span className="notification-badge">{unread}</span> : null}
            </button>
            <button className="icon-btn" onClick={() => setView('mapa')} type="button">
              Mapa Polski
            </button>
          </div>
        </header>

        {notificationsOpen ? (
          <div className="notifications-popover-backdrop" onClick={() => setNotificationsOpen(false)}>
            <div className="notifications-popover" onClick={(event) => event.stopPropagation()}>
              <h4>Powiadomienia</h4>
              {currentUser.notifications.length === 0 ? (
                <p>Brak powiadomien</p>
              ) : (
                currentUser.notifications.map((n) => (
                  <div key={n.id} className="notification-row">
                    <strong>{n.message}</strong>
                    <small>{n.timestamp}</small>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : null}

        <main className="page-content">
          <CurrentPage view={view} db={db} visibleCooperatives={visibleCooperatives} />
        </main>
      </section>

    </div>
  );
}

interface CurrentPageProps {
  view: ViewId;
  db: ReturnType<typeof readDatabase>;
  visibleCooperatives: ReturnType<typeof readDatabase>['cooperatives'];
}

function CurrentPage({ view, db, visibleCooperatives }: CurrentPageProps) {
  switch (view) {
    case 'dashboard':
      return <DashboardPage db={db} cooperatives={visibleCooperatives} />;
    case 'opiekunowie':
      return <OpiekunowiePage db={db} />;
    case 'tereny':
      return <TerenyPage db={db} />;
    case 'spoldzielnie':
      return <SpoldzielniePage cooperatives={visibleCooperatives} />;
    case 'mapa':
      return <MapaPolskiPage db={db} />;
    case 'sales-plans':
      return <PlanySprzedazowePage />;
    case 'users-management':
      return <ZarzadzanieKontamiPage db={db} />;
    case 'calculator':
      return <KalkulatorPvMagazynPage />;
    case 'my-cooperatives':
      return <SpoldzielniePage cooperatives={visibleCooperatives} />;
    case 'my-plan':
      return <PlanySprzedazowePage />;
    default:
      return null;
  }
}
