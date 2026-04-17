import { useState } from 'react';
import { Outlet } from 'react-router-dom';

import { useAppData } from '@/app/providers/appDataContext';

import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function AppLayout() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { error } = useAppData();

  return (
    <div className="app-shell">
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      <section className="content-zone">
        <Topbar onToggleSidebar={() => setMobileSidebarOpen((prev) => !prev)} />

        {error ? <div className="email-warning">{error}</div> : null}

        <main className="page-content">
          <Outlet />
        </main>
      </section>
    </div>
  );
}
