import { createContext, useContext } from 'react';

import type { AddEntryValues } from '@/components/common/AddEntryModal';
import type { AppDatabase, Cooperative, User } from '@/types/domain';

export interface AppDataContextValue {
  db: AppDatabase;
  visibleCooperatives: Cooperative[];
  error: string;
  clearError: () => void;
  handleAddCooperative: (values: AddEntryValues) => Promise<void>;
  handleDeleteCooperative: (coopId: number) => void;
  handleUpdateMyProfile: (
    payload: Pick<User, 'name' | 'email' | 'phone' | 'password'>,
  ) => void;
  handleSetVoivodeshipLead: (
    voivodeshipId: string,
    caregiverId: number | null,
  ) => void;
  handleSetVoivodeshipAssignments: (
    voivodeshipId: string,
    cooperativeIds: number[],
    areaIds: number[],
  ) => void;
}

export const AppDataContext = createContext<AppDataContextValue | null>(null);

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return ctx;
}
