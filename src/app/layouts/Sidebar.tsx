import { NavLink, useNavigate } from 'react-router-dom';

import { useAuth } from '@/app/providers/authContext';
import type { UserRole } from '@/types/domain';

interface NavItem {
  to: string;
  label: string;
  iconClass: string;
}

const roleLabel: Record<UserRole, string> = {
  admin: 'Admin',
  caregiver: 'Opiekun',
  opiekun: 'Opiekun',
};

const caregiverNav: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', iconClass: 'fa-solid fa-chart-pie' },
  { to: '/tereny', label: 'Tereny', iconClass: 'fa-solid fa-map-marker-alt' },
  { to: '/my-cooperatives', label: 'Moje spoldzielnie', iconClass: 'fa-solid fa-bolt' },
  { to: '/my-plan', label: 'Moj plan sprzedazy', iconClass: 'fa-solid fa-chart-line' },
  { to: '/calculator', label: 'Kalkulator PV + Magazyn', iconClass: 'fa-solid fa-calculator' },
];

const adminNav: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', iconClass: 'fa-solid fa-chart-pie' },
  { to: '/opiekunowie', label: 'Opiekunowie', iconClass: 'fa-solid fa-user' },
  { to: '/tereny', label: 'Tereny', iconClass: 'fa-solid fa-map-marker-alt' },
  { to: '/spoldzielnie', label: 'Spoldzielnie', iconClass: 'fa-solid fa-bolt' },
  { to: '/mapa', label: 'Mapa Polski', iconClass: 'fa-solid fa-map' },
  { to: '/sales-plans', label: 'Plany sprzedazowe', iconClass: 'fa-solid fa-chart-line' },
  { to: '/calculator', label: 'Kalkulator PV + Magazyn', iconClass: 'fa-solid fa-calculator' },
  { to: '/users-management', label: 'Zarzadzanie kontami', iconClass: 'fa-solid fa-users-cog' },
];

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export default function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  const { currentUser, isCaregiver, logout } = useAuth();
  const navigate = useNavigate();

  if (!currentUser) return null;

  const items = isCaregiver ? caregiverNav : adminNav;

  const handleLogout = async () => {
    await logout();
    onCloseMobile();
    navigate('/login', { replace: true });
  };

  return (
    <>
      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-brand">
          <h1>Wspolnoty Energetyczne</h1>
          <p>System zarzadzania</p>
        </div>

        <nav className="sidebar-nav">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
            >
              <span className="sidebar-link-content">
                <i className={item.iconClass} aria-hidden="true" />
                <span>{item.label}</span>
              </span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <NavLink
            to="/profil"
            onClick={onCloseMobile}
            className="sidebar-user-btn"
          >
            {currentUser.name} <span>{roleLabel[currentUser.role]}</span>
          </NavLink>
          <button onClick={handleLogout} type="button">
            Wyloguj
          </button>
        </div>
      </aside>
      {mobileOpen ? (
        <button
          aria-label="Zamknij menu"
          className="sidebar-backdrop"
          onClick={onCloseMobile}
          type="button"
        />
      ) : null}
    </>
  );
}
