import OpiekunowieSection from '@/components/opiekunowie/OpiekunowieSection';
import type { AppDatabase, User } from '@/types/domain';
import type { AddEntryValues } from '@/components/common/AddEntryModal';

interface OpiekunowiePageProps {
  db: AppDatabase;
  onAddCaregiver: (values: AddEntryValues) => void;
  onUpdateCaregiver: (userId: number, payload: Pick<User, 'name' | 'email' | 'phone'>) => void;
  onToggleCaregiverBlocked: (userId: number) => void;
}

export default function OpiekunowiePage({
  db,
  onAddCaregiver,
  onUpdateCaregiver,
  onToggleCaregiverBlocked,
}: OpiekunowiePageProps) {
  return (
    <OpiekunowieSection
      caregivers={db.caregivers}
      onAddCaregiver={onAddCaregiver}
      onUpdateCaregiver={onUpdateCaregiver}
      onToggleCaregiverBlocked={onToggleCaregiverBlocked}
    />
  );
}
