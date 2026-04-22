import { useState } from 'react';

import type { User } from '@/types/domain';

interface ProfilSectionProps {
  user: User;
  onSave: (payload: Pick<User, 'name' | 'email' | 'phone' | 'password'>) => void;
}

export default function ProfilSection({ user, onSave }: ProfilSectionProps) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone ?? '');
  const [password, setPassword] = useState(user.password);
  const [message, setMessage] = useState('');

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    onSave({
      name,
      email,
      phone,
      password,
    });

    setMessage('Profil został zapisany.');
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
