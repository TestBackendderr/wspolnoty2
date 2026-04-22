import PlanySprzedazoweSection from '@/components/plany-sprzedazowe/PlanySprzedazoweSection';
import { useAppData } from '@/app/providers/appDataContext';
import { useAuth } from '@/app/providers/authContext';
import { useLocation } from 'react-router-dom';

export default function PlanySprzedazowePage() {
  const { db } = useAppData();
  const { currentUser } = useAuth();
  const location = useLocation();
  const scope: 'all' | 'mine' = location.pathname === '/my-plan' ? 'mine' : 'all';
  const isAdmin = currentUser?.role === 'admin';
  return (
    <PlanySprzedazoweSection
      caregivers={db.caregivers}
      cooperatives={db.cooperatives}
      currentUser={currentUser}
      isAdmin={isAdmin}
      scope={scope}
    />
  );
}
