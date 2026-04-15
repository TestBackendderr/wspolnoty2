import { useState } from 'react';

interface AddEntryModalProps {
  buttonLabel: string;
  modalTitle: string;
  fields: Array<{
    id: string;
    label: string;
    type?: 'text' | 'number' | 'email' | 'date';
    placeholder?: string;
  }>;
}

export default function AddEntryModal({ buttonLabel, modalTitle, fields }: AddEntryModalProps) {
  const [open, setOpen] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.currentTarget.reset();
    setOpen(false);
  };

  return (
    <>
      <button className="add-entity-btn" onClick={() => setOpen(true)} type="button">
        <span>+</span>
        <span>{buttonLabel}</span>
      </button>

      {open ? (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <h3>{modalTitle}</h3>
            <form className="add-entry-form" onSubmit={handleSubmit}>
              {fields.map((field) => (
                <label key={field.id} htmlFor={field.id}>
                  {field.label}
                  <input
                    id={field.id}
                    name={field.id}
                    type={field.type ?? 'text'}
                    placeholder={field.placeholder}
                    required
                  />
                </label>
              ))}
              <div className="add-entry-actions">
                <button className="primary-outline-btn" onClick={() => setOpen(false)} type="button">
                  Anuluj
                </button>
                <button className="primary-btn" type="submit">
                  Zapisz
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
