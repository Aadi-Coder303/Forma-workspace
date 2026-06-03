'use client';

import { useState, useEffect } from 'react';
import DashboardClient from './DashboardClient';

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <main className="h-screen flex overflow-hidden">
        <div className="flex-1 flex items-center justify-center text-muted font-body text-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
            <span>Initializing Workspace…</span>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="h-screen flex overflow-hidden">
      <DashboardClient />
    </main>
  );
}
