import ProfilSection from '@/components/profil/ProfilSection';
import { useAppData } from '@/app/providers/appDataContext';
import { useAuth } from '@/app/providers/authContext';

export default function ProfilPage() {
  const { currentUser } = useAuth();
  const { handleUpdateMyProfile } = useAppData();

  if (!currentUser) return null;
  return <ProfilSection user={currentUser} onSave={handleUpdateMyProfile} />;
}
