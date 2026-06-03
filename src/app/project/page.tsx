'use client';

import { useState, useEffect, Suspense } from 'react';
import ProjectClient from './ProjectClient';

export default function ProjectPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] text-white p-6 pb-20 font-mono">
        <div className="text-center py-20 text-[#666]">Loading Project...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white p-6 pb-20 font-mono">
      <Suspense fallback={<div className="text-center py-20 text-[#666]">Loading Project...</div>}>
        <ProjectClient />
      </Suspense>
    </main>
  );
}
