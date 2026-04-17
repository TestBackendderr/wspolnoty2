import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

import {
  createCooperative,
  deleteCooperative as deleteCooperativeApi,
  listAllCooperatives,
} from '@/services/cooperatives';
import { listAllUsers } from '@/services/users';
import type { AppDatabase, User } from '@/types/domain';
import {
  appDatabaseWithSyncedCaregivers,
  emptyAppDatabase,
} from '@/types/domain';
import type { AddEntryValues } from '@/components/common/AddEntryModal';

import { useAuth } from './authContext';
import { AppDataContext, type AppDataContextValue } from './appDataContext';

/** Pages that need the full cooperatives list loaded into global state. */
const PATHS_REQUIRING_FULL_COOPERATIVES = new Set<string>([
  '/dashboard',
  '/mapa',
  '/sales-plans',
  '/my-cooperatives',
  '/my-plan',
]);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { currentUser, authResolved, isCaregiver, updateCurrentUser } = useAuth();
  const location = useLocation();

  const [db, setDbInternal] = useState<AppDatabase>(emptyAppDatabase);
  const [error, setError] = useState('');

  const setDb = (
    update: AppDatabase | ((prev: AppDatabase) => AppDatabase),
  ) => {
    setDbInternal((prev) => {
      const next = typeof update === 'function' ? update(prev) : update;
      return appDatabaseWithSyncedCaregivers(next);
    });
  };

  const coopsSyncedRef = useRef(false);
  const coopsInFlightRef = useRef(false);

  useEffect(() => {
    if (!currentUser) {
      coopsSyncedRef.current = false;
      coopsInFlightRef.current = false;
      setDbInternal(emptyAppDatabase);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!authResolved || !currentUser) return;
    void (async () => {
      try {
        const users = await listAllUsers();
        setDb((prev) => ({
          ...prev,
          users: users.length > 0 ? users : prev.users,
        }));
      } catch {
        setError('Nie udalo sie pobrac danych z backendu.');
      }
    })();
  }, [authResolved, currentUser]);

  useEffect(() => {
    if (!authResolved || !currentUser) return;
    if (!PATHS_REQUIRING_FULL_COOPERATIVES.has(location.pathname)) return;
    if (coopsSyncedRef.current || coopsInFlightRef.current) return;

    coopsInFlightRef.current = true;
    let cancelled = false;
    void (async () => {
      try {
        const cooperatives = await listAllCooperatives();
        if (cancelled) return;
        coopsSyncedRef.current = true;
        setDb((prev) => ({ ...prev, cooperatives }));
        setError('');
      } catch {
        setError('Nie udalo sie pobrac spoldzielni.');
      } finally {
        coopsInFlightRef.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authResolved, currentUser, location.pathname]);

  const handleAddCooperative: AppDataContextValue['handleAddCooperative'] = async (
    values: AddEntryValues,
  ) => {
    const name = (values['coop-name'] ?? '').trim();
    if (!name) return;
    try {
      const created = await createCooperative({
        name,
        address: (values['coop-address'] ?? '').trim(),
        region: (values['coop-voivodeship'] ?? '').trim() || 'nieokreslone',
        ratedPower: Number(values['coop-planned-power'] ?? 0) || 0,
      });
      setDb((prev) => ({
        ...prev,
        cooperatives: [...prev.cooperatives, created],
      }));
      setError('');
    } catch {
      setError('Nie udalo sie dodac spoldzielni. Sprawdz uprawnienia i sesje.');
    }
  };

  const handleDeleteCooperative: AppDataContextValue['handleDeleteCooperative'] = (
    coopId,
  ) => {
    void (async () => {
      try {
        await deleteCooperativeApi(coopId);
        setDb((prev) => ({
          ...prev,
          cooperatives: prev.cooperatives.filter((coop) => coop.id !== coopId),
        }));
        setError('');
      } catch {
        setError('Nie udalo sie usunac spoldzielni. Sprawdz uprawnienia (ADMIN).');
      }
    })();
  };

  const handleUpdateMyProfile: AppDataContextValue['handleUpdateMyProfile'] = (
    payload: Pick<User, 'name' | 'email' | 'phone' | 'password'>,
  ) => {
    if (!currentUser) return;
    setDb((prev) => ({
      ...prev,
      users: prev.users.map((user) =>
        user.id === currentUser.id
          ? {
              ...user,
              name: payload.name.trim() || user.name,
              email: payload.email.trim() || user.email,
              phone: payload.phone?.trim() ?? user.phone ?? '',
              password: payload.password.trim() || user.password,
            }
          : user,
      ),
    }));
    updateCurrentUser((prev) => ({
      ...prev,
      name: payload.name.trim() || prev.name,
      email: payload.email.trim() || prev.email,
      phone: payload.phone?.trim() ?? prev.phone ?? '',
      password: payload.password.trim() || prev.password,
    }));
  };

  const handleSetVoivodeshipLead: AppDataContextValue['handleSetVoivodeshipLead'] = (
    voivodeshipId,
    caregiverId,
  ) => {
    setDb((prev) => {
      const existing = prev.voivodeshipLeads.find(
        (lead) => lead.voivodeshipId === voivodeshipId,
      );
      if (existing) {
        return {
          ...prev,
          voivodeshipLeads: prev.voivodeshipLeads.map((lead) =>
            lead.voivodeshipId === voivodeshipId ? { ...lead, caregiverId } : lead,
          ),
        };
      }
      return {
        ...prev,
        voivodeshipLeads: [
          ...prev.voivodeshipLeads,
          { voivodeshipId, caregiverId },
        ],
      };
    });
  };

  const handleSetVoivodeshipAssignments: AppDataContextValue['handleSetVoivodeshipAssignments'] = (
    voivodeshipId,
    cooperativeIds,
    areaIds,
  ) => {
    setDb((prev) => {
      const existing = prev.voivodeshipAssignments.find(
        (item) => item.voivodeshipId === voivodeshipId,
      );
      if (existing) {
        return {
          ...prev,
          voivodeshipAssignments: prev.voivodeshipAssignments.map((item) =>
            item.voivodeshipId === voivodeshipId
              ? { ...item, cooperativeIds, areaIds }
              : item,
          ),
        };
      }
      return {
        ...prev,
        voivodeshipAssignments: [
          ...prev.voivodeshipAssignments,
          { voivodeshipId, cooperativeIds, areaIds },
        ],
      };
    });
  };

  const visibleCooperatives = useMemo(() => {
    if (!currentUser || !isCaregiver) return db.cooperatives;
    const assigned = db.cooperatives.filter(
      (coop) => coop.caregiverId === currentUser.id,
    );
    return assigned.length > 0 ? assigned : db.cooperatives;
  }, [db.cooperatives, currentUser, isCaregiver]);

  const value: AppDataContextValue = {
    db,
    visibleCooperatives,
    error,
    clearError: () => setError(''),
    handleAddCooperative,
    handleDeleteCooperative,
    handleUpdateMyProfile,
    handleSetVoivodeshipLead,
    handleSetVoivodeshipAssignments,
  };

  return (
    <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
  );
}
