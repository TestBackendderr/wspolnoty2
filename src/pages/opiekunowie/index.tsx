import OpiekunowieSection from '@/components/opiekunowie/OpiekunowieSection';
import type { AppDatabase } from '@/types/domain';
import type { AddEntryValues } from '@/components/common/AddEntryModal';

interface OpiekunowiePageProps {
  db: AppDatabase;
  onAddCaregiver: (values: AddEntryValues) => void;
}

export default function OpiekunowiePage({ db, onAddCaregiver }: OpiekunowiePageProps) {
  return (
    <OpiekunowieSection
      caregivers={db.caregivers.map((x) => x.name)}
      onAddCaregiver={onAddCaregiver}
    />
  );
}
