import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

import {
  cooperativeMemberFormToPayload,
  createCooperative,
  deleteCooperative as deleteCooperativeApi,
  getCooperativeById,
  listAllCooperatives,
  type CooperativeMemberFormInput,
} from '@/services/cooperatives';
import { listAllUsers, mapRoleToApi, updateUser } from '@/services/users';
import type { AppDatabase, User } from '@/types/domain';
import {
  appDatabaseWithSyncedCaregivers,
  emptyAppDatabase,
} from '@/types/domain';
import type { AddEntryValues } from '@/components/common/AddEntryModal';

import { useAuth } from './authContext';
import { AppDataContext, type AppDataContextValue } from './appDataContext';

function splitFullName(fullName: string): { name: string; surname: string } {
  const normalized = fullName.trim().replace(/\s+/g, ' ');
  if (!normalized) return { name: '', surname: '' };
  const [name, ...rest] = normalized.split(' ');
  return { name, surname: rest.join(' ') || 'Brak' };
}

/** Pages that need the full cooperatives list loaded into global state. */
const PATHS_REQUIRING_FULL_COOPERATIVES = new Set<string>([
  '/my-cooperatives',
  '/my-plan',
]);

/** Routes that read `db.caregivers` from AppData (synced from full `users`). */
const PATHS_REQUIRING_FULL_USERS = new Set<string>(['/my-plan']);

function normalizePathname(pathname: string): string {
  if (!pathname) return '/';
  return pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { currentUser, authResolved, isCaregiver, updateCurrentUser } = useAuth();
  const location = useLocation();

  const [db, setDbInternal] = useState<AppDatabase>(emptyAppDatabase);
  const [error, setError] = useState('');
  const [usersRetryTick, setUsersRetryTick] = useState(0);
  const [coopsRetryTick, setCoopsRetryTick] = useState(0);

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
  const usersSyncedRef = useRef(false);
  const usersInFlightRef = useRef(false);
  const normalizedPathname = normalizePathname(location.pathname);
  const needsFullUsers = PATHS_REQUIRING_FULL_USERS.has(normalizedPathname);
  const needsFullCooperatives = PATHS_REQUIRING_FULL_COOPERATIVES.has(normalizedPathname);

  useEffect(() => {
    if (!currentUser) {
      coopsSyncedRef.current = false;
      coopsInFlightRef.current = false;
      usersSyncedRef.current = false;
      usersInFlightRef.current = false;
      setDbInternal(emptyAppDatabase);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!authResolved || !currentUser) return;
    if (!needsFullUsers) return;
    if (usersSyncedRef.current || usersInFlightRef.current) return;

    usersInFlightRef.current = true;
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    void (async () => {
      try {
        const users = await listAllUsers();
        if (cancelled) return;
        usersSyncedRef.current = true;
        setDb((prev) => ({
          ...prev,
          users: users.length > 0 ? users : prev.users,
        }));
      } catch {
        if (cancelled) return;
        retryTimer = setTimeout(() => {
          setUsersRetryTick((v) => v + 1);
        }, 2500);
      } finally {
        usersInFlightRef.current = false;
      }
    })();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [authResolved, currentUser, needsFullUsers, usersRetryTick]);

  useEffect(() => {
    if (!authResolved || !currentUser) return;
    if (!needsFullCooperatives) return;
    if (coopsSyncedRef.current || coopsInFlightRef.current) return;

    coopsInFlightRef.current = true;
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    void (async () => {
      try {
        const cooperatives = await listAllCooperatives();
        if (cancelled) return;
        coopsSyncedRef.current = true;
        setDb((prev) => ({ ...prev, cooperatives }));
      } catch {
        if (cancelled) return;
        retryTimer = setTimeout(() => {
          setCoopsRetryTick((v) => v + 1);
        }, 2500);
      } finally {
        coopsInFlightRef.current = false;
      }
    })();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [authResolved, currentUser, needsFullCooperatives, coopsRetryTick]);

  const handleAddCooperative: AppDataContextValue['handleAddCooperative'] = async (
    values: AddEntryValues,
  ) => {
    const name = (values['coop-name'] ?? '').trim();
    if (!name) return;
    try {
      const boardName = (values['coop-board-name'] ?? '').trim();
      const boardEmail = (values['coop-board-email'] ?? '').trim();
      const boardPhone = (values['coop-board-phone'] ?? '').trim();
      const supervisorId = Number(values['coop-caregiver-id'] ?? 0);
      if (!boardName || !boardEmail || !boardPhone || !supervisorId) return;

      const areaIds = String(values['coop-area-ids'] ?? '')
        .split(',')
        .map((id) => Number(id.trim()))
        .filter((id) => Number.isInteger(id) && id > 0);
      const membersRaw = String(values['coop-members'] ?? '[]');
      const parsedMembers = JSON.parse(membersRaw) as Array<CooperativeMemberFormInput & { id?: number }>;
      const memberDtos = parsedMembers
        .filter((m) => m.fullName?.trim() && m.ppeAddress?.trim())
        .map((m) => cooperativeMemberFormToPayload(m));
      const registrationDate = String(values['coop-registration-date'] ?? '').trim();

      const installedPowerVal = Number(values['coop-installed-power'] ?? 0);

      const created = await createCooperative({
        name,
        address: (values['coop-address'] ?? '').trim(),
        region: (values['coop-voivodeship'] ?? '').trim() || 'nieokreślone',
        ratedPower: Number(values['coop-planned-power'] ?? 0) || 0,
        ...(installedPowerVal > 0 ? { installedPower: installedPowerVal } : {}),
        boardName,
        boardEmail,
        boardPhone,
        supervisorId,
        registrationDate,
        ...(areaIds.length > 0 ? { areaIds } : {}),
        ...(memberDtos.length > 0 ? { members: memberDtos } : {}),
      });
      setDb((prev) => ({
        ...prev,
        cooperatives: [...prev.cooperatives, created],
      }));
      setError('');
    } catch {
      setError('Nie udało się dodać spółdzielni. Sprawdź uprawnienia i sesję.');
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
        setError('Nie udało się usunąć spółdzielni. Sprawdź uprawnienia (ADMIN).');
      }
    })();
  };

  const refreshCooperativeById: AppDataContextValue['refreshCooperativeById'] = async (
    id,
  ) => {
    setError('');
    try {
      const coop = await getCooperativeById(id);
      setDb((prev) => ({
        ...prev,
        cooperatives: prev.cooperatives.some((c) => c.id === coop.id)
          ? prev.cooperatives.map((c) => (c.id === coop.id ? coop : c))
          : [...prev.cooperatives, coop],
      }));
    } catch {
      setError('Nie udało się odświeżyć danych spółdzielni.');
      throw new Error('REFRESH_COOP_FAILED');
    }
  };

  const handleUpdateMyProfile: AppDataContextValue['handleUpdateMyProfile'] = async (
    payload: Pick<User, 'name' | 'email' | 'phone' | 'password'> & { color: string },
  ) => {
    if (!currentUser) return;
    const split = splitFullName(payload.name.trim() || currentUser.name);
    const colorHex = payload.color.trim() || currentUser.color || '#10b981';

    setError('');
    try {
      const updated = await updateUser(currentUser.id, {
        name: split.name || payload.name.trim() || currentUser.name,
        surname: split.surname,
        email: payload.email.trim() || currentUser.email,
        phoneNumber: payload.phone?.trim() ?? '',
        role: mapRoleToApi(currentUser.role),
        color: colorHex,
        ...(payload.password.trim() ? { password: payload.password.trim() } : {}),
      });

      updateCurrentUser((prev) =>
        prev
          ? {
              ...prev,
              name: updated.name,
              email: updated.email,
              phone: updated.phone,
              color: updated.color,
              password: payload.password.trim() ? payload.password.trim() : prev.password,
            }
          : prev,
      );
      setDb((prev) => ({
        ...prev,
        users: prev.users.map((user) =>
          user.id === currentUser.id
            ? {
                ...user,
                name: updated.name,
                email: updated.email,
                phone: updated.phone,
                color: updated.color,
                password: payload.password.trim() ? payload.password.trim() : user.password,
              }
            : user,
        ),
      }));
    } catch {
      setError('Nie udało się zapisać profilu. Sprawdź dane i sesję.');
      throw new Error('PROFILE_SAVE_FAILED');
    }
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
    return db.cooperatives.filter(
      (coop) => coop.caregiverId === currentUser.id,
    );
  }, [db.cooperatives, currentUser, isCaregiver]);

  const value: AppDataContextValue = {
    db,
    visibleCooperatives,
    error,
    clearError: () => setError(''),
    handleAddCooperative,
    handleDeleteCooperative,
    refreshCooperativeById,
    handleUpdateMyProfile,
    handleSetVoivodeshipLead,
    handleSetVoivodeshipAssignments,
  };

  return (
    <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
  );
}
