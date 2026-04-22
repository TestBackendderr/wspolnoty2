import { useEffect, useState } from 'react';

import DashboardSection from '@/components/dashboard/DashboardSection';
import { getDashboardStats, type DashboardStats } from '@/services/dashboard';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const nextStats = await getDashboardStats();
        if (cancelled) return;
        setStats(nextStats);
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

  return <DashboardSection stats={stats} isLoading={isLoading} error={error} />;
}
