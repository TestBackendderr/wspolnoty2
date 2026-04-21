import { useNavigate, useSearchParams } from 'react-router-dom';

import RecoverPasswordCard from '@/components/auth/RecoverPasswordCard';
import {
  forgotPassword,
  resetPassword,
  verifyResetCode,
} from '@/services/auth';
import { ApiError } from '@/services/api';

const DEFAULT_REQUEST_ERROR = 'Nie udalo sie wyslac kodu. Sprobuj ponownie.';
const INVALID_CODE_ERROR = 'Nieprawidlowy lub wygasly kod.';
const INVALID_TOKEN_ERROR = 'Nieprawidlowy lub wygasly token resetu.';
const DEFAULT_RESET_ERROR = 'Nie udalo sie zmienic hasla. Sprobuj ponownie.';

export default function RecoverPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialEmail = params.get('email') ?? '';

  const handleEmailSubmit = async (email: string) => {
    try {
      await forgotPassword({ email });
      return { ok: true } as const;
    } catch {
      return { ok: false, error: DEFAULT_REQUEST_ERROR } as const;
    }
  };

  const handleCodeSubmit = async (email: string, code: string) => {
    try {
      const token = await verifyResetCode({ email, code });
      return { ok: true, resetToken: token } as const;
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) {
        return { ok: false, error: INVALID_CODE_ERROR } as const;
      }
      return { ok: false, error: DEFAULT_REQUEST_ERROR } as const;
    }
  };

  const handlePasswordReset = async (resetToken: string, newPassword: string) => {
    try {
      await resetPassword({ resetToken, newPassword });
      return { ok: true } as const;
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) {
        return { ok: false, error: INVALID_TOKEN_ERROR } as const;
      }
      return { ok: false, error: DEFAULT_RESET_ERROR } as const;
    }
  };

  return (
    <RecoverPasswordCard
      initialEmail={initialEmail}
      onEmailSubmit={handleEmailSubmit}
      onCodeSubmit={handleCodeSubmit}
      onPasswordReset={handlePasswordReset}
      onBackToLogin={() =>
        navigate(`/login?email=${encodeURIComponent(initialEmail)}`)
      }
    />
  );
}
