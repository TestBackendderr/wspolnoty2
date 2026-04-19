import { useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import LoginCard from '@/components/auth/LoginCard';
import { useAuth } from '@/app/providers/authContext';
import { BlockedAccountError } from '@/services/auth';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const { login } = useAuth();

  const initialEmail = params.get('email') ?? '';
  const [error, setError] = useState('');

  const handleSubmit = async (payload: { email: string; password: string }) => {
    try {
      const user = await login(payload);
      if (!user) {
        setError('Nieprawidlowy email lub haslo.');
        return;
      }
      setError('');
      const fromState = (location.state as { from?: string } | null)?.from;
      navigate(fromState ?? '/dashboard', { replace: true });
    } catch (err) {
      if (err instanceof BlockedAccountError) {
        setError('To konto zostalo zablokowane.');
        return;
      }
      setError('Nie udalo sie zalogowac. Sprobuj ponownie.');
    }
  };

  const handleOpenRecover = (email: string) => {
    setError('');
    navigate(`/recover?email=${encodeURIComponent(email)}`);
  };

  return (
    <LoginCard
      initialEmail={initialEmail}
      error={error}
      onSubmit={handleSubmit}
      onOpenRecover={handleOpenRecover}
    />
  );
}
