import { useEffect, useState } from 'react';

import DashboardSection from '@/components/dashboard/DashboardSection';
import { getDashboardStats, type DashboardStats } from '@/services/dashboard';
import { fetchUnreadNotificationsTotal } from '@/services/notifications';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [nextStats, unread] = await Promise.all([
          getDashboardStats(),
          fetchUnreadNotificationsTotal().catch(() => 0),
        ]);
        if (cancelled) return;
        setStats(nextStats);
        setUnreadNotifications(unread);
        setError('');
      } catch {
        if (cancelled) return;
        setError('Nie udało się pobrać danych pulpitu.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <DashboardSection
      stats={stats}
      isLoading={isLoading}
      error={error}
      unreadNotifications={unreadNotifications}
    />
  );
}
