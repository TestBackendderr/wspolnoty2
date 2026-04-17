import ProfilSection from '@/components/profil/ProfilSection';
import type { User } from '@/types/domain';

interface ProfilPageProps {
  user: User;
  onSave: (payload: Pick<User, 'name' | 'email' | 'phone' | 'password'>) => void;
}

export default function ProfilPage({ user, onSave }: ProfilPageProps) {
  return <ProfilSection user={user} onSave={onSave} />;
}
