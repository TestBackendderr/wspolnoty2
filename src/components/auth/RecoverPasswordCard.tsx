import { useMemo, useRef, useState } from 'react';

type RecoverStep = 'email' | 'code' | 'password' | 'success';

interface RecoverPasswordCardProps {
  initialEmail?: string;
  onBackToLogin: () => void;
  onEmailSubmit: (email: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  onCodeSubmit: (
    email: string,
    code: string,
  ) => Promise<{ ok: true; resetToken: string } | { ok: false; error: string }>;
  onPasswordReset: (
    resetToken: string,
    newPassword: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
}

export default function RecoverPasswordCard({
  initialEmail = '',
  onBackToLogin,
  onEmailSubmit,
  onCodeSubmit,
  onPasswordReset,
}: RecoverPasswordCardProps) {
  const [step, setStep] = useState<RecoverStep>('email');
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [codeDigits, setCodeDigits] = useState(['', '', '', '', '', '']);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const codeRefs = useRef<Array<HTMLInputElement | null>>([]);

  const joinedCode = useMemo(() => codeDigits.join(''), [codeDigits]);

  const handleSendCode = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    const response = await onEmailSubmit(email.trim());
    setIsSubmitting(false);
    if (!response.ok) {
      setError(response.error);
      return;
    }
    setError('');
    setInfo(`Kod zostal wyslany na ${email.trim()}.`);
    setCodeDigits(['', '', '', '', '', '']);
    setResetToken('');
    setStep('code');
  };

  const handleCodeInput = (index: number, value: string) => {
    const numeric = value.replace(/\D/g, '').slice(-1);
    setCodeDigits((prev) => {
      const next = [...prev];
      next[index] = numeric;
      return next;
    });
    if (numeric && index < 5) {
      codeRefs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !codeDigits[index] && index > 0) {
      codeRefs.current[index - 1]?.focus();
    }
  };

  const handleCodeSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    if (joinedCode.length !== 6) {
      setError('Wpisz pelny 6-cyfrowy kod.');
      return;
    }
    setIsSubmitting(true);
    const response = await onCodeSubmit(email.trim(), joinedCode);
    setIsSubmitting(false);
    if (!response.ok) {
      setError(response.error);
      return;
    }
    setResetToken(response.resetToken);
    setError('');
    setInfo('');
    setStep('password');
  };

  const handlePasswordSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    if (!newPassword || !confirmPassword) {
      setError('Uzupelnij oba pola hasla.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Hasla nie sa takie same.');
      return;
    }

    if (!resetToken) {
      setError('Sesja resetowania wygasla. Popros o nowy kod.');
      setStep('email');
      return;
    }

    setIsSubmitting(true);
    const response = await onPasswordReset(resetToken, newPassword);
    setIsSubmitting(false);
    if (!response.ok) {
      setError(response.error);
      return;
    }

    setError('');
    setInfo('Haslo zostalo zmienione. Za chwile nastapi powrot do logowania.');
    setStep('success');
    window.setTimeout(onBackToLogin, 1200);
  };

  return (
    <div className="auth-card">
      <h1>Odzyskiwanie hasła</h1>
      <p>Odzyskaj dostep do konta</p>

      {step === 'email' ? (
        <form className="auth-inline-form" onSubmit={handleSendCode}>
          <label htmlFor="recover-email">Adres e-mail</label>
          <input
            id="recover-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <button className="primary-btn" type="submit">
            {isSubmitting ? 'Wysylanie...' : 'Wyslij kod'}
          </button>
        </form>
      ) : null}

      {step === 'code' ? (
        <form className="auth-inline-form" onSubmit={handleCodeSubmit}>
          <label>Wpisz 6-cyfrowy kod</label>
          <div className="code-inputs">
            {codeDigits.map((digit, index) => (
              <input
                key={index}
                ref={(node) => {
                  codeRefs.current[index] = node;
                }}
                className="code-input"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(event) => handleCodeInput(index, event.target.value)}
                onKeyDown={(event) => handleCodeKeyDown(index, event)}
              />
            ))}
          </div>
          <button className="primary-btn" type="submit">
            {isSubmitting ? 'Sprawdzanie...' : 'Potwierdz kod'}
          </button>
        </form>
      ) : null}

      {step === 'password' ? (
        <form className="auth-inline-form" onSubmit={handlePasswordSubmit}>
          <label htmlFor="new-password">Nowe haslo</label>
          <input
            id="new-password"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
          />

          <label htmlFor="confirm-new-password">Potwierdz nowe haslo</label>
          <input
            id="confirm-new-password"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
          />

          <button className="primary-btn" type="submit">
            {isSubmitting ? 'Zapisywanie...' : 'Zmien haslo'}
          </button>
        </form>
      ) : null}

      {error ? <div className="form-error">{error}</div> : null}
      {info ? <div className="form-success">{info}</div> : null}

      <button className="auth-link-btn" onClick={onBackToLogin} type="button">
        Wroc do logowania
      </button>
    </div>
  );
}
