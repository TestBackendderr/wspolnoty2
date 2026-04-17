import { Navigate, Route, Routes } from 'react-router-dom';

import AppLayout from '@/app/layouts/AppLayout';
import AuthLayout from '@/app/layouts/AuthLayout';
import ProtectedRoute from '@/app/routes/ProtectedRoute';
import PublicOnlyRoute from '@/app/routes/PublicOnlyRoute';

import DashboardPage from '@/pages/dashboard';
import OpiekunowiePage from '@/pages/opiekunowie';
import TerenyPage from '@/pages/tereny';
import SpoldzielniePage from '@/pages/spoldzielnie';
import MyCooperativesPage from '@/pages/my-cooperatives';
import MapaPolskiPage from '@/pages/mapa-polski';
import PlanySprzedazowePage from '@/pages/plany-sprzedazowe';
import KalkulatorPvMagazynPage from '@/pages/kalkulator-pv-magazyn';
import ZarzadzanieKontamiPage from '@/pages/zarzadzanie-kontami';
import ProfilPage from '@/pages/profil';

import LoginPage from '@/pages/auth/LoginPage';
import RecoverPage from '@/pages/auth/RecoverPage';

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/recover" element={<RecoverPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/opiekunowie" element={<OpiekunowiePage />} />
          <Route path="/tereny" element={<TerenyPage />} />
          <Route path="/spoldzielnie" element={<SpoldzielniePage />} />
          <Route path="/mapa" element={<MapaPolskiPage />} />
          <Route path="/sales-plans" element={<PlanySprzedazowePage />} />
          <Route path="/users-management" element={<ZarzadzanieKontamiPage />} />
          <Route path="/calculator" element={<KalkulatorPvMagazynPage />} />
          <Route path="/my-cooperatives" element={<MyCooperativesPage />} />
          <Route path="/my-plan" element={<PlanySprzedazowePage />} />
          <Route path="/profil" element={<ProfilPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}
