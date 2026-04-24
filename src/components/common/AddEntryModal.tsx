import { useEffect, useState } from 'react';

export type AddEntryValues = Record<string, string>;

interface AddEntryModalProps {
  buttonLabel: string;
  modalTitle: string;
  fields: Array<{
    id: string;
    label: string;
    type?: 'text' | 'number' | 'email' | 'date' | 'color';
    placeholder?: string;
    options?: readonly string[];
    /** Domyślny kolor dla `type: 'color'` (np. `#10b981`). */
    defaultValue?: string;
  }>;
  onSubmit?: (values: AddEntryValues) => void;
  /** When set together with `onOpenChange`, visibility is controlled by the parent. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function AddEntryColorField({
  id,
  label,
  defaultValue,
  formOpen,
}: {
  id: string;
  label: string;
  defaultValue: string;
  formOpen: boolean;
}) {
  const [value, setValue] = useState(defaultValue);
  useEffect(() => {
    if (formOpen) setValue(defaultValue);
  }, [formOpen, defaultValue]);

  return (
    <label htmlFor={id}>
      {label}
      <div className="add-entry-color-picker">
        <span
          className="add-entry-color-preview-swatch"
          style={{ background: value }}
          aria-hidden
        />
        <input
          id={id}
          name={id}
          type="color"
          className="add-entry-color-input-native"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          required
        />
        <code className="add-entry-color-hex">{value.toUpperCase()}</code>
      </div>
    </label>
  );
}

export default function AddEntryModal({
  buttonLabel,
  modalTitle,
  fields,
  onSubmit,
  open: openControlled,
  onOpenChange,
}: AddEntryModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = openControlled !== undefined;
  const open = isControlled ? openControlled : internalOpen;

  const setOpen = (next: boolean) => {
    if (isControlled) {
      onOpenChange?.(next);
    } else {
      setInternalOpen(next);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const values = Object.fromEntries(
      Array.from(formData.entries()).map(([key, value]) => [key, String(value)]),
    ) as AddEntryValues;
    onSubmit?.(values);
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
              {fields.map((field) =>
                field.type === 'color' ? (
                  <AddEntryColorField
                    key={field.id}
                    id={field.id}
                    label={field.label}
                    defaultValue={field.defaultValue ?? '#10b981'}
                    formOpen={open}
                  />
                ) : (
                  <label key={field.id} htmlFor={field.id}>
                    {field.label}
                    {field.options ? (
                      <select id={field.id} name={field.id} className="add-entry-select" required>
                        <option value="">Wybierz</option>
                        {field.options.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id={field.id}
                        name={field.id}
                        type={field.type ?? 'text'}
                        placeholder={field.placeholder}
                        required
                      />
                    )}
                  </label>
                ),
              )}
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
