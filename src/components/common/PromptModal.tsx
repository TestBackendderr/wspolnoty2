import { useEffect, useRef } from 'react';

interface PromptModalProps {
  open: boolean;
  title: string;
  label: string;
  value: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function PromptModal({
  open,
  title,
  label,
  value,
  placeholder,
  confirmLabel = 'Zapisz',
  cancelLabel = 'Anuluj',
  onChange,
  onConfirm,
  onCancel,
}: PromptModalProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-card prompt-modal-card" onClick={(event) => event.stopPropagation()}>
        <h3>{title}</h3>
        <div className="prompt-modal-form">
          <label>
            {label}
            <input
              ref={inputRef}
              value={value}
              onChange={(event) => onChange(event.target.value)}
              placeholder={placeholder}
            />
          </label>
          <div className="add-entry-actions">
            <button className="primary-outline-btn" onClick={onCancel} type="button">
              {cancelLabel}
            </button>
            <button className="primary-btn" onClick={onConfirm} type="button">
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
