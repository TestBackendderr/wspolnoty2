import { useNavigate, useSearchParams } from 'react-router-dom';

import RecoverPasswordCard from '@/components/auth/RecoverPasswordCard';

const SERVER_REQUIRED_ERROR =
  'Odzyskiwanie hasla przez formularz wymaga konfiguracji serwera. Skontaktuj sie z administratorem systemu.';
const RESET_REQUIRED_ERROR =
  'Reset hasla przez formularz wymaga konfiguracji serwera. Skontaktuj sie z administratorem systemu.';

export default function RecoverPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialEmail = params.get('email') ?? '';

  return (
    <RecoverPasswordCard
      initialEmail={initialEmail}
      onEmailSubmit={() => ({ ok: false, error: SERVER_REQUIRED_ERROR })}
      onPasswordReset={() => ({ ok: false, error: RESET_REQUIRED_ERROR })}
      onBackToLogin={() =>
        navigate(`/login?email=${encodeURIComponent(initialEmail)}`)
      }
    />
  );
}
