import { useEffect, useState } from 'react';

import type { User } from '@/types/domain';

const DEFAULT_PROFILE_COLOR = '#10b981';

interface ProfilSectionProps {
  user: User;
  onSave: (payload: Pick<User, 'name' | 'email' | 'phone' | 'password'> & { color: string }) => Promise<void>;
}

export default function ProfilSection({ user, onSave }: ProfilSectionProps) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone ?? '');
  const [password, setPassword] = useState(user.password);
  const [color, setColor] = useState(user.color ?? DEFAULT_PROFILE_COLOR);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setColor(user.color ?? DEFAULT_PROFILE_COLOR);
  }, [user.color]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    try {
      await onSave({
        name,
        email,
        phone,
        password,
        color,
      });
      setMessage('Profil został zapisany.');
    } catch {
      // Błąd: komunikat globalny w layoutcie (AppDataProvider)
    }
  };

  return (
    <section className="panel profile-panel">
      <h3>Mój profil</h3>
      <p className="profile-description">Tutaj możesz samodzielnie zaktualizować swoje dane konta.</p>

      <form className="profile-form" onSubmit={handleSubmit}>
        <label>
          Imię i nazwisko
          <input value={name} onChange={(event) => setName(event.target.value)} required />
        </label>

        <label>
          E-mail
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            required
          />
        </label>

        <label>
          Telefon
          <input value={phone} onChange={(event) => setPhone(event.target.value)} />
        </label>

        <label htmlFor="profile-color">
          Kolor na mapie
          <div className="add-entry-color-picker">
            <span
              className="add-entry-color-preview-swatch"
              style={{ background: color }}
              aria-hidden
            />
            <input
              id="profile-color"
              type="color"
              className="add-entry-color-input-native"
              value={color}
              onChange={(event) => setColor(event.target.value)}
            />
            <code className="add-entry-color-hex">{color.toUpperCase()}</code>
          </div>
        </label>

        <label>
          Hasło
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            required
          />
        </label>

        <div className="profile-form-actions">
          <button className="primary-btn" type="submit">
            Zapisz zmiany
          </button>
        </div>
      </form>

      {message ? <p className="profile-success">{message}</p> : null}
    </section>
  );
}
