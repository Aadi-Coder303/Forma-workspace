'use client';

import dynamic from 'next/dynamic';

const ProjectClient = dynamic(() => import('./ProjectClient'), {
  ssr: false,
  loading: () => <div className="text-center py-20 text-[#666]">Loading Project...</div>,
});

export default function ProjectPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white p-6 pb-20 font-mono">
      <ProjectClient />
    </main>
  );
}
