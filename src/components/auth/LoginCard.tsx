import { useEffect, useState } from 'react';

interface LoginCardProps {
  initialEmail?: string;
  error?: string;
  onSubmit: (payload: { email: string; password: string }) => void;
  onOpenRecover: (email: string) => void;
}

export default function LoginCard({
  initialEmail = '',
  error = '',
  onSubmit,
  onOpenRecover,
}: LoginCardProps) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');

  useEffect(() => {
    setEmail(initialEmail);
  }, [initialEmail]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit({ email: email.trim(), password });
  };

  return (
    <form className="auth-card" onSubmit={handleSubmit}>
      <h1>Wspólnoty Energetyczne</h1>
      <p>System zarządzania</p>

      <label htmlFor="email">Adres e-mail</label>
      <input
        id="email"
        name="email"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
      />

      <label htmlFor="password">Hasło</label>
      <input
        id="password"
        name="password"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
      />

      <button
        className="auth-link-btn"
        onClick={() => onOpenRecover(email.trim())}
        type="button"
      >
        Zapomniałem hasła
      </button>

      {error ? <div className="form-error">{error}</div> : null}

      <button type="submit" className="primary-btn">
        Zaloguj się
      </button>
    </form>
  );
}
