import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { getCurrentUser, login, logout } from '@/services/auth';
import { readDatabase, writeDatabase } from '@/services/storage';
import {
  createCooperative,
  deleteCooperative as deleteCooperativeApi,
  listCooperatives,
  mapStatusToApi,
  updateCooperative as updateCooperativeApi,
} from '@/services/cooperatives';
import {
  blockUser as blockUserApi,
  createUser as createUserApi,
  deleteUser as deleteUserApi,
  listUsersFromBackend,
  mapRoleToApi,
  unblockUser as unblockUserApi,
  updateUser as updateUserApi,
} from '@/services/users';
import type { Cooperative, User, UserRole } from '@/types/domain';
import type { AddEntryValues } from '@/components/common/AddEntryModal';
import DashboardPage from '@/pages/dashboard';
import OpiekunowiePage from '@/pages/opiekunowie';
import TerenyPage from '@/pages/tereny';
import SpoldzielniePage from '@/pages/spoldzielnie';
import MapaPolskiPage from '@/pages/mapa-polski';
import PlanySprzedazowePage from '@/pages/plany-sprzedazowe';
import KalkulatorPvMagazynPage from '@/pages/kalkulator-pv-magazyn';
import ZarzadzanieKontamiPage from '@/pages/zarzadzanie-kontami';
import ProfilPage from '@/pages/profil';
import LoginCard from '@/components/auth/LoginCard';
import RecoverPasswordCard from '@/components/auth/RecoverPasswordCard';

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
  | 'my-plan'
  | 'profile';

interface NavItem {
  id: ViewId;
  label: string;
  iconClass: string;
}

type AuthView = 'login' | 'recover';

const roleLabel: Record<UserRole, string> = {
  admin: 'Admin',
  caregiver: 'Opiekun',
  opiekun: 'Opiekun',
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
  profile: 'Moj profil',
};

const viewPathMap: Record<ViewId, string> = {
  dashboard: '/dashboard',
  opiekunowie: '/opiekunowie',
  tereny: '/tereny',
  spoldzielnie: '/spoldzielnie',
  mapa: '/mapa',
  'sales-plans': '/sales-plans',
  'users-management': '/users-management',
  calculator: '/calculator',
  'my-cooperatives': '/my-cooperatives',
  'my-plan': '/my-plan',
  profile: '/profil',
};

function getViewFromPathname(pathname: string): ViewId {
  const normalizedPath = pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname;
  const found = (Object.entries(viewPathMap).find(([, path]) => path === normalizedPath) ?? [null])[0];
  if (found) return found as ViewId;
  if (normalizedPath === '/') return 'dashboard';
  return 'dashboard';
}

function getAuthViewFromPathname(pathname: string): AuthView {
  const normalizedPath = pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname;
  if (normalizedPath === '/recover') return 'recover';
  return 'login';
}

function splitFullName(fullName: string): { name: string; surname: string } {
  const normalized = fullName.trim().replace(/\s+/g, ' ');
  if (!normalized) return { name: '', surname: '' };
  const [name, ...rest] = normalized.split(' ');
  return { name, surname: rest.join(' ') };
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [db, setDb] = useState(() => readDatabase());
  const [error, setError] = useState<string>('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [authResolved, setAuthResolved] = useState(false);
  const view = useMemo(() => getViewFromPathname(location.pathname), [location.pathname]);
  const authView = useMemo(() => getAuthViewFromPathname(location.pathname), [location.pathname]);
  const isAuthenticated = useMemo(() => currentUser !== null, [currentUser]);
  const isCaregiver = currentUser?.role === 'opiekun' || currentUser?.role === 'caregiver';

  useEffect(() => {
    const bootstrapAuth = async () => {
      const user = await getCurrentUser();
      setCurrentUser(user);
      setAuthResolved(true);
    };
    void bootstrapAuth();
  }, []);

  useEffect(() => {
    if (!authResolved || !currentUser) return;
    const loadBackendData = async () => {
      try {
        const [cooperatives, users] = await Promise.all([listCooperatives(), listUsersFromBackend()]);
        setDb((prev) => ({
          ...prev,
          cooperatives,
          users: users.length > 0 ? users : prev.users,
        }));
      } catch {
        setError('Nie udalo sie pobrac danych z backendu.');
      }
    };
    void loadBackendData();
  }, [authResolved, currentUser]);

  const handleLogin = async (payload: { email: string; password: string }) => {
    const email = payload.email.trim();
    const password = payload.password;
    const loggedInUser = await login({ email, password });
    if (!loggedInUser) {
      setError('Nieprawidlowy email lub haslo.');
      return;
    }

    setError('');
    setCurrentUser(loggedInUser);
    navigate(viewPathMap.dashboard);
  };

  const handleLogout = async () => {
    await logout();
    setCurrentUser(null);
    navigate('/login');
    setNotificationsOpen(false);
    setMobileSidebarOpen(false);
  };

  const openView = (nextView: ViewId) => {
    const targetPath = viewPathMap[nextView];
    if (location.pathname !== targetPath) {
      navigate(targetPath);
    }
    setMobileSidebarOpen(false);
  };

  const updateDatabase = (updater: (prev: typeof db) => typeof db) => {
    setDb((prev) => {
      const next = updater(prev);
      writeDatabase(next);
      return next;
    });
  };

  const handleAddCaregiver = (values: AddEntryValues) => {
    const firstName = (values['caregiver-first-name'] ?? '').trim();
    const lastName = (values['caregiver-last-name'] ?? '').trim();
    if (!firstName && !lastName) return;

    const fullName = `${firstName} ${lastName}`.trim();
    updateDatabase((prev) => {
      const nextId =
        Math.max(0, ...prev.caregivers.map((x) => x.id), ...prev.users.map((x) => x.id)) + 1;

      const email = (values['caregiver-email'] ?? '').trim();
      const phone = (values['caregiver-phone'] ?? '').trim();
      return {
        ...prev,
        caregivers: [
          ...prev.caregivers,
          {
            id: nextId,
            name: fullName || 'Nowy opiekun',
            email,
            password: 'opiekun',
            phone,
            isBlocked: false,
            role: 'opiekun',
            notifications: [],
          },
        ],
        users: [
          ...prev.users,
          {
            id: nextId,
            name: fullName || 'Nowy opiekun',
            email,
            password: 'opiekun',
            phone,
            isBlocked: false,
            role: 'opiekun',
            notifications: [],
          },
        ],
      };
    });
  };

  const handleAddArea = (values: AddEntryValues) => {
    const areaName = (values['area-name'] ?? '').trim();
    if (!areaName) return;
    updateDatabase((prev) => {
      const nextId = Math.max(0, ...prev.areas.map((x) => x.id)) + 1;
      return {
        ...prev,
        areas: [
          ...prev.areas,
          {
            id: nextId,
            type: (values['area-type'] ?? '').trim(),
            name: areaName,
            postalCode: (values['area-postal'] ?? '').trim(),
            voivodeship: (values['area-voivodeship'] ?? '').trim() || 'nieokreslone',
          },
        ],
      };
    });
  };

  const handleAddCooperative = async (values: AddEntryValues) => {
    const name = (values['coop-name'] ?? '').trim();
    if (!name) return;
    try {
      const created = await createCooperative({
        name,
        address: (values['coop-address'] ?? '').trim(),
        region: (values['coop-voivodeship'] ?? '').trim() || 'nieokreslone',
        ratedPower: Number(values['coop-planned-power'] ?? 0) || 0,
      });
      setDb((prev) => ({ ...prev, cooperatives: [...prev.cooperatives, created] }));
      setError('');
    } catch {
      setError('Nie udalo sie dodac spoldzielni. Sprawdz uprawnienia i sesje.');
    }
  };

  const handleUpdateCooperative = (
    coopId: number,
    payload: Pick<Cooperative, 'status' | 'plannedPower' | 'installedPower'>,
  ) => {
    const targetCoop = db.cooperatives.find((coop) => coop.id === coopId);
    if (!targetCoop) return;

    void (async () => {
      try {
        const updated = await updateCooperativeApi(coopId, {
          name: targetCoop.name,
          address: targetCoop.address,
          region: targetCoop.voivodeship,
          ratedPower: payload.plannedPower,
          installedPower: payload.installedPower,
          status: mapStatusToApi(payload.status),
        });
        setDb((prev) => ({
          ...prev,
          cooperatives: prev.cooperatives.map((coop) => (coop.id === coopId ? updated : coop)),
        }));
        setError('');
      } catch {
        setError('Nie udalo sie zaktualizowac spoldzielni. Sprawdz uprawnienia (ADMIN).');
      }
    })();
  };

  const handleDeleteCooperative = (coopId: number) => {
    void (async () => {
      try {
        await deleteCooperativeApi(coopId);
        setDb((prev) => ({
          ...prev,
          cooperatives: prev.cooperatives.filter((coop) => coop.id !== coopId),
        }));
        setError('');
      } catch {
        setError('Nie udalo sie usunac spoldzielni. Sprawdz uprawnienia (ADMIN).');
      }
    })();
  };

  const handleAddUser = (values: AddEntryValues) => {
    const name = (values['user-name'] ?? '').trim();
    const surname = (values['user-surname'] ?? '').trim();
    const email = (values['user-email'] ?? '').trim();
    const phoneNumber = (values['user-phone'] ?? '').trim();
    if (!name || !surname || !email || !phoneNumber) return;

    const rawRole = (values['user-role'] ?? '').trim().toLowerCase();
    const role: UserRole = rawRole === 'admin' ? 'admin' : 'opiekun';
    const password = (values['user-password'] ?? '').trim() || 'haslo123';

    void (async () => {
      try {
        const created = await createUserApi({
          name,
          surname,
          email,
          phoneNumber,
          password,
          role: mapRoleToApi(role),
        });
        setDb((prev) => ({
          ...prev,
          users: [...prev.users.filter((user) => user.id !== created.id), created],
        }));
        setError('');
      } catch {
        setError('Nie udalo sie utworzyc konta.');
      }
    })();
  };

  const handleUpdateCaregiver = (
    userId: number,
    payload: Pick<User, 'name' | 'email' | 'phone'>,
  ) => {
    updateDatabase((prev) => ({
      ...prev,
      caregivers: prev.caregivers.map((caregiver) =>
        caregiver.id === userId
          ? {
              ...caregiver,
              name: payload.name.trim() || caregiver.name,
              email: payload.email.trim() || caregiver.email,
              phone: payload.phone?.trim() ?? caregiver.phone ?? '',
            }
          : caregiver,
      ),
      users: prev.users.map((user) =>
        user.id === userId
          ? {
              ...user,
              name: payload.name.trim() || user.name,
              email: payload.email.trim() || user.email,
              phone: payload.phone?.trim() ?? user.phone ?? '',
            }
          : user,
      ),
    }));
  };

  const handleUpdateUser = (
    userId: number,
    payload: Pick<User, 'name' | 'email' | 'phone' | 'password' | 'role' | 'isBlocked'>,
  ) => {
    const current = db.users.find((user) => user.id === userId);
    if (!current) return;

    const split = splitFullName(payload.name.trim() || current.name);
    void (async () => {
      try {
        const updated = await updateUserApi(userId, {
          name: split.name || payload.name.trim() || current.name,
          surname: split.surname || 'Brak',
          email: payload.email.trim() || current.email,
          phoneNumber: payload.phone?.trim() ?? current.phone ?? '',
          role: mapRoleToApi(payload.role),
          ...(payload.password.trim() ? { password: payload.password.trim() } : {}),
        });

        if (Boolean(payload.isBlocked) !== Boolean(current.isBlocked)) {
          if (payload.isBlocked) await blockUserApi(userId);
          else await unblockUserApi(userId);
        }

        setDb((prev) => ({
          ...prev,
          users: prev.users.map((user) =>
            user.id === userId ? { ...updated, isBlocked: Boolean(payload.isBlocked) } : user,
          ),
        }));
        setError('');
      } catch {
        setError('Nie udalo sie zaktualizowac konta.');
      }
    })();
  };

  const handleDeleteUser = (userId: number) => {
    void (async () => {
      try {
        await deleteUserApi(userId);
        setDb((prev) => ({
          ...prev,
          users: prev.users.filter((user) => user.id !== userId),
        }));
        setError('');
      } catch {
        setError('Nie udalo sie usunac konta.');
      }
    })();
  };

  const handleUpdateMyProfile = (payload: Pick<User, 'name' | 'email' | 'phone' | 'password'>) => {
    if (!currentUser) return;

    updateDatabase((prev) => ({
      ...prev,
      users: prev.users.map((user) =>
        user.id === currentUser.id
          ? {
              ...user,
              name: payload.name.trim() || user.name,
              email: payload.email.trim() || user.email,
              phone: payload.phone?.trim() ?? user.phone ?? '',
              password: payload.password.trim() || user.password,
            }
          : user,
      ),
      caregivers: prev.caregivers.map((caregiver) =>
        caregiver.id === currentUser.id
          ? {
              ...caregiver,
              name: payload.name.trim() || caregiver.name,
              email: payload.email.trim() || caregiver.email,
              phone: payload.phone?.trim() ?? caregiver.phone ?? '',
              password: payload.password.trim() || caregiver.password,
            }
          : caregiver,
      ),
    }));

    setCurrentUser((prev) =>
      prev
        ? {
            ...prev,
            name: payload.name.trim() || prev.name,
            email: payload.email.trim() || prev.email,
            phone: payload.phone?.trim() ?? prev.phone ?? '',
            password: payload.password.trim() || prev.password,
          }
        : prev,
    );
  };

  const handleSetVoivodeshipLead = (voivodeshipId: string, caregiverId: number | null) => {
    updateDatabase((prev) => {
      const existing = prev.voivodeshipLeads.find((lead) => lead.voivodeshipId === voivodeshipId);
      if (existing) {
        return {
          ...prev,
          voivodeshipLeads: prev.voivodeshipLeads.map((lead) =>
            lead.voivodeshipId === voivodeshipId ? { ...lead, caregiverId } : lead,
          ),
        };
      }
      return {
        ...prev,
        voivodeshipLeads: [...prev.voivodeshipLeads, { voivodeshipId, caregiverId }],
      };
    });
  };

  const handleSetVoivodeshipAssignments = (
    voivodeshipId: string,
    cooperativeIds: number[],
    areaIds: number[],
  ) => {
    updateDatabase((prev) => {
      const existing = prev.voivodeshipAssignments.find((item) => item.voivodeshipId === voivodeshipId);
      if (existing) {
        return {
          ...prev,
          voivodeshipAssignments: prev.voivodeshipAssignments.map((item) =>
            item.voivodeshipId === voivodeshipId ? { ...item, cooperativeIds, areaIds } : item,
          ),
        };
      }
      return {
        ...prev,
        voivodeshipAssignments: [...prev.voivodeshipAssignments, { voivodeshipId, cooperativeIds, areaIds }],
      };
    });
  };

  const handleRecoverEmailSubmit = (email: string): { ok: true; code: string } | { ok: false; error: string } => {
    const normalizedEmail = email.trim().toLowerCase();
    const user = db.users.find((candidate) => candidate.email.toLowerCase() === normalizedEmail);
    if (!user) {
      return { ok: false, error: 'Nie znaleziono konta o podanym adresie e-mail.' };
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    return { ok: true, code };
  };

  const handlePasswordReset = (email: string, newPassword: string): { ok: true } | { ok: false; error: string } => {
    const normalizedEmail = email.trim().toLowerCase();
    const user = db.users.find((candidate) => candidate.email.toLowerCase() === normalizedEmail);
    if (!user) {
      return { ok: false, error: 'Nie znaleziono konta do zmiany hasla.' };
    }

    updateDatabase((prev) => ({
      ...prev,
      users: prev.users.map((candidate) =>
        candidate.email.toLowerCase() === normalizedEmail ? { ...candidate, password: newPassword } : candidate,
      ),
      caregivers: prev.caregivers.map((candidate) =>
        candidate.email.toLowerCase() === normalizedEmail ? { ...candidate, password: newPassword } : candidate,
      ),
    }));

    return { ok: true };
  };

  if (!authResolved) {
    return (
      <div className="auth-layout">
        <div className="auth-card">
          <h1>Wspolnoty Energetyczne</h1>
          <p>Sprawdzanie sesji...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || currentUser === null) {
    const loginEmailFromPath = new URLSearchParams(location.search).get('email') ?? '';
    const initialLoginEmail = loginEmailFromPath;

    return (
      <div className="auth-layout">
        {authView === 'recover' ? (
          <RecoverPasswordCard
            initialEmail={loginEmailFromPath}
            onEmailSubmit={handleRecoverEmailSubmit}
            onPasswordReset={handlePasswordReset}
            onBackToLogin={() => {
              setError('');
              navigate(`/login?email=${encodeURIComponent(loginEmailFromPath)}`);
            }}
          />
        ) : null}

        {authView === 'login' ? (
          <LoginCard
            initialEmail={initialLoginEmail}
            error={error}
            onSubmit={handleLogin}
            onOpenRecover={(email) => {
              setError('');
              navigate(`/recover?email=${encodeURIComponent(email)}`);
            }}
          />
        ) : null}
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
    ? (() => {
        const assigned = db.cooperatives.filter((coop) => coop.caregiverId === currentUser.id);
        return assigned.length > 0 ? assigned : db.cooperatives;
      })()
    : db.cooperatives;

  const unread = (currentUser.notifications ?? []).filter((n) => !n.read).length;

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileSidebarOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-brand">
          <h1>Wspolnoty Energetyczne</h1>
          <p>System zarzadzania</p>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`sidebar-link ${view === item.id ? 'active' : ''}`}
              onClick={() => openView(item.id)}
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
          <button className="sidebar-user-btn" onClick={() => openView('profile')} type="button">
            {currentUser.name} <span>{roleLabel[currentUser.role]}</span>
          </button>
          <button onClick={handleLogout} type="button">
            Wyloguj
          </button>
        </div>
      </aside>
      {mobileSidebarOpen ? (
        <button
          aria-label="Zamknij menu"
          className="sidebar-backdrop"
          onClick={() => setMobileSidebarOpen(false)}
          type="button"
        />
      ) : null}

      <section className="content-zone">
        <header className="topbar">
          <div className="topbar-title-wrap">
            <button
              aria-label="Otworz menu"
              className="icon-btn sidebar-toggle-btn"
              onClick={() => setMobileSidebarOpen((prev) => !prev)}
              type="button"
            >
              <i className="fa-solid fa-bars" aria-hidden="true" />
            </button>
            <h2>{pageTitles[view]}</h2>
          </div>
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
            <button className="icon-btn" onClick={() => openView('mapa')} type="button">
              Mapa Polski
            </button>
          </div>
        </header>

        {error ? <div className="email-warning">{error}</div> : null}

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
          <CurrentPage
            view={view}
            db={db}
            visibleCooperatives={visibleCooperatives}
            onAddCaregiver={handleAddCaregiver}
            onUpdateCaregiver={handleUpdateCaregiver}
            onAddArea={handleAddArea}
            onAddCooperative={handleAddCooperative}
            onUpdateCooperative={handleUpdateCooperative}
            onDeleteCooperative={handleDeleteCooperative}
            onAddUser={handleAddUser}
            onUpdateUser={handleUpdateUser}
            onDeleteUser={handleDeleteUser}
            currentUser={currentUser}
            onUpdateMyProfile={handleUpdateMyProfile}
            onSetVoivodeshipLead={handleSetVoivodeshipLead}
            onSetVoivodeshipAssignments={handleSetVoivodeshipAssignments}
          />
        </main>
      </section>

    </div>
  );
}

interface CurrentPageProps {
  view: ViewId;
  db: ReturnType<typeof readDatabase>;
  visibleCooperatives: ReturnType<typeof readDatabase>['cooperatives'];
  onAddCaregiver: (values: AddEntryValues) => void;
  onUpdateCaregiver: (userId: number, payload: Pick<User, 'name' | 'email' | 'phone'>) => void;
  onAddArea: (values: AddEntryValues) => void;
  onAddCooperative: (values: AddEntryValues) => void;
  onDeleteCooperative?: (coopId: number) => void;
  onAddUser: (values: AddEntryValues) => void;
  onUpdateUser: (
    userId: number,
    payload: Pick<User, 'name' | 'email' | 'phone' | 'password' | 'role' | 'isBlocked'>,
  ) => void;
  onDeleteUser?: (userId: number) => void;
  currentUser: User;
  onUpdateMyProfile: (payload: Pick<User, 'name' | 'email' | 'phone' | 'password'>) => void;
  onSetVoivodeshipLead: (voivodeshipId: string, caregiverId: number | null) => void;
  onSetVoivodeshipAssignments: (
    voivodeshipId: string,
    cooperativeIds: number[],
    areaIds: number[],
  ) => void;
  onUpdateCooperative?: (
    coopId: number,
    payload: Pick<Cooperative, 'status' | 'plannedPower' | 'installedPower'>,
  ) => void;
}

function CurrentPage({
  view,
  db,
  visibleCooperatives,
  onAddCaregiver,
  onUpdateCaregiver,
  onAddArea,
  onAddCooperative,
  onDeleteCooperative,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  currentUser,
  onUpdateMyProfile,
  onSetVoivodeshipLead,
  onSetVoivodeshipAssignments,
  onUpdateCooperative,
}: CurrentPageProps) {
  switch (view) {
    case 'dashboard':
      return <DashboardPage db={db} cooperatives={visibleCooperatives} />;
    case 'opiekunowie':
      return (
        <OpiekunowiePage
          db={db}
          onAddCaregiver={onAddCaregiver}
          onUpdateCaregiver={onUpdateCaregiver}
        />
      );
    case 'tereny':
      return <TerenyPage db={db} onAddArea={onAddArea} />;
    case 'spoldzielnie':
      return (
        <SpoldzielniePage
          cooperatives={visibleCooperatives}
          onAddCooperative={onAddCooperative}
          onUpdateCooperative={onUpdateCooperative}
          onDeleteCooperative={onDeleteCooperative}
        />
      );
    case 'mapa':
      return (
        <MapaPolskiPage
          db={db}
          onSetVoivodeshipLead={onSetVoivodeshipLead}
          onSetVoivodeshipAssignments={onSetVoivodeshipAssignments}
        />
      );
    case 'sales-plans':
      return <PlanySprzedazowePage cooperatives={visibleCooperatives} caregivers={db.caregivers} />;
    case 'users-management':
      return (
        <ZarzadzanieKontamiPage
          db={db}
          onAddUser={onAddUser}
          onUpdateUser={onUpdateUser}
          onDeleteUser={onDeleteUser}
        />
      );
    case 'calculator':
      return <KalkulatorPvMagazynPage />;
    case 'my-cooperatives':
      return (
        <SpoldzielniePage
          cooperatives={visibleCooperatives}
          onAddCooperative={onAddCooperative}
          onDeleteCooperative={onDeleteCooperative}
        />
      );
    case 'my-plan':
      return <PlanySprzedazowePage cooperatives={visibleCooperatives} caregivers={db.caregivers} />;
    case 'profile':
      return <ProfilPage user={currentUser} onSave={onUpdateMyProfile} />;
    default:
      return null;
  }
}
